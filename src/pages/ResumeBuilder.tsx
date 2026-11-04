import { useState, useMemo, useEffect, useRef } from "react";
import { AppLayout } from "@/components/AppLayout";
import { ExpertTip } from "@/components/ExpertTip";
import { ScoreGauge } from "@/components/ScoreGauge";
import { useLanguage } from "@/i18n/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FileText,
  Download,
  Plus,
  Trash2,
  Briefcase,
  GraduationCap,
  User,
  Sparkles,
  Printer,
  CheckCircle2,
  RotateCcw,
  Upload,
  Loader2,
  Wand2,
  AlertCircle,
  X,
  Columns,
  Eye,
  Edit3,
  ClipboardPaste,
} from "lucide-react";
import { ACTION_VERBS_LIST, extractAndAnalyzePDF } from "@/lib/atsEngine";
import {
  parseRawResumeToBuilderDraft,
  autoCompleteExperienceSTAR,
} from "@/lib/careerCopilotEngine";
import { LAST_PARSED_RESUME_KEY } from "@/pages/ATSParser";
import {
  LAST_MATCH_CONTEXT_KEY,
  type LastMatchContext,
} from "@/pages/CareerCopilot";

export interface PersonalInfo {
  name: string;
  email: string;
  phone: string;
  linkedin: string;
  summary: string;
  skills: string;
}

export interface Experience {
  id: string;
  company: string;
  role: string;
  period: string;
  situation: string;
  task: string;
  action: string;
  result: string;
}

export interface Education {
  id: string;
  institution: string;
  degree: string;
  period: string;
}

export interface ResumeDraftData {
  personalInfo: PersonalInfo;
  experiences: Experience[];
  educations: Education[];
}

export const RESUME_BUILDER_STORAGE_KEY = "talenthub_resume_builder_draft_v2";

function loadInitialBuilderDraft(): ResumeDraftData | null {
  try {
    localStorage.removeItem("talenthub_resume_builder_draft_v1");
    sessionStorage.removeItem("talenthub_last_parsed_resume");

    const saved = localStorage.getItem(RESUME_BUILDER_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as ResumeDraftData;
      if (parsed && parsed.personalInfo) return parsed;
    }

    const sessionRaw = sessionStorage.getItem(LAST_PARSED_RESUME_KEY);
    if (sessionRaw && sessionRaw.trim()) {
      return parseRawResumeToBuilderDraft(sessionRaw);
    }
  } catch {
    // ignore storage errors
  }
  return null;
}

function generateId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

const EMPTY_PERSONAL_INFO: PersonalInfo = {
  name: "",
  email: "",
  phone: "",
  linkedin: "",
  summary: "",
  skills: "",
};

const METRIC_REGEX =
  /(?:\b\d+(?:[.,]\d+)?\s*(?:%|por\s*cento|percent|x|vezes|dias|horas|minutos|meses|usu[áa]rios|clientes|projetos|ms|s|k|mil|milh[õo]es)\b|(?:R\$|US\$|\$|€)\s*\d+)/i;

export function calculateBuilderScores(
  personalInfo: PersonalInfo,
  experiences: Experience[],
  educations: Education[]
) {
  const { name, email, phone, linkedin, summary, skills } = personalInfo;

  // 1. Keywords & Skills Density (0 - 30 pts)
  const skillsList = skills
    .split(/[,;\n|]+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 2);

  const allText = [
    name,
    summary,
    skills,
    ...experiences.flatMap((e) => [
      e.role,
      e.situation,
      e.task,
      e.action,
      e.result,
    ]),
  ]
    .join(" ")
    .toLowerCase();

  const uniqueMeaningfulWords = new Set(
    allText.split(/\s+/).filter((w) => w.length > 3)
  );

  let keywordsScore = Math.min(18, skillsList.length * 3);
  keywordsScore += Math.min(12, Math.floor(uniqueMeaningfulWords.size / 6));
  keywordsScore = Math.min(30, keywordsScore);

  // 2. Action Verbs & Quantified Impact (0 - 30 pts)
  const matchedVerbs = ACTION_VERBS_LIST.filter((v) => {
    const regex = new RegExp(`\\b${v}\\b`, "i");
    return regex.test(allText);
  });

  const quantifiedExperiences = experiences.filter((e) =>
    METRIC_REGEX.test(`${e.action} ${e.result}`)
  );

  let actionVerbsScore = Math.min(18, matchedVerbs.length * 4.5);
  actionVerbsScore += Math.min(12, quantifiedExperiences.length * 6);
  actionVerbsScore = Math.min(30, Math.round(actionVerbsScore));

  // 3. Formatting & Structural Completeness (0 - 40 pts)
  let formattingScore = 0;
  if (name.trim().length > 2) formattingScore += 5;
  if (/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(email))
    formattingScore += 5;
  if (phone.trim().length >= 8) formattingScore += 4;
  if (linkedin.trim().length > 5) formattingScore += 4;
  if (summary.trim().length >= 40) formattingScore += 6;
  if (skillsList.length >= 3) formattingScore += 4;
  if (
    experiences.some(
      (e) =>
        e.company.trim() &&
        e.role.trim() &&
        (e.action.trim() || e.result.trim())
    )
  ) {
    formattingScore += 7;
  }
  if (educations.some((ed) => ed.institution.trim() && ed.degree.trim())) {
    formattingScore += 5;
  }
  formattingScore = Math.min(40, formattingScore);

  const totalScore = Math.min(
    100,
    keywordsScore + actionVerbsScore + formattingScore
  );

  return {
    totalScore,
    keywordsScore,
    actionVerbsScore,
    formattingScore,
  };
}

export default function ResumeBuilder() {
  const { t, locale } = useLanguage();

  const [personalInfo, setPersonalInfo] = useState<PersonalInfo>(() => {
    const initial = loadInitialBuilderDraft();
    return initial?.personalInfo || EMPTY_PERSONAL_INFO;
  });

  const [experiences, setExperiences] = useState<Experience[]>(() => {
    const initial = loadInitialBuilderDraft();
    if (initial && Array.isArray(initial.experiences) && initial.experiences.length > 0) {
      return initial.experiences;
    }
    return [
      {
        id: generateId(),
        company: "",
        role: "",
        period: "",
        situation: "",
        task: "",
        action: "",
        result: "",
      },
    ];
  });

  const [educations, setEducations] = useState<Education[]>(() => {
    const initial = loadInitialBuilderDraft();
    if (initial && Array.isArray(initial.educations) && initial.educations.length > 0) {
      return initial.educations;
    }
    return [{ id: generateId(), institution: "", degree: "", period: "" }];
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importSuccessBanner, setImportSuccessBanner] = useState(false);
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pasteRawInput, setPasteRawInput] = useState("");
  const [newSkillInput, setNewSkillInput] = useState("");
  const [bulletStyle, setBulletStyle] = useState<"executive" | "star_labeled">(
    "executive"
  );
  const [activeTab, setActiveTab] = useState<"edit" | "split" | "preview">(
    "edit"
  );

  const [sessionResumeText, setSessionResumeText] = useState<string | null>(
    () => {
      try {
        return sessionStorage.getItem(LAST_PARSED_RESUME_KEY);
      } catch {
        return null;
      }
    }
  );

  const missingJobKeywords = useMemo<string[]>(() => {
    try {
      const raw = sessionStorage.getItem(LAST_MATCH_CONTEXT_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as LastMatchContext;
      return parsed.missingSkills || [];
    } catch {
      return [];
    }
  }, []);

  // Auto-save to localStorage
  useEffect(() => {
    const payload: ResumeDraftData = {
      personalInfo,
      experiences,
      educations,
    };
    localStorage.setItem(RESUME_BUILDER_STORAGE_KEY, JSON.stringify(payload));
  }, [personalInfo, experiences, educations]);

  const applyRawResumeTextToBuilder = (rawText: string) => {
    const draft = parseRawResumeToBuilderDraft(rawText);
    setPersonalInfo(draft.personalInfo);
    setExperiences(draft.experiences);
    setEducations(draft.educations);
    setImportSuccessBanner(true);
    setShowPasteModal(false);
    setPasteRawInput("");
    setTimeout(() => setImportSuccessBanner(false), 6000);
  };

  const handleDirectFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsImporting(true);
    try {
      let extractedText = "";
      if (
        file.type === "application/pdf" ||
        file.name.toLowerCase().endsWith(".pdf")
      ) {
        const pdfResult = await extractAndAnalyzePDF(file);
        extractedText = pdfResult.text;
      } else {
        extractedText = await file.text();
      }
      if (extractedText.trim()) {
        sessionStorage.setItem(LAST_PARSED_RESUME_KEY, extractedText);
        setSessionResumeText(extractedText);
        applyRawResumeTextToBuilder(extractedText);
      }
    } catch (err) {
      console.error("Failed to import resume into builder:", err);
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Show session sync banner if session has a resume AND either the builder is empty OR the email in session differs from current builder email
  const shouldShowSessionBanner = useMemo(() => {
    if (!sessionResumeText) return false;
    const isEmpty =
      !personalInfo.name.trim() &&
      !personalInfo.email.trim() &&
      !experiences.some((e) => e.company.trim() || e.role.trim());
    if (isEmpty) return true;
    const sessionEmailMatch = sessionResumeText.match(
      /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/
    );
    if (
      sessionEmailMatch &&
      personalInfo.email.trim() &&
      sessionEmailMatch[0].toLowerCase() !==
        personalInfo.email.trim().toLowerCase()
    ) {
      return true;
    }
    return false;
  }, [sessionResumeText, personalInfo, experiences]);

  const handlePersonalInfoChange = (
    field: keyof PersonalInfo,
    value: string
  ) => {
    setPersonalInfo((prev) => ({ ...prev, [field]: value }));
  };

  const parsedSkillsList = useMemo(() => {
    return personalInfo.skills
      .split(/[,;\n|]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }, [personalInfo.skills]);

  const handleAddSkillTag = (skillToAdd: string) => {
    const clean = skillToAdd.trim();
    if (!clean) return;
    const exists = parsedSkillsList.some(
      (s) => s.toLowerCase() === clean.toLowerCase()
    );
    if (!exists) {
      const updated = [...parsedSkillsList, clean].join(", ");
      handlePersonalInfoChange("skills", updated);
    }
    setNewSkillInput("");
  };

  const handleRemoveSkillTag = (skillToRemove: string) => {
    const updated = parsedSkillsList
      .filter((s) => s.toLowerCase() !== skillToRemove.toLowerCase())
      .join(", ");
    handlePersonalInfoChange("skills", updated);
  };

  const handleGenerateSmartSummary = () => {
    const primaryRole =
      experiences[0]?.role.trim() ||
      (locale === "pt"
        ? "Especialista em Tecnologia"
        : "Technology Specialist");
    const topSkills = parsedSkillsList.slice(0, 5).join(", ");
    const topResult = experiences.find((e) => e.result.trim())?.result.trim();

    if (locale === "pt") {
      const generated = `${primaryRole} com sólida experiência prática no desenvolvimento e evolução de projetos utilizando ${
        topSkills || "tecnologias modernas e boas práticas de engenharia"
      }. Foco em alta performance, escalabilidade e entregas orientadas a indicadores de negócio${
        topResult
          ? `, incluindo resultados recentes como: ${
              topResult.charAt(0).toLowerCase() + topResult.slice(1)
            }`
          : "."
      }`;
      handlePersonalInfoChange("summary", generated);
    } else {
      const generated = `${primaryRole} with hands-on experience designing and scaling solutions using ${
        topSkills || "modern engineering practices"
      }. Focused on high performance, clean architecture, and measurable business outcomes${
        topResult
          ? `, including recent achievements such as: ${
              topResult.charAt(0).toLowerCase() + topResult.slice(1)
            }`
          : "."
      }`;
      handlePersonalInfoChange("summary", generated);
    }
  };

  const addExperience = () => {
    setExperiences((prev) => [
      ...prev,
      {
        id: generateId(),
        company: "",
        role: "",
        period: "",
        situation: "",
        task: "",
        action: "",
        result: "",
      },
    ]);
  };

  const removeExperience = (id: string) => {
    if (experiences.length > 1) {
      setExperiences((prev) => prev.filter((e) => e.id !== id));
    }
  };

  const updateExperience = (
    id: string,
    field: keyof Experience,
    value: string
  ) => {
    setExperiences((prev) =>
      prev.map((e) => (e.id === id ? { ...e, [field]: value } : e))
    );
  };

  const handleAutoCompleteSTAR = (expId: string) => {
    setExperiences((prev) =>
      prev.map((e) =>
        e.id === expId
          ? autoCompleteExperienceSTAR(e, personalInfo.skills, locale)
          : e
      )
    );
  };

  const addEducation = () => {
    setEducations((prev) => [
      ...prev,
      { id: generateId(), institution: "", degree: "", period: "" },
    ]);
  };

  const removeEducation = (id: string) => {
    if (educations.length > 1) {
      setEducations((prev) => prev.filter((e) => e.id !== id));
    }
  };

  const updateEducation = (
    id: string,
    field: keyof Education,
    value: string
  ) => {
    setEducations((prev) =>
      prev.map((e) => (e.id === id ? { ...e, [field]: value } : e))
    );
  };

  const handleLoadSample = () => {
    if (locale === "pt") {
      setPersonalInfo({
        name: "Carla Mendes",
        email: "carla.mendes@email.com",
        phone: "(11) 98765-4321",
        linkedin: "linkedin.com/in/carlamendes",
        summary:
          "Engenheira de Software Full Stack com 5 anos de experiência projetando aplicações web escaláveis, microsserviços em Node.js e interfaces de alta performance com React e TypeScript.",
        skills:
          "TypeScript, JavaScript, React, Next.js, Node.js, PostgreSQL, Redis, Docker, Kubernetes, AWS, CI/CD, Git, Scrum",
      });
      setExperiences([
        {
          id: generateId(),
          company: "TechCorp Solutions",
          role: "Engenheira de Software Sênior",
          period: "Jan 2023 - Atual",
          situation:
            "O sistema legado apresentava lentidão em horários de pico com 250 mil usuários simultâneos.",
          task: "Reestruturar a arquitetura crítica de pagamentos e reduzir a latência média da API.",
          action:
            "Liderei a migração para microsserviços em Node.js e TypeScript, otimizei queries no PostgreSQL e implementei cache distribuído com Redis.",
          result:
            "Reduzi a latência da API em 42%, aumentei a disponibilidade para 99.98% e diminuí o tempo de deploy em 80%.",
        },
      ]);
      setEducations([
        {
          id: generateId(),
          institution: "Universidade de São Paulo (USP)",
          degree: "Bacharelado em Ciência da Computação",
          period: "2016 - 2020",
        },
      ]);
    } else {
      setPersonalInfo({
        name: "Carla Mendes",
        email: "carla.mendes@email.com",
        phone: "+1 (555) 234-5678",
        linkedin: "linkedin.com/in/carlamendes",
        summary:
          "Full Stack Software Engineer with 5 years of experience architecting scalable web applications, Node.js microservices, and high-performance interfaces using React and TypeScript.",
        skills:
          "TypeScript, JavaScript, React, Next.js, Node.js, PostgreSQL, Redis, Docker, Kubernetes, AWS, CI/CD, Git, Agile Scrum",
      });
      setExperiences([
        {
          id: generateId(),
          company: "TechCorp Solutions",
          role: "Senior Software Engineer",
          period: "Jan 2023 - Present",
          situation:
            "Legacy monolithic platform suffered high latency during peak traffic with 250k+ active users.",
          task: "Re-architect the core checkout service and reduce average API response times.",
          action:
            "Led the migration to Node.js and TypeScript microservices, optimized PostgreSQL queries, and implemented Redis caching.",
          result:
            "Reduced API latency by 42%, improved uptime to 99.98%, and cut CI/CD deployment time by 80%.",
        },
      ]);
      setEducations([
        {
          id: generateId(),
          institution: "University of Sao Paulo (USP)",
          degree: "B.S. in Computer Science",
          period: "2016 - 2020",
        },
      ]);
    }
  };

  const handleClear = () => {
    setPersonalInfo(EMPTY_PERSONAL_INFO);
    setExperiences([
      {
        id: generateId(),
        company: "",
        role: "",
        period: "",
        situation: "",
        task: "",
        action: "",
        result: "",
      },
    ]);
    setEducations([
      { id: generateId(), institution: "", degree: "", period: "" },
    ]);
    localStorage.removeItem(RESUME_BUILDER_STORAGE_KEY);
  };

  const scores = useMemo(
    () => calculateBuilderScores(personalInfo, experiences, educations),
    [personalInfo, experiences, educations]
  );

  // Live Checklist to guide the user to 100/100
  const checklistItems = useMemo(() => {
    const hasContact =
      personalInfo.name.trim().length > 2 &&
      personalInfo.email.includes("@") &&
      personalInfo.phone.trim().length >= 8;
    const hasLinkedin = personalInfo.linkedin.trim().length > 5;
    const hasSummary = personalInfo.summary.trim().length >= 40;
    const hasEnoughSkills = parsedSkillsList.length >= 6;
    const hasCompleteSTAR = experiences.some(
      (e) =>
        e.company.trim() &&
        e.role.trim() &&
        e.action.trim() &&
        e.result.trim()
    );
    const hasQuantifiedMetric = experiences.some((e) =>
      METRIC_REGEX.test(`${e.action} ${e.result}`)
    );

    return [
      {
        done: hasContact,
        labelPt: "Nome, E-mail e Telefone preenchidos",
        labelEn: "Name, Email & Phone completed",
      },
      {
        done: hasLinkedin,
        labelPt: "Link do LinkedIn incluído",
        labelEn: "LinkedIn URL included",
      },
      {
        done: hasSummary,
        labelPt: "Resumo Profissional (+40 caracteres)",
        labelEn: "Professional Summary (+40 chars)",
      },
      {
        done: hasEnoughSkills,
        labelPt: `6+ Habilidades Técnicas (${parsedSkillsList.length}/6)`,
        labelEn: `6+ Technical Skills (${parsedSkillsList.length}/6)`,
      },
      {
        done: hasCompleteSTAR,
        labelPt: "Experiência com Ação e Resultado STAR",
        labelEn: "Experience with STAR Action & Result",
      },
      {
        done: hasQuantifiedMetric,
        labelPt: "Métrica numérica (%, R$, mil, x) no Resultado",
        labelEn: "Quantified metric (%, $, k, x) in Result",
      },
    ];
  }, [personalInfo, parsedSkillsList, experiences]);

  // Helper to format an Experience's bullets in either Executive or STAR-Labeled mode
  const getExperienceBullets = (e: Experience) => {
    if (bulletStyle === "star_labeled") {
      const items: { label: string; text: string }[] = [];
      if (e.situation.trim())
        items.push({ label: t("export.situation"), text: e.situation.trim() });
      if (e.task.trim())
        items.push({ label: t("export.task"), text: e.task.trim() });
      if (e.action.trim())
        items.push({ label: t("export.action"), text: e.action.trim() });
      if (e.result.trim())
        items.push({ label: t("export.result"), text: e.result.trim() });
      return items;
    }

    // Executive natural bullets (preferred by recruiters & Harvard template)
    const items: { label: string; text: string }[] = [];
    if (e.situation.trim() && e.task.trim()) {
      const sit = e.situation.trim().replace(/\.$/, "");
      const tsk = e.task.trim();
      items.push({ label: "", text: `${sit}. ${tsk}` });
    } else if (e.situation.trim()) {
      items.push({ label: "", text: e.situation.trim() });
    } else if (e.task.trim()) {
      items.push({ label: "", text: e.task.trim() });
    }

    if (e.action.trim()) {
      items.push({ label: "", text: e.action.trim() });
    }
    if (e.result.trim()) {
      items.push({ label: "", text: e.result.trim() });
    }
    return items;
  };

  const handleExportTxt = () => {
    const { name, email, phone, linkedin, summary, skills } = personalInfo;
    let text = "";
    text += `${name}\n${email} | ${phone}${linkedin ? ` | ${linkedin}` : ""}\n\n`;
    text += `${t("export.summary")}\n${summary}\n\n`;
    text += `${t("export.skills")}\n${skills}\n\n`;
    text += `${t("export.experience")}\n`;
    experiences.forEach((e) => {
      text += `${e.role} — ${e.company} (${e.period})\n`;
      const bullets = getExperienceBullets(e);
      bullets.forEach((b) => {
        text += `• ${b.label ? `${b.label}: ` : ""}${b.text}\n`;
      });
      text += "\n";
    });
    text += `${t("export.education")}\n`;
    educations.forEach((e) => {
      text += `${e.degree} — ${e.institution} (${e.period})\n`;
    });
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `resume-${name.replace(/\s+/g, "-").toLowerCase() || "optimized"}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPdf = () => {
    const { name, email, phone, linkedin, summary, skills } = personalInfo;
    const contactLine = [email, phone, linkedin].filter(Boolean).join("  |  ");

    const expHtml = experiences
      .filter((e) => e.company || e.role || e.action || e.result)
      .map((e) => {
        const bullets = getExperienceBullets(e);
        return `
        <div class="item">
          <div class="item-header">
            <strong>${e.role || "Cargo"} — ${e.company || "Empresa"}</strong>
            <span>${e.period || ""}</span>
          </div>
          <ul>
            ${bullets
              .map(
                (b) =>
                  `<li>${b.label ? `<strong>${b.label}:</strong> ` : ""}${b.text}</li>`
              )
              .join("")}
          </ul>
        </div>`;
      })
      .join("");

    const eduHtml = educations
      .filter((ed) => ed.institution || ed.degree)
      .map(
        (ed) => `
        <div class="item-header" style="margin-bottom: 6px;">
          <div><strong>${ed.degree}</strong> — ${ed.institution}</div>
          <span>${ed.period}</span>
        </div>`
      )
      .join("");

    const printWindow = window.open("", "_blank", "width=850,height=950");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="${locale}">
      <head>
        <meta charset="utf-8" />
        <title>${name || "Currículo"} - ATS Optimized</title>
        <style>
          @page { size: A4; margin: 16mm 18mm; }
          body {
            font-family: Arial, Helvetica, sans-serif;
            color: #111827;
            line-height: 1.45;
            font-size: 10.5pt;
            margin: 0;
            padding: 0;
          }
          h1 {
            font-size: 18pt;
            margin: 0 0 4px 0;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .contact {
            font-size: 9.5pt;
            color: #374151;
            margin-bottom: 14px;
          }
          h2 {
            font-size: 11pt;
            text-transform: uppercase;
            border-bottom: 1.5px solid #111827;
            padding-bottom: 3px;
            margin: 14px 0 8px 0;
            letter-spacing: 0.5px;
          }
          p { margin: 0 0 8px 0; }
          .item { margin-bottom: 10px; }
          .item-header {
            display: flex;
            justify-content: space-between;
            font-size: 10.5pt;
          }
          ul {
            margin: 4px 0 8px 18px;
            padding: 0;
          }
          li { margin-bottom: 3px; }
        </style>
      </head>
      <body>
        <h1>${name || "SEU NOME COMPLETO"}</h1>
        <div class="contact">${contactLine}</div>

        ${summary ? `<h2>${t("export.summary")}</h2><p>${summary}</p>` : ""}
        ${skills ? `<h2>${t("export.skills")}</h2><p>${skills}</p>` : ""}
        ${expHtml ? `<h2>${t("export.experience")}</h2>${expHtml}` : ""}
        ${eduHtml ? `<h2>${t("export.education")}</h2>${eduHtml}` : ""}

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 250);
          };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const renderLivePreviewDocument = () => (
    <div className="space-y-3">
      {/* Preview Style Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-secondary/40 px-3.5 py-2 rounded-lg border text-xs">
        <span className="font-medium text-muted-foreground">
          {locale === "pt"
            ? "Formato dos Tópicos no Documento:"
            : "Document Bullet Format:"}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setBulletStyle("executive")}
            className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
              bulletStyle === "executive"
                ? "bg-primary text-primary-foreground"
                : "hover:bg-background text-muted-foreground"
            }`}
          >
            {locale === "pt"
              ? "Bullets Executivos (Mercado)"
              : "Executive Bullets (Standard)"}
          </button>
          <button
            type="button"
            onClick={() => setBulletStyle("star_labeled")}
            className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
              bulletStyle === "star_labeled"
                ? "bg-primary text-primary-foreground"
                : "hover:bg-background text-muted-foreground"
            }`}
          >
            {locale === "pt" ? "STAR Rotulado" : "STAR Labeled"}
          </button>
        </div>
      </div>

      {/* A4 Sheet */}
      <div className="bg-white text-slate-900 rounded-xl p-7 sm:p-8 shadow-card border min-h-[680px] font-sans space-y-5">
        <div className="border-b-2 border-slate-900 pb-3">
          <h2 className="text-2xl font-bold uppercase tracking-wide">
            {personalInfo.name || "SEU NOME COMPLETO"}
          </h2>
          <p className="text-xs text-slate-600 mt-1">
            {[
              personalInfo.email || "seu.email@dominio.com",
              personalInfo.phone || "(00) 00000-0000",
              personalInfo.linkedin,
            ]
              .filter(Boolean)
              .join("  •  ")}
          </p>
        </div>

        {personalInfo.summary && (
          <div className="space-y-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-300 pb-0.5">
              {t("export.summary")}
            </h3>
            <p className="text-xs leading-relaxed text-slate-700">
              {personalInfo.summary}
            </p>
          </div>
        )}

        {personalInfo.skills && (
          <div className="space-y-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-300 pb-0.5">
              {t("export.skills")}
            </h3>
            <p className="text-xs leading-relaxed text-slate-700">
              {personalInfo.skills}
            </p>
          </div>
        )}

        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-300 pb-0.5">
            {t("export.experience")}
          </h3>
          {experiences.map((exp) => {
            const bullets = getExperienceBullets(exp);
            return (
              <div key={exp.id} className="space-y-1">
                <div className="flex justify-between text-xs font-bold text-slate-900">
                  <span>
                    {exp.role || "Cargo"} — {exp.company || "Empresa"}
                  </span>
                  <span className="text-slate-600 font-normal">
                    {exp.period}
                  </span>
                </div>
                <ul className="list-disc list-inside text-xs text-slate-700 space-y-1">
                  {bullets.map((b, i) => (
                    <li key={i} className="leading-relaxed">
                      {b.label ? <strong>{b.label}: </strong> : null}
                      {b.text}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-300 pb-0.5">
            {t("export.education")}
          </h3>
          {educations.map((edu) => (
            <div
              key={edu.id}
              className="flex justify-between text-xs text-slate-800"
            >
              <span>
                <strong>{edu.degree || "Curso"}</strong> —{" "}
                {edu.institution || "Instituição"}
              </span>
              <span className="text-slate-600">{edu.period}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
        {/* Top Header & Action Bar */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="space-y-1">
            <ExpertTip tip={t("rb.tip")}>
              <h1 className="text-2xl font-bold tracking-tight">
                {t("rb.title")}
              </h1>
            </ExpertTip>
            <div className="flex items-center gap-3">
              <p className="text-muted-foreground text-sm">
                {t("rb.subtitle")}
              </p>
              <span className="hidden md:inline-flex items-center text-xs text-success font-medium gap-1 bg-success/10 px-2 py-0.5 rounded-full">
                <CheckCircle2 className="h-3 w-3" />
                {t("rb.autoSaved")}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.txt,.text"
              className="hidden"
              onChange={handleDirectFileUpload}
            />
            <Button
              variant="default"
              size="sm"
              disabled={isImporting}
              onClick={() => fileInputRef.current?.click()}
            >
              {isImporting ? (
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              ) : (
                <Upload className="h-3.5 w-3.5 mr-1.5" />
              )}
              {isImporting ? t("rb.importing") : t("rb.importFile")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPasteModal((v) => !v)}
            >
              <ClipboardPaste className="h-3.5 w-3.5 mr-1.5 text-primary" />
              {locale === "pt" ? "Colar Currículo" : "Paste Resume"}
            </Button>
            <Button variant="secondary" size="sm" onClick={handleLoadSample}>
              <Sparkles className="h-3.5 w-3.5 mr-1.5 text-primary" />
              {t("rb.loadSample")}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="text-muted-foreground hover:text-destructive"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1" />
              {t("rb.clear")}
            </Button>
          </div>
        </div>

        {/* Collapsible Paste Raw Resume Box */}
        {showPasteModal && (
          <div className="bg-card border-2 border-primary/30 rounded-xl p-4 shadow-card space-y-3 animate-fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ClipboardPaste className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold">
                  {locale === "pt"
                    ? "Cole o texto do seu currículo (LinkedIn, Word ou PDF) para preencher tudo automaticamente"
                    : "Paste your resume text (LinkedIn, Word, or PDF) to auto-populate all STAR fields"}
                </h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPasteModal(false)}
                className="h-7 w-7 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <Textarea
              value={pasteRawInput}
              onChange={(e) => setPasteRawInput(e.target.value)}
              placeholder={
                locale === "pt"
                  ? "Cole aqui todo o conteúdo do seu currículo..."
                  : "Paste your full resume content here..."
              }
              className="min-h-[160px] text-sm"
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPasteModal(false)}
              >
                {locale === "pt" ? "Cancelar" : "Cancel"}
              </Button>
              <Button
                size="sm"
                disabled={!pasteRawInput.trim()}
                onClick={() => {
                  sessionStorage.setItem(LAST_PARSED_RESUME_KEY, pasteRawInput);
                  setSessionResumeText(pasteRawInput);
                  applyRawResumeTextToBuilder(pasteRawInput);
                }}
              >
                <Wand2 className="h-3.5 w-3.5 mr-1.5" />
                {locale === "pt"
                  ? "Extrair Dados & Estruturar em STAR"
                  : "Extract & Structure into STAR"}
              </Button>
            </div>
          </div>
        )}

        {/* Smart Banner: Resume found in session from ATS Parser */}
        {shouldShowSessionBanner && sessionResumeText && (
          <div className="bg-primary/5 border border-primary/25 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in">
            <div className="flex items-center gap-2.5">
              <Sparkles className="h-5 w-5 text-primary shrink-0" />
              <p className="text-sm font-medium text-foreground">
                {t("rb.sessionBanner")}
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => applyRawResumeTextToBuilder(sessionResumeText)}
              className="shrink-0"
            >
              <Upload className="h-3.5 w-3.5 mr-1.5" />
              {t("rb.sessionImportBtn")}
            </Button>
          </div>
        )}

        {/* Confirmation Banner when Resume is Imported and Classified into STAR */}
        {importSuccessBanner && (
          <div className="bg-success/10 border border-success/30 text-success rounded-xl p-3.5 flex items-center gap-2.5 text-sm font-medium animate-fade-in">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{t("rb.importSuccess")}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left/Main Column (8 cols) */}
          <div className="lg:col-span-8">
            <Tabs
              value={activeTab}
              onValueChange={(v) =>
                setActiveTab(v as "edit" | "split" | "preview")
              }
              className="space-y-4"
            >
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="edit" className="gap-1.5 text-xs sm:text-sm">
                  <Edit3 className="h-3.5 w-3.5" />
                  {t("rb.tab.edit")}
                </TabsTrigger>
                <TabsTrigger
                  value="split"
                  className="gap-1.5 text-xs sm:text-sm"
                >
                  <Columns className="h-3.5 w-3.5" />
                  {locale === "pt"
                    ? "Editor + Folha A4 (Lado a Lado)"
                    : "Editor + Live A4 (Split)"}
                </TabsTrigger>
                <TabsTrigger
                  value="preview"
                  className="gap-1.5 text-xs sm:text-sm"
                >
                  <Eye className="h-3.5 w-3.5" />
                  {t("rb.tab.preview")}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="preview">
                {renderLivePreviewDocument()}
              </TabsContent>

              <TabsContent
                value={activeTab === "split" ? "split" : "edit"}
                className="mt-0"
              >
                <div
                  className={
                    activeTab === "split"
                      ? "grid grid-cols-1 xl:grid-cols-2 gap-5 items-start"
                      : "space-y-6"
                  }
                >
                  {/* Form Column */}
                  <div className="space-y-5">
                    {/* Personal info */}
                    <div className="bg-card rounded-xl p-5 shadow-card border space-y-4">
                      <h2 className="font-semibold flex items-center gap-2">
                        <User className="h-4 w-4 text-primary" />{" "}
                        {t("rb.personalData")}
                      </h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label htmlFor="name">{t("rb.fullName")}</Label>
                          <Input
                            id="name"
                            value={personalInfo.name}
                            onChange={(e) =>
                              handlePersonalInfoChange("name", e.target.value)
                            }
                            placeholder="João Silva"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="email">{t("rb.email")}</Label>
                          <Input
                            id="email"
                            type="email"
                            value={personalInfo.email}
                            onChange={(e) =>
                              handlePersonalInfoChange("email", e.target.value)
                            }
                            placeholder="joao@email.com"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="phone">{t("rb.phone")}</Label>
                          <Input
                            id="phone"
                            value={personalInfo.phone}
                            onChange={(e) =>
                              handlePersonalInfoChange("phone", e.target.value)
                            }
                            placeholder="(11) 99999-9999"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="linkedin">{t("rb.linkedin")}</Label>
                          <Input
                            id="linkedin"
                            value={personalInfo.linkedin}
                            onChange={(e) =>
                              handlePersonalInfoChange(
                                "linkedin",
                                e.target.value
                              )
                            }
                            placeholder="linkedin.com/in/joaosilva"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Summary with Smart Generator */}
                    <div className="bg-card rounded-xl p-5 shadow-card border space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <ExpertTip tip={t("rb.summaryTip")}>
                          <h2 className="font-semibold">{t("rb.summary")}</h2>
                        </ExpertTip>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={handleGenerateSmartSummary}
                          className="h-7 text-xs px-2.5"
                        >
                          <Wand2 className="h-3.5 w-3.5 mr-1.5 text-primary" />
                          {locale === "pt"
                            ? "Gerar Resumo Otimizado"
                            : "Generate Smart Summary"}
                        </Button>
                      </div>
                      <Textarea
                        value={personalInfo.summary}
                        onChange={(e) =>
                          handlePersonalInfoChange("summary", e.target.value)
                        }
                        placeholder={t("rb.summaryPlaceholder")}
                        className="min-h-[95px] text-sm leading-relaxed"
                      />
                    </div>

                    {/* Interactive Skills Manager */}
                    <div className="bg-card rounded-xl p-5 shadow-card border space-y-3.5">
                      <div className="flex items-center justify-between">
                        <h2 className="font-semibold">{t("rb.skills")}</h2>
                        <span className="text-xs text-muted-foreground">
                          {parsedSkillsList.length}{" "}
                          {locale === "pt"
                            ? "skills mapeadas"
                            : "mapped skills"}
                        </span>
                      </div>

                      {/* Quick Tag Add Input */}
                      <div className="flex gap-2">
                        <Input
                          value={newSkillInput}
                          onChange={(e) => setNewSkillInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleAddSkillTag(newSkillInput);
                            }
                          }}
                          placeholder={
                            locale === "pt"
                              ? "Digite uma habilidade (ex: TypeScript, AWS, Scrum) e aperte Enter..."
                              : "Type a skill (e.g., TypeScript, AWS, Scrum) and press Enter..."
                          }
                          className="text-sm h-9"
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          className="h-9 px-3 shrink-0"
                          onClick={() => handleAddSkillTag(newSkillInput)}
                        >
                          <Plus className="h-3.5 w-3.5 mr-1" />
                          {locale === "pt" ? "Adicionar" : "Add"}
                        </Button>
                      </div>

                      {/* Visual Skill Chips */}
                      {parsedSkillsList.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 p-3 rounded-lg bg-secondary/40 border">
                          {parsedSkillsList.map((skill) => (
                            <Badge
                              key={skill}
                              variant="secondary"
                              className="text-xs py-0.5 pl-2.5 pr-1.5 flex items-center gap-1 bg-background border shadow-sm"
                            >
                              <span>{skill}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveSkillTag(skill)}
                                className="text-muted-foreground hover:text-destructive rounded-full p-0.5"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      )}

                      {/* Missing Keywords from Target Job */}
                      {missingJobKeywords.length > 0 && (
                        <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 space-y-2">
                          <p className="text-xs font-semibold text-primary flex items-center gap-1.5">
                            <Sparkles className="h-3.5 w-3.5" />
                            {locale === "pt"
                              ? "Sugestões da Vaga Analisada (Clique para incluir):"
                              : "Suggestions from Analyzed Job (Click to add):"}
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {missingJobKeywords
                              .filter(
                                (mk) =>
                                  !parsedSkillsList.some(
                                    (s) => s.toLowerCase() === mk.toLowerCase()
                                  )
                              )
                              .slice(0, 10)
                              .map((mk) => (
                                <button
                                  key={mk}
                                  type="button"
                                  onClick={() => handleAddSkillTag(mk)}
                                  className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 font-medium transition-colors"
                                >
                                  + {mk}
                                </button>
                              ))}
                          </div>
                        </div>
                      )}

                      <Textarea
                        value={personalInfo.skills}
                        onChange={(e) =>
                          handlePersonalInfoChange("skills", e.target.value)
                        }
                        placeholder={t("rb.skillsPlaceholder")}
                        className="min-h-[55px] text-xs text-muted-foreground"
                      />
                    </div>

                    {/* Experiences with Smart STAR Assistant */}
                    <div className="bg-card rounded-xl p-5 shadow-card border space-y-5">
                      <div className="flex items-center justify-between">
                        <ExpertTip tip={t("rb.experienceTip")}>
                          <h2 className="font-semibold flex items-center gap-2">
                            <Briefcase className="h-4 w-4 text-primary" />{" "}
                            {t("rb.experience")}
                          </h2>
                        </ExpertTip>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={addExperience}
                        >
                          <Plus className="h-3 w-3 mr-1" /> {t("rb.add")}
                        </Button>
                      </div>

                      {experiences.map((exp, idx) => {
                        const filledStarCount = [
                          exp.situation,
                          exp.task,
                          exp.action,
                          exp.result,
                        ].filter((s) => s.trim().length > 0).length;
                        const hasMetricInResult = METRIC_REGEX.test(
                          `${exp.action} ${exp.result}`
                        );

                        return (
                          <div
                            key={exp.id}
                            className="space-y-4 p-4 rounded-xl bg-secondary/20 border"
                          >
                            <div className="flex flex-wrap justify-between items-center gap-2">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold uppercase tracking-wider text-primary bg-primary/10 px-2.5 py-0.5 rounded-full">
                                  {t("rb.experienceN")} {idx + 1}
                                </span>
                                <Badge
                                  variant="outline"
                                  className={`text-[11px] ${
                                    filledStarCount === 4
                                      ? "bg-success/10 text-success border-success/30"
                                      : "bg-warning/10 text-warning border-warning/30"
                                  }`}
                                >
                                  STAR: {filledStarCount}/4
                                </Badge>
                              </div>

                              <div className="flex items-center gap-1.5">
                                <Button
                                  type="button"
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => handleAutoCompleteSTAR(exp.id)}
                                  className="h-7 text-xs px-2.5"
                                  title={
                                    locale === "pt"
                                      ? "Preenche ou redistribui automaticamente as 4 caixas STAR para esta experiência"
                                      : "Automatically fills or redistributes all 4 STAR boxes for this experience"
                                  }
                                >
                                  <Wand2 className="h-3.5 w-3.5 mr-1.5 text-primary" />
                                  {locale === "pt"
                                    ? "✨ Completar / Refinar STAR"
                                    : "✨ Auto-Complete STAR"}
                                </Button>
                                {experiences.length > 1 && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeExperience(exp.id)}
                                    className="text-muted-foreground hover:text-destructive h-7 w-7 p-0"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              <div className="space-y-1">
                                <Label className="text-[11px] text-muted-foreground">
                                  {t("rb.company")}
                                </Label>
                                <Input
                                  placeholder={t("rb.company")}
                                  value={exp.company}
                                  onChange={(e) =>
                                    updateExperience(
                                      exp.id,
                                      "company",
                                      e.target.value
                                    )
                                  }
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-[11px] text-muted-foreground">
                                  {t("rb.role")}
                                </Label>
                                <Input
                                  placeholder={t("rb.role")}
                                  value={exp.role}
                                  onChange={(e) =>
                                    updateExperience(
                                      exp.id,
                                      "role",
                                      e.target.value
                                    )
                                  }
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-[11px] text-muted-foreground">
                                  {t("rb.period")}
                                </Label>
                                <Input
                                  placeholder={t("rb.period")}
                                  value={exp.period}
                                  onChange={(e) =>
                                    updateExperience(
                                      exp.id,
                                      "period",
                                      e.target.value
                                    )
                                  }
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                              {/* S - Situation */}
                              <div className="space-y-1.5 bg-background p-3 rounded-lg border">
                                <div className="flex items-center justify-between">
                                  <Label className="text-xs font-semibold flex items-center gap-1.5">
                                    <span className="w-5 h-5 rounded bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center text-[11px] font-bold">
                                      S
                                    </span>
                                    {t("rb.situation")}
                                  </Label>
                                </div>
                                <Textarea
                                  value={exp.situation}
                                  onChange={(e) =>
                                    updateExperience(
                                      exp.id,
                                      "situation",
                                      e.target.value
                                    )
                                  }
                                  placeholder={t("rb.situationPlaceholder")}
                                  className="min-h-[68px] text-xs leading-relaxed"
                                />
                              </div>

                              {/* T - Task */}
                              <div className="space-y-1.5 bg-background p-3 rounded-lg border">
                                <div className="flex items-center justify-between">
                                  <Label className="text-xs font-semibold flex items-center gap-1.5">
                                    <span className="w-5 h-5 rounded bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center text-[11px] font-bold">
                                      T
                                    </span>
                                    {t("rb.task")}
                                  </Label>
                                </div>
                                <Textarea
                                  value={exp.task}
                                  onChange={(e) =>
                                    updateExperience(
                                      exp.id,
                                      "task",
                                      e.target.value
                                    )
                                  }
                                  placeholder={t("rb.taskPlaceholder")}
                                  className="min-h-[68px] text-xs leading-relaxed"
                                />
                              </div>

                              {/* A - Action */}
                              <div className="space-y-1.5 bg-background p-3 rounded-lg border">
                                <div className="flex items-center justify-between">
                                  <Label className="text-xs font-semibold flex items-center gap-1.5">
                                    <span className="w-5 h-5 rounded bg-primary/15 text-primary flex items-center justify-center text-[11px] font-bold">
                                      A
                                    </span>
                                    {t("rb.action")}
                                  </Label>
                                </div>
                                <Textarea
                                  value={exp.action}
                                  onChange={(e) =>
                                    updateExperience(
                                      exp.id,
                                      "action",
                                      e.target.value
                                    )
                                  }
                                  placeholder={t("rb.actionPlaceholder")}
                                  className="min-h-[68px] text-xs leading-relaxed"
                                />
                                <div className="flex flex-wrap items-center gap-1 pt-0.5">
                                  <span className="text-[10px] text-muted-foreground mr-1">
                                    {t("rb.starHelper.action")}
                                  </span>
                                  {(locale === "pt"
                                    ? [
                                        "Liderei",
                                        "Otimizei",
                                        "Implementei",
                                        "Automatizei",
                                        "Arquitetei",
                                      ]
                                    : [
                                        "Led",
                                        "Optimized",
                                        "Implemented",
                                        "Automated",
                                        "Architected",
                                      ]
                                  ).map((verb) => (
                                    <button
                                      key={verb}
                                      type="button"
                                      onClick={() =>
                                        updateExperience(
                                          exp.id,
                                          "action",
                                          exp.action
                                            ? `${exp.action.trim()} ${verb.toLowerCase()} `
                                            : `${verb} `
                                        )
                                      }
                                      className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                                    >
                                      + {verb}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              {/* R - Result */}
                              <div className="space-y-1.5 bg-background p-3 rounded-lg border">
                                <div className="flex items-center justify-between">
                                  <Label className="text-xs font-semibold flex items-center gap-1.5">
                                    <span className="w-5 h-5 rounded bg-success/15 text-success flex items-center justify-center text-[11px] font-bold">
                                      R
                                    </span>
                                    {t("rb.result")}
                                  </Label>
                                  {hasMetricInResult ? (
                                    <span className="text-[10px] text-success font-medium flex items-center gap-0.5">
                                      <CheckCircle2 className="h-3 w-3" />
                                      {locale === "pt"
                                        ? "Métrica OK"
                                        : "Metric OK"}
                                    </span>
                                  ) : (
                                    <span className="text-[10px] text-warning font-medium">
                                      {locale === "pt"
                                        ? "Adicione % ou nº"
                                        : "Add % or #"}
                                    </span>
                                  )}
                                </div>
                                <Textarea
                                  value={exp.result}
                                  onChange={(e) =>
                                    updateExperience(
                                      exp.id,
                                      "result",
                                      e.target.value
                                    )
                                  }
                                  placeholder={t("rb.resultPlaceholder")}
                                  className="min-h-[68px] text-xs leading-relaxed"
                                />
                                <div className="flex flex-wrap items-center gap-1 pt-0.5">
                                  <span className="text-[10px] text-muted-foreground mr-1">
                                    {t("rb.starHelper.result")}
                                  </span>
                                  {(locale === "pt"
                                    ? [
                                        "Reduzi a latência em 40%",
                                        "Aumentei a conversão em 25%",
                                        "Escala de 100 mil usuários",
                                      ]
                                    : [
                                        "Reduced latency by 40%",
                                        "Increased conversion by 25%",
                                        "Scaled to 100k+ users",
                                      ]
                                  ).map((formula) => (
                                    <button
                                      key={formula}
                                      type="button"
                                      onClick={() =>
                                        updateExperience(
                                          exp.id,
                                          "result",
                                          exp.result
                                            ? `${exp.result.trim().replace(/\.$/, "")}. ${formula}.`
                                            : `${formula}.`
                                        )
                                      }
                                      className="text-[10px] px-1.5 py-0.5 rounded bg-success/10 text-success hover:bg-success/20 transition-colors"
                                    >
                                      + {formula}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Education */}
                    <div className="bg-card rounded-xl p-5 shadow-card border space-y-4">
                      <div className="flex items-center justify-between">
                        <h2 className="font-semibold flex items-center gap-2">
                          <GraduationCap className="h-4 w-4 text-primary" />{" "}
                          {t("rb.education")}
                        </h2>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={addEducation}
                        >
                          <Plus className="h-3 w-3 mr-1" /> {t("rb.add")}
                        </Button>
                      </div>
                      {educations.map((edu, idx) => (
                        <div key={edu.id} className="space-y-3">
                          {idx > 0 && <Separator />}
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-muted-foreground font-medium">
                              {t("rb.educationN")} {idx + 1}
                            </span>
                            {educations.length > 1 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeEducation(edu.id)}
                                className="text-muted-foreground hover:text-destructive h-7 w-7 p-0"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <Input
                              placeholder={t("rb.institution")}
                              value={edu.institution}
                              onChange={(e) =>
                                updateEducation(
                                  edu.id,
                                  "institution",
                                  e.target.value
                                )
                              }
                            />
                            <Input
                              placeholder={t("rb.degree")}
                              value={edu.degree}
                              onChange={(e) =>
                                updateEducation(
                                  edu.id,
                                  "degree",
                                  e.target.value
                                )
                              }
                            />
                            <Input
                              placeholder={t("rb.period")}
                              value={edu.period}
                              onChange={(e) =>
                                updateEducation(
                                  edu.id,
                                  "period",
                                  e.target.value
                                )
                              }
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Live A4 Preview Column when in Split Mode */}
                  {activeTab === "split" && (
                    <div className="sticky top-20">
                      {renderLivePreviewDocument()}
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Score & Live Checklist Sidebar (4 cols) */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-card rounded-xl p-6 shadow-card border sticky top-20 space-y-5">
              <div>
                <h3 className="font-semibold text-center mb-3">
                  {t("rb.atsScore")}
                </h3>
                <div className="relative flex justify-center">
                  <ScoreGauge score={scores.totalScore} />
                </div>
              </div>

              <Separator />

              {/* Subscores */}
              <div className="space-y-3 text-sm">
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {t("rb.keywords")}
                    </span>
                    <span className="font-medium">
                      {scores.keywordsScore}/30
                    </span>
                  </div>
                  <Progress
                    value={(scores.keywordsScore / 30) * 100}
                    className="h-1.5"
                  />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {t("rb.actionVerbs")}
                    </span>
                    <span className="font-medium">
                      {scores.actionVerbsScore}/30
                    </span>
                  </div>
                  <Progress
                    value={(scores.actionVerbsScore / 30) * 100}
                    className="h-1.5"
                  />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {t("rb.formatting")}
                    </span>
                    <span className="font-medium">
                      {scores.formattingScore}/40
                    </span>
                  </div>
                  <Progress
                    value={(scores.formattingScore / 40) * 100}
                    className="h-1.5"
                  />
                </div>
              </div>

              <Separator />

              {/* Live Actionable Checklist */}
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {locale === "pt"
                    ? "Checklist de Qualidade ATS"
                    : "ATS Quality Checklist"}
                </p>
                <div className="space-y-1.5">
                  {checklistItems.map((item, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 text-xs leading-snug"
                    >
                      {item.done ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
                      ) : (
                        <AlertCircle className="h-3.5 w-3.5 text-warning shrink-0" />
                      )}
                      <span
                        className={
                          item.done
                            ? "text-foreground"
                            : "text-muted-foreground"
                        }
                      >
                        {locale === "pt" ? item.labelPt : item.labelEn}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              <div className="space-y-2.5">
                <Button className="w-full" onClick={handleExportPdf}>
                  <Printer className="h-4 w-4 mr-2" /> {t("rb.exportPdf")}
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleExportTxt}
                >
                  <Download className="h-4 w-4 mr-2" /> {t("rb.export")}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
