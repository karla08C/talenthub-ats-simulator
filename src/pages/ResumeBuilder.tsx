import { useState, useMemo } from "react";
import { AppLayout } from "@/components/AppLayout";
import { ExpertTip } from "@/components/ExpertTip";
import { ScoreGauge } from "@/components/ScoreGauge";
import { useLanguage } from "@/i18n/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  FileText,
  Download,
  Plus,
  Trash2,
  Briefcase,
  GraduationCap,
  User,
} from "lucide-react";

interface Experience {
  id: string; company: string; role: string; period: string;
  situation: string; task: string; action: string; result: string;
}

interface Education {
  id: string; institution: string; degree: string; period: string;
}

const ACTION_VERBS = [
  "desenvolvi", "liderei", "otimizei", "implementei", "gerenciei", "coordenei",
  "criei", "projetei", "analisei", "automatizei", "reduzi", "aumentei",
  "melhorei", "entreguei", "conduzi", "estruturei", "negociei", "supervisionei",
  "planejei", "executei", "construí", "lancei", "integrei", "monitorei",
  "developed", "led", "optimized", "implemented", "managed", "created",
  "designed", "analyzed", "automated", "reduced", "increased", "improved",
  "delivered", "built", "launched", "integrated", "monitored",
];

function generateId() {
  return Math.random().toString(36).slice(2, 9);
}

export default function ResumeBuilder() {
  const { t } = useLanguage();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [summary, setSummary] = useState("");
  const [skills, setSkills] = useState("");

  const [experiences, setExperiences] = useState<Experience[]>([
    { id: generateId(), company: "", role: "", period: "", situation: "", task: "", action: "", result: "" },
  ]);

  const [educations, setEducations] = useState<Education[]>([
    { id: generateId(), institution: "", degree: "", period: "" },
  ]);

  const addExperience = () => {
    setExperiences([...experiences, { id: generateId(), company: "", role: "", period: "", situation: "", task: "", action: "", result: "" }]);
  };
  const removeExperience = (id: string) => {
    if (experiences.length > 1) setExperiences(experiences.filter((e) => e.id !== id));
  };
  const updateExperience = (id: string, field: keyof Experience, value: string) => {
    setExperiences(experiences.map((e) => (e.id === id ? { ...e, [field]: value } : e)));
  };
  const addEducation = () => {
    setEducations([...educations, { id: generateId(), institution: "", degree: "", period: "" }]);
  };
  const removeEducation = (id: string) => {
    if (educations.length > 1) setEducations(educations.filter((e) => e.id !== id));
  };
  const updateEducation = (id: string, field: keyof Education, value: string) => {
    setEducations(educations.map((e) => (e.id === id ? { ...e, [field]: value } : e)));
  };

  const score = useMemo(() => {
    let s = 0;
    const allText = [name, summary, skills, ...experiences.flatMap((e) => [e.situation, e.task, e.action, e.result])].join(" ").toLowerCase();
    const wordCount = allText.split(/\s+/).filter(Boolean).length;
    const uniqueWords = new Set(allText.split(/\s+/).filter((w) => w.length > 3));
    s += Math.min(30, Math.round((uniqueWords.size / Math.max(wordCount, 1)) * 60));
    s += Math.min(30, ACTION_VERBS.filter((v) => allText.includes(v)).length * 5);
    if (name.trim()) s += 5;
    if (email.trim()) s += 5;
    if (summary.trim().length > 20) s += 10;
    if (skills.trim()) s += 5;
    if (experiences.some((e) => e.action.trim())) s += 10;
    if (educations.some((e) => e.institution.trim())) s += 5;
    return Math.min(100, s);
  }, [name, email, summary, skills, experiences, educations]);

  const handleExport = () => {
    let text = "";
    text += `${name}\n${email} | ${phone}${linkedin ? ` | ${linkedin}` : ""}\n\n`;
    text += `${t("export.summary")}\n${summary}\n\n`;
    text += `${t("export.skills")}\n${skills}\n\n`;
    text += `${t("export.experience")}\n`;
    experiences.forEach((e) => {
      text += `${e.role} — ${e.company} (${e.period})\n`;
      if (e.situation) text += `${t("export.situation")}: ${e.situation}\n`;
      if (e.task) text += `${t("export.task")}: ${e.task}\n`;
      if (e.action) text += `${t("export.action")}: ${e.action}\n`;
      if (e.result) text += `${t("export.result")}: ${e.result}\n`;
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

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <ExpertTip tip={t("rb.tip")}>
              <h1 className="text-2xl font-bold tracking-tight">{t("rb.title")}</h1>
            </ExpertTip>
            <p className="text-muted-foreground">{t("rb.subtitle")}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Personal Info */}
            <div className="bg-card rounded-xl p-5 shadow-card border space-y-4">
              <h2 className="font-semibold flex items-center gap-2">
                <User className="h-4 w-4 text-primary" /> {t("rb.personalData")}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="name">{t("rb.fullName")}</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="João Silva" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email">{t("rb.email")}</Label>
                  <Input id="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="joao@email.com" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone">{t("rb.phone")}</Label>
                  <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(11) 99999-0000" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="linkedin">{t("rb.linkedin")}</Label>
                  <Input id="linkedin" value={linkedin} onChange={(e) => setLinkedin(e.target.value)} placeholder="linkedin.com/in/joaosilva" />
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="bg-card rounded-xl p-5 shadow-card border space-y-3">
              <ExpertTip tip={t("rb.summaryTip")}>
                <h2 className="font-semibold">{t("rb.summary")}</h2>
              </ExpertTip>
              <Textarea value={summary} onChange={(e) => setSummary(e.target.value)} placeholder={t("rb.summaryPlaceholder")} className="min-h-[100px] text-sm" />
            </div>

            {/* Skills */}
            <div className="bg-card rounded-xl p-5 shadow-card border space-y-3">
              <h2 className="font-semibold">{t("rb.skills")}</h2>
              <Textarea value={skills} onChange={(e) => setSkills(e.target.value)} placeholder={t("rb.skillsPlaceholder")} className="min-h-[60px] text-sm" />
            </div>

            {/* Experiences */}
            <div className="bg-card rounded-xl p-5 shadow-card border space-y-4">
              <div className="flex items-center justify-between">
                <ExpertTip tip={t("rb.experienceTip")}>
                  <h2 className="font-semibold flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-primary" /> {t("rb.experience")}
                  </h2>
                </ExpertTip>
                <Button variant="outline" size="sm" onClick={addExperience}>
                  <Plus className="h-3 w-3 mr-1" /> {t("rb.add")}
                </Button>
              </div>
              {experiences.map((exp, idx) => (
                <div key={exp.id} className="space-y-3">
                  {idx > 0 && <Separator />}
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground font-medium">{t("rb.experienceN")} {idx + 1}</span>
                    {experiences.length > 1 && (
                      <Button variant="ghost" size="sm" onClick={() => removeExperience(exp.id)} className="text-muted-foreground hover:text-destructive h-7 w-7 p-0">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <Input placeholder={t("rb.company")} value={exp.company} onChange={(e) => updateExperience(exp.id, "company", e.target.value)} />
                    <Input placeholder={t("rb.role")} value={exp.role} onChange={(e) => updateExperience(exp.id, "role", e.target.value)} />
                    <Input placeholder={t("rb.period")} value={exp.period} onChange={(e) => updateExperience(exp.id, "period", e.target.value)} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">{t("rb.situation")}</Label>
                      <Textarea value={exp.situation} onChange={(e) => updateExperience(exp.id, "situation", e.target.value)} placeholder={t("rb.situationPlaceholder")} className="min-h-[60px] text-sm" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">{t("rb.task")}</Label>
                      <Textarea value={exp.task} onChange={(e) => updateExperience(exp.id, "task", e.target.value)} placeholder={t("rb.taskPlaceholder")} className="min-h-[60px] text-sm" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">{t("rb.action")}</Label>
                      <Textarea value={exp.action} onChange={(e) => updateExperience(exp.id, "action", e.target.value)} placeholder={t("rb.actionPlaceholder")} className="min-h-[60px] text-sm" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">{t("rb.result")}</Label>
                      <Textarea value={exp.result} onChange={(e) => updateExperience(exp.id, "result", e.target.value)} placeholder={t("rb.resultPlaceholder")} className="min-h-[60px] text-sm" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Education */}
            <div className="bg-card rounded-xl p-5 shadow-card border space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-primary" /> {t("rb.education")}
                </h2>
                <Button variant="outline" size="sm" onClick={addEducation}>
                  <Plus className="h-3 w-3 mr-1" /> {t("rb.add")}
                </Button>
              </div>
              {educations.map((edu, idx) => (
                <div key={edu.id} className="space-y-3">
                  {idx > 0 && <Separator />}
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground font-medium">{t("rb.educationN")} {idx + 1}</span>
                    {educations.length > 1 && (
                      <Button variant="ghost" size="sm" onClick={() => removeEducation(edu.id)} className="text-muted-foreground hover:text-destructive h-7 w-7 p-0">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <Input placeholder={t("rb.institution")} value={edu.institution} onChange={(e) => updateEducation(edu.id, "institution", e.target.value)} />
                    <Input placeholder={t("rb.degree")} value={edu.degree} onChange={(e) => updateEducation(edu.id, "degree", e.target.value)} />
                    <Input placeholder={t("rb.period")} value={edu.period} onChange={(e) => updateEducation(edu.id, "period", e.target.value)} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Score sidebar */}
          <div className="space-y-4">
            <div className="bg-card rounded-xl p-6 shadow-card border sticky top-20">
              <h3 className="font-semibold text-center mb-4">{t("rb.atsScore")}</h3>
              <div className="relative flex justify-center">
                <ScoreGauge score={score} />
              </div>
              <Separator className="my-5" />
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("rb.keywords")}</span>
                  <span className="font-medium">{Math.min(30, score > 30 ? 30 : score)}/30</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("rb.actionVerbs")}</span>
                  <span className="font-medium">{Math.min(30, Math.max(0, score - 30))}/30</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("rb.formatting")}</span>
                  <span className="font-medium">{Math.min(40, Math.max(0, score - 60))}/40</span>
                </div>
              </div>
              <Separator className="my-5" />
              <Button onClick={handleExport} className="w-full">
                <Download className="h-4 w-4 mr-2" />
                {t("rb.export")}
              </Button>
              <p className="text-[11px] text-muted-foreground text-center mt-2">{t("rb.exportHint")}</p>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
