import { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { ExpertTip } from "@/components/ExpertTip";
import { useLanguage } from "@/i18n/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Search,
  CheckCircle,
  XCircle,
  Sparkles,
  Copy,
  Check,
  Code2,
  Briefcase,
  Users,
  Plus,
  Compass,
  Upload,
  Wand2,
  Loader2,
  Link2,
  Mic,
  ArrowRight,
  HelpCircle,
} from "lucide-react";
import {
  analyzeKeywordCompatibility,
  type KeywordCategory,
  type ExtractedKeywordItem,
} from "@/lib/keywordEngine";
import { extractAndAnalyzePDF, formatResumeText } from "@/lib/atsEngine";
import {
  parseRawResumeToBuilderDraft,
  extractJobFromUrl,
  generateBulletPointImprovements,
  generateCareerPrepAssets,
  type ExtractedJobUrlResult,
  type BulletImprovementSuggestion,
} from "@/lib/careerCopilotEngine";
import { LAST_PARSED_RESUME_KEY } from "@/pages/ATSParser";
import {
  RESUME_BUILDER_STORAGE_KEY,
  type ResumeDraftData,
} from "@/pages/ResumeBuilder";
import {
  LAST_MATCH_CONTEXT_KEY,
  type LastMatchContext,
} from "@/pages/CareerCopilot";

export const LAST_KW_SCORE_KEY = "talenthub_last_kw_score";

function syncBuilderFromText(text: string) {
  if (!text || !text.trim()) return;
  try {
    const draft = parseRawResumeToBuilderDraft(text);
    localStorage.setItem(RESUME_BUILDER_STORAGE_KEY, JSON.stringify(draft));
  } catch {
    // ignore
  }
}

const SAMPLE_JOB_PT = `Vaga: Pessoa Desenvolvedora Full Stack Sênior (Remoto)
Sobre a oportunidade:
Buscamos profissional com sólida experiência em Engenharia de Software para atuar na evolução da nossa plataforma SaaS de alta escala.

Requisitos Obrigatórios:
- Domínio de TypeScript, JavaScript (ES6+) e React no front-end;
- Experiência sólida com Node.js e construção de REST API e GraphQL;
- Bancos de dados relacionais (PostgreSQL, SQL) e cache com Redis;
- Experiência com containers (Docker, Kubernetes / K8s) e nuvem AWS;
- Vivência com pipelines de CI/CD, Git e Testes Automatizados (Jest, Vitest ou Cypress);
- Metodologias Ágeis (Scrum, Kanban), Liderança técnica e boa Comunicação em Trabalho em Equipe.`;

const SAMPLE_RESUME_KW_PT = `Carla Mendes — Engenheira de Software
Experiência com desenvolvimento web moderno usando JS, TS, React.js e Node.js.
Construí APIs REST escaláveis integradas com banco Postgres e cache Redis.
Utilizo Git, Docker e metodologias ágeis (Scrum) no dia a dia com foco em colaboração e trabalho em equipe.`;

const SAMPLE_JOB_EN = `Role: Senior Full Stack Software Engineer (Remote)
About the role:
We are looking for a strong Software Engineering professional to scale our cloud SaaS platform.

Requirements:
- Proficiency in TypeScript, JavaScript, and React;
- Strong backend experience with Node.js, REST API, and GraphQL;
- Relational databases (PostgreSQL, SQL) and Redis caching;
- Cloud & DevOps experience with AWS, Docker, Kubernetes (K8s), and CI/CD pipelines;
- Automated Unit Testing (Vitest, Jest, Cypress) and Git;
- Agile Scrum environment, technical Leadership, and cross-functional Teamwork.`;

const SAMPLE_RESUME_KW_EN = `Carla Mendes — Software Engineer
Experienced in building modern web apps using JS, TS, ReactJS, and Node.js.
Designed RESTful services backed by Postgres and Redis.
Daily user of Git, Docker, and Agile Scrum practices with strong teamwork.`;

export default function KeywordMatcher() {
  const { t, locale } = useLanguage();
  const navigate = useNavigate();
  const [jobDescription, setJobDescription] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [analyzed, setAnalyzed] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<
    "all" | KeywordCategory
  >("all");
  const [copied, setCopied] = useState(false);
  const [injectedTerms, setInjectedTerms] = useState<Set<string>>(new Set());
  const [uploadingResume, setUploadingResume] = useState(false);
  const [jobUrl, setJobUrl] = useState("");
  const [extractingUrl, setExtractingUrl] = useState(false);
  const [extractedJobMeta, setExtractedJobMeta] =
    useState<ExtractedJobUrlResult | null>(null);
  const [appliedBulletIds, setAppliedBulletIds] = useState<Set<string>>(
    new Set()
  );
  const resumeFileInputRef = useRef<HTMLInputElement>(null);

  // Automatically load resume text if the user just came from ATS Parser
  useEffect(() => {
    const savedResume = sessionStorage.getItem(LAST_PARSED_RESUME_KEY);
    if (savedResume && !resumeText) {
      setResumeText(savedResume);
    }
  }, [resumeText]);

  const handleExtractJobUrl = async (customUrl?: string) => {
    const targetUrl = (customUrl ?? jobUrl).trim();
    if (!targetUrl) return;
    if (customUrl) setJobUrl(customUrl);
    setExtractingUrl(true);
    try {
      const res = await extractJobFromUrl(targetUrl, locale === "pt" ? "pt" : "en");
      setExtractedJobMeta(res);
      setJobDescription(res.jobDescription);
      setAnalyzed(false);
    } finally {
      setExtractingUrl(false);
    }
  };

  const handleResumeUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadingResume(true);
    try {
      let text = "";
      if (
        file.type === "application/pdf" ||
        file.name.toLowerCase().endsWith(".pdf")
      ) {
        const res = await extractAndAnalyzePDF(file);
        text = res.text;
      } else {
        text = formatResumeText(await file.text());
      }
      if (text.trim()) {
        setResumeText(text);
        sessionStorage.setItem(LAST_PARSED_RESUME_KEY, text);
        syncBuilderFromText(text);
      }
    } catch (err) {
      console.error("Failed to upload resume in KeywordMatcher:", err);
    } finally {
      setUploadingResume(false);
      if (resumeFileInputRef.current) {
        resumeFileInputRef.current.value = "";
      }
    }
  };

  const analysis = useMemo(() => {
    if (!analyzed) return null;
    const res = analyzeKeywordCompatibility(jobDescription, resumeText);
    sessionStorage.setItem(LAST_KW_SCORE_KEY, String(res.overallWeightedScore));
    const ctx: LastMatchContext = {
      matchedSkills: res.matched.map((m) => m.term),
      missingSkills: res.missing.map((m) => m.term),
      jobTitle: extractedJobMeta?.roleTitle,
    };
    sessionStorage.setItem(LAST_MATCH_CONTEXT_KEY, JSON.stringify(ctx));
    return res;
  }, [analyzed, jobDescription, resumeText, extractedJobMeta]);

  const bulletImprovements = useMemo(() => {
    if (!analysis) return [];
    return generateBulletPointImprovements(
      resumeText,
      analysis.missing.map((m) => m.term),
      analysis.matched.map((m) => m.term)
    );
  }, [analysis, resumeText]);

  const jobQuestions = useMemo(() => {
    if (!analysis) return [];
    const assets = generateCareerPrepAssets({
      candidateName: "Candidato",
      candidateRole:
        extractedJobMeta?.roleTitle ||
        (locale === "pt" ? "Especialista na Vaga" : "Target Role Specialist"),
      matchedSkills: analysis.matched.map((m) => m.term),
      missingSkills: analysis.missing.map((m) => m.term),
      topQuantifiedResult: "",
    });
    return assets.questions;
  }, [analysis, extractedJobMeta, locale]);

  const handleApplyBulletImprovement = (item: BulletImprovementSuggestion) => {
    const cleanOrig = item.originalBullet.replace(/^[-•*▪▸◦]\s*/, "").trim();
    let updatedResume = resumeText;
    if (updatedResume.includes(cleanOrig)) {
      updatedResume = updatedResume.replace(cleanOrig, item.improvedBullet.replace(/^•\s*/, ""));
    } else {
      updatedResume = `${updatedResume.trim()}\n${item.improvedBullet}`;
    }
    setResumeText(updatedResume);
    sessionStorage.setItem(LAST_PARSED_RESUME_KEY, updatedResume);
    syncBuilderFromText(updatedResume);
    if (item.injectedSkill) {
      injectKeywordsIntoBuilder([item.injectedSkill]);
    }
    setAppliedBulletIds((prev) => new Set(prev).add(item.id));
  };

  const handleLoadSample = () => {
    if (locale === "pt") {
      setJobDescription(SAMPLE_JOB_PT);
      setResumeText(SAMPLE_RESUME_KW_PT);
    } else {
      setJobDescription(SAMPLE_JOB_EN);
      setResumeText(SAMPLE_RESUME_KW_EN);
    }
    setAnalyzed(false);
    setInjectedTerms(new Set());
  };

  const filterByCategory = (items: ExtractedKeywordItem[]) => {
    if (selectedCategory === "all") return items;
    return items.filter((item) => item.category === selectedCategory);
  };

  const handleCopyMissing = () => {
    if (!analysis) return;
    const textToCopy = analysis.missing.map((m) => m.term).join(", ");
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const injectKeywordsIntoBuilder = (termsToAdd: string[]) => {
    try {
      const savedRaw = localStorage.getItem(RESUME_BUILDER_STORAGE_KEY);
      const draft: ResumeDraftData = savedRaw
        ? JSON.parse(savedRaw)
        : {
            personalInfo: {
              name: "",
              email: "",
              phone: "",
              linkedin: "",
              summary: "",
              skills: "",
            },
            experiences: [
              {
                id: "1",
                company: "",
                role: "",
                period: "",
                situation: "",
                task: "",
                action: "",
                result: "",
              },
            ],
            educations: [{ id: "1", institution: "", degree: "", period: "" }],
          };

      const existingSkills = draft.personalInfo.skills
        .split(/[,;|]+/)
        .map((s) => s.trim())
        .filter(Boolean);

      const lowerExisting = new Set(existingSkills.map((s) => s.toLowerCase()));
      for (const term of termsToAdd) {
        if (!lowerExisting.has(term.toLowerCase())) {
          existingSkills.push(term);
          lowerExisting.add(term.toLowerCase());
        }
      }

      draft.personalInfo.skills = existingSkills.join(", ");
      localStorage.setItem(RESUME_BUILDER_STORAGE_KEY, JSON.stringify(draft));

      setInjectedTerms((prev) => {
        const next = new Set(prev);
        termsToAdd.forEach((term) => next.add(term));
        return next;
      });
    } catch {
      // ignore
    }
  };

  const getCategoryIcon = (cat: KeywordCategory) => {
    if (cat === "hard_skill") return <Code2 className="h-3 w-3 mr-1" />;
    if (cat === "domain") return <Briefcase className="h-3 w-3 mr-1" />;
    return <Users className="h-3 w-3 mr-1" />;
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="space-y-1">
            <ExpertTip tip={t("kw.tip")}>
              <h1 className="text-2xl font-bold tracking-tight">
                {t("kw.title")}
              </h1>
            </ExpertTip>
            <p className="text-muted-foreground">{t("kw.subtitle")}</p>
          </div>
          {!analyzed && (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleLoadSample}
              className="shrink-0 self-start"
            >
              <Sparkles className="h-3.5 w-3.5 mr-1.5 text-primary" />
              {t("kw.loadSample")}
            </Button>
          )}
        </div>

        {!analyzed ? (
          <div className="space-y-4">
            {/* LinkedIn / Gupy Job URL Extractor Bar */}
            <div className="bg-card rounded-xl p-4 border shadow-card space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Link2 className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold">
                      {locale === "pt"
                        ? "Importar Vaga por Link (LinkedIn / Gupy / Greenhouse)"
                        : "Import Job via URL (LinkedIn / Gupy / Greenhouse)"}
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      {locale === "pt"
                        ? "Cole o link da vaga para extrair os requisitos e gerar o Raio-X de compatibilidade + perguntas técnicas"
                        : "Paste the job link to extract requirements and generate a full X-Ray + technical questions"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs px-2 text-primary"
                    onClick={() =>
                      handleExtractJobUrl(
                        "https://www.linkedin.com/jobs/view/desenvolvedor-full-stack-senior-at-nubank"
                      )
                    }
                  >
                    Demo LinkedIn
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs px-2 text-primary"
                    onClick={() =>
                      handleExtractJobUrl(
                        "https://itau.gupy.io/jobs/analista-financeiro-e-dados-senior"
                      )
                    }
                  >
                    Demo Gupy
                  </Button>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  value={jobUrl}
                  onChange={(e) => setJobUrl(e.target.value)}
                  placeholder={
                    locale === "pt"
                      ? "Ex: https://www.linkedin.com/jobs/view/... ou https://empresa.gupy.io/jobs/..."
                      : "E.g., https://www.linkedin.com/jobs/view/... or https://company.gupy.io/jobs/..."
                  }
                  className="text-sm"
                />
                <Button
                  type="button"
                  onClick={() => handleExtractJobUrl()}
                  disabled={!jobUrl.trim() || extractingUrl}
                  className="shrink-0"
                >
                  {extractingUrl ? (
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4 mr-1.5" />
                  )}
                  {locale === "pt" ? "Extrair Vaga" : "Extract Job"}
                </Button>
              </div>

              {extractedJobMeta && (
                <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                  <Badge variant="secondary" className="font-semibold">
                    {extractedJobMeta.platform}
                  </Badge>
                  <span className="font-medium text-foreground">
                    {extractedJobMeta.roleTitle}
                  </span>
                  <span className="text-muted-foreground">
                    • {extractedJobMeta.companyName}
                  </span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between min-h-7">
                  <label className="text-sm font-medium">
                    {t("kw.jobLabel")}
                  </label>
                </div>
                <Textarea
                  placeholder={t("kw.jobPlaceholder")}
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  className="min-h-[280px] text-sm leading-relaxed"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2 min-h-7">
                  <label className="text-sm font-medium">
                    {t("kw.resumeLabel")}
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      ref={resumeFileInputRef}
                      type="file"
                      accept=".pdf,.txt,.text"
                      className="hidden"
                      onChange={handleResumeUpload}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={uploadingResume}
                      onClick={() => resumeFileInputRef.current?.click()}
                      className="h-7 text-xs px-2"
                    >
                      {uploadingResume ? (
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      ) : (
                        <Upload className="h-3 w-3 mr-1" />
                      )}
                      PDF/TXT
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={!resumeText.trim()}
                      onClick={() => {
                        const formatted = formatResumeText(resumeText);
                        setResumeText(formatted);
                        sessionStorage.setItem(LAST_PARSED_RESUME_KEY, formatted);
                      }}
                      className="h-7 text-xs px-2"
                    >
                      <Wand2 className="h-3 w-3 mr-1 text-primary" />
                      {locale === "pt" ? "Formatar" : "Format"}
                    </Button>
                  </div>
                </div>
                <Textarea
                  placeholder={t("kw.resumePlaceholder")}
                  value={resumeText}
                  onChange={(e) => setResumeText(e.target.value)}
                  className="min-h-[280px] text-sm leading-relaxed"
                />
              </div>
            </div>
            <Button
              onClick={() => setAnalyzed(true)}
              disabled={!jobDescription.trim() || !resumeText.trim()}
              className="w-full h-11 text-base font-semibold"
            >
              <Search className="h-4 w-4 mr-2" />
              {t("kw.analyze")}
            </Button>
          </div>
        ) : analysis ? (
          <div className="space-y-6 animate-slide-up">
            {/* Weighted Score & Category Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-card rounded-xl p-6 shadow-card border items-center">
              <div className="text-center border-b md:border-b-0 md:border-r pb-4 md:pb-0 md:pr-4">
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-1">
                  {t("kw.matchRate")}
                </p>
                <p
                  className={`text-5xl font-bold ${
                    analysis.overallWeightedScore >= 70
                      ? "text-success"
                      : analysis.overallWeightedScore >= 45
                      ? "text-warning"
                      : "text-destructive"
                  }`}
                >
                  {analysis.overallWeightedScore}%
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  {analysis.exactMatchCount} / {analysis.totalKeywordsCount}{" "}
                  {t("kw.found")}
                </p>
              </div>

              <div className="md:col-span-2 space-y-3.5 pl-0 md:pl-2">
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="flex items-center">
                      <Code2 className="h-3.5 w-3.5 mr-1.5 text-primary" />
                      {t("kw.cat.hard_skill")}
                    </span>
                    <span className="font-bold">{analysis.hardSkillsScore}%</span>
                  </div>
                  <Progress value={analysis.hardSkillsScore} className="h-2" />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="flex items-center">
                      <Briefcase className="h-3.5 w-3.5 mr-1.5 text-success" />
                      {t("kw.cat.domain")}
                    </span>
                    <span className="font-bold">{analysis.domainScore}%</span>
                  </div>
                  <Progress value={analysis.domainScore} className="h-2" />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="flex items-center">
                      <Users className="h-3.5 w-3.5 mr-1.5 text-warning" />
                      {t("kw.cat.soft_skill")}
                    </span>
                    <span className="font-bold">{analysis.softSkillsScore}%</span>
                  </div>
                  <Progress value={analysis.softSkillsScore} className="h-2" />
                </div>
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="flex flex-wrap gap-2">
              {(
                ["all", "hard_skill", "domain", "soft_skill"] as const
              ).map((cat) => (
                <Button
                  key={cat}
                  variant={selectedCategory === cat ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(cat)}
                  className="text-xs h-8"
                >
                  {t(`kw.cat.${cat}`)}
                </Button>
              ))}
            </div>

            {/* Present vs Missing Keywords */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-card rounded-xl p-5 border shadow-card space-y-3">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-success" />
                  {t("kw.present")} ({filterByCategory(analysis.matched).length})
                </h3>
                <div className="flex flex-wrap gap-2">
                  {filterByCategory(analysis.matched).map((item) => (
                    <Badge
                      key={item.canonical}
                      className="bg-success/10 text-success border-success/25 hover:bg-success/20 py-1 px-2.5 flex items-center"
                    >
                      {getCategoryIcon(item.category)}
                      <span>{item.term}</span>
                      {item.matchedViaSynonym && (
                        <span className="ml-1.5 text-[10px] opacity-80 bg-success/15 px-1 rounded">
                          {t("kw.synonymMatched")}: "{item.matchedViaSynonym}"
                        </span>
                      )}
                    </Badge>
                  ))}
                  {filterByCategory(analysis.matched).length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      {t("kw.noKeywords")}
                    </p>
                  )}
                </div>
              </div>

              <div className="bg-card rounded-xl p-5 border shadow-card space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-destructive" />
                    {t("kw.missing")} ({filterByCategory(analysis.missing).length})
                  </h3>
                  {analysis.missing.length > 0 && (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          injectKeywordsIntoBuilder(
                            analysis.missing.map((m) => m.term)
                          )
                        }
                        className="h-7 text-xs px-2 text-primary"
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        {t("kw.injectAll")}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCopyMissing}
                        className="h-7 text-xs px-2"
                      >
                        {copied ? (
                          <>
                            <Check className="h-3.5 w-3.5 mr-1 text-success" />
                            {t("kw.copied")}
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5 mr-1" />
                            {t("kw.copyMissing")}
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {filterByCategory(analysis.missing).map((item) => {
                    const isInjected = injectedTerms.has(item.term);
                    return (
                      <Badge
                        key={item.canonical}
                        onClick={() => injectKeywordsIntoBuilder([item.term])}
                        variant="destructive"
                        className={`cursor-pointer transition-colors py-1 px-2.5 flex items-center ${
                          isInjected
                            ? "bg-primary/15 text-primary border-primary/30 hover:bg-primary/20"
                            : "bg-destructive/10 text-destructive border-destructive/25 hover:bg-destructive/20"
                        }`}
                      >
                        {getCategoryIcon(item.category)}
                        <span>{item.term}</span>
                        {item.frequencyInJob > 1 && (
                          <span className="ml-1.5 text-[10px] opacity-75">
                            ({item.frequencyInJob}x)
                          </span>
                        )}
                        {isInjected ? (
                          <Check className="h-3 w-3 ml-1.5 text-success" />
                        ) : (
                          <Plus className="h-3 w-3 ml-1.5 opacity-75" />
                        )}
                      </Badge>
                    );
                  })}
                  {filterByCategory(analysis.missing).length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      {t("kw.allPresent")}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* AI Bullet Point Improvements (Before -> After) */}
            {bulletImprovements.length > 0 && (
              <div className="bg-card rounded-xl p-6 border shadow-card space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-base font-semibold flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      {locale === "pt"
                        ? "Sugestões de Melhoria de Bullet Points via IA (Padrão STAR)"
                        : "AI Bullet Point Improvements (STAR Framework)"}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {locale === "pt"
                        ? "Reescritas inteligentes dos seus tópicos reais injetando keywords faltantes da vaga e métricas de impacto"
                        : "Smart rewrites of your actual resume bullets injecting missing job keywords and impact metrics"}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  {bulletImprovements.map((item) => {
                    const isApplied = appliedBulletIds.has(item.id);
                    return (
                      <div
                        key={item.id}
                        className="rounded-lg border bg-muted/20 p-4 space-y-2.5"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <Badge variant="outline" className="text-[11px]">
                            {locale === "pt" ? "Diagnóstico IA:" : "AI Diagnosis:"}{" "}
                            {locale === "pt" ? item.reasonPt : item.reasonEn}
                          </Badge>
                          <Button
                            size="sm"
                            variant={isApplied ? "secondary" : "default"}
                            disabled={isApplied}
                            onClick={() => handleApplyBulletImprovement(item)}
                            className="h-7 text-xs px-2.5"
                          >
                            {isApplied ? (
                              <>
                                <Check className="h-3.5 w-3.5 mr-1 text-success" />
                                {locale === "pt"
                                  ? "Aplicado ao Currículo"
                                  : "Applied to Resume"}
                              </>
                            ) : (
                              <>
                                <Wand2 className="h-3.5 w-3.5 mr-1" />
                                {locale === "pt"
                                  ? "Aplicar no Currículo"
                                  : "Apply to Resume"}
                              </>
                            )}
                          </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                          <div className="rounded-md bg-destructive/5 border border-destructive/20 p-3 space-y-1">
                            <span className="font-semibold text-destructive uppercase tracking-wider text-[10px]">
                              {locale === "pt" ? "Antes (Original)" : "Before (Original)"}
                            </span>
                            <p className="text-muted-foreground leading-relaxed">
                              {item.originalBullet}
                            </p>
                          </div>
                          <div className="rounded-md bg-success/5 border border-success/25 p-3 space-y-1">
                            <span className="font-semibold text-success uppercase tracking-wider text-[10px]">
                              {locale === "pt"
                                ? `Depois (Otimizado + ${item.injectedSkill})`
                                : `After (Optimized + ${item.injectedSkill})`}
                            </span>
                            <p className="text-foreground font-medium leading-relaxed">
                              {item.improvedBullet}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Probable Technical & Behavioral Questions for this Job */}
            {jobQuestions.length > 0 && (
              <div className="bg-card rounded-xl p-6 border shadow-card space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold flex items-center gap-2">
                      <HelpCircle className="h-4 w-4 text-primary" />
                      {locale === "pt"
                        ? "Perguntas Técnicas e Comportamentais Prováveis desta Vaga"
                        : "Probable Technical & Behavioral Questions for this Role"}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {locale === "pt"
                        ? "Geradas com base nos requisitos da vaga e nos gaps detectados no seu currículo"
                        : "Generated based on the job requirements and gaps detected in your resume"}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => navigate("/career-copilot?tab=voice")}
                    className="shrink-0 bg-primary text-primary-foreground"
                  >
                    <Mic className="h-4 w-4 mr-1.5" />
                    {locale === "pt"
                      ? "Treinar no Simulador por Voz (IA)"
                      : "Practice in Voice Simulator (AI)"}
                    <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {jobQuestions.map((q) => (
                    <div
                      key={q.id}
                      className="rounded-lg border p-3.5 bg-background space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <Badge
                          variant={
                            q.type === "gap_defense" ? "destructive" : "secondary"
                          }
                          className="text-[10px]"
                        >
                          {q.type === "technical"
                            ? locale === "pt"
                              ? `Técnica: ${q.skillOrTopic}`
                              : `Technical: ${q.skillOrTopic}`
                            : q.type === "gap_defense"
                            ? locale === "pt"
                              ? `Defesa de Gap: ${q.skillOrTopic}`
                              : `Gap Defense: ${q.skillOrTopic}`
                            : locale === "pt"
                            ? `Comportamental: ${q.skillOrTopic}`
                            : `Behavioral: ${q.skillOrTopic}`}
                        </Badge>
                      </div>
                      <p className="text-sm font-medium leading-snug">
                        "{locale === "pt" ? q.questionPt : q.questionEn}"
                      </p>
                      <p className="text-xs text-muted-foreground">
                        💡 {locale === "pt" ? q.tipPt : q.tipEn}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <Button variant="outline" onClick={() => setAnalyzed(false)}>
                {t("kw.newAnalysis")}
              </Button>
              <Button
                onClick={() => navigate("/career-copilot?tab=voice")}
                className="sm:ml-auto"
              >
                <Compass className="h-4 w-4 mr-2" />
                {t("kw.goToCopilot")}
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </AppLayout>
  );
}
