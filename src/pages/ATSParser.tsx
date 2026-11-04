import { useState, useRef, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { ExpertTip } from "@/components/ExpertTip";
import { ScoreGauge } from "@/components/ScoreGauge";
import { useLanguage } from "@/i18n/LanguageContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Upload,
  FileText,
  AlertTriangle,
  CheckCircle,
  FileSearch,
  Loader2,
  Sparkles,
  ArrowRight,
  Mail,
  Phone,
  Linkedin,
  Layers,
  TrendingUp,
  Zap,
  Wand2,
  Copy,
  Check,
  Trash2,
  RefreshCw,
  Eye,
  Edit3,
} from "lucide-react";
import * as pdfjsLib from "pdfjs-dist";
import {
  extractAndAnalyzePDF,
  analyzeResumeForATS,
  formatResumeText,
  ACTION_VERBS_LIST,
  type PDFLayoutMetadata,
  type ATSAnalysisResult,
} from "@/lib/atsEngine";
import { parseRawResumeToBuilderDraft } from "@/lib/careerCopilotEngine";
import { RESUME_BUILDER_STORAGE_KEY } from "@/pages/ResumeBuilder";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.mjs",
  import.meta.url
).toString();

export const LAST_PARSED_RESUME_KEY = "talenthub_last_parsed_resume_v2";
export const LAST_ATS_SCORE_KEY = "talenthub_last_ats_score";

function syncResumeToBuilderStorage(rawText: string) {
  if (!rawText || !rawText.trim()) return;
  try {
    const draft = parseRawResumeToBuilderDraft(rawText);
    localStorage.setItem(RESUME_BUILDER_STORAGE_KEY, JSON.stringify(draft));
  } catch {
    // ignore storage quota errors
  }
}

const SAMPLE_RESUME_PT = `Carla Mendes
carla.mendes@email.com | (11) 98765-4321 | linkedin.com/in/carlamendes | github.com/carlamendes

RESUMO PROFISSIONAL
Engenheira de Software Full Stack com 5 anos de experiência em arquitetura de microsserviços, aplicações web escaláveis com React, TypeScript e Node.js. Focada em performance, CI/CD e qualidade de código.

HABILIDADES TÉCNICAS
TypeScript, JavaScript, React, Next.js, Node.js, PostgreSQL, Docker, Kubernetes, AWS, Git, Testes Automatizados, Scrum.

EXPERIÊNCIA PROFISSIONAL
TechCorp Solutions — Engenheira de Software Sênior (Jan 2023 - Atual)
• Liderei a migração do monolito legado para microsserviços em Node.js e TypeScript, atendendo 250 mil usuários ativos.
• Otimizei consultas em PostgreSQL e implementei cache com Redis, reduzindo a latência da API em 42%.
• Automatizei pipelines de CI/CD no GitHub Actions, diminuindo o tempo de deploy de 45 minutos para 8 minutos.

InovaWeb Digital — Desenvolvedora Full Stack Pleno (Mar 2020 - Dez 2022)
• Desenvolvi interfaces acessíveis em React e Tailwind CSS, aumentando a conversão do checkout em 18%.
• Implementei testes automatizados com Vitest e Playwright, elevando a cobertura de código para 85%.

FORMAÇÃO ACADÊMICA
Universidade de São Paulo (USP) — Bacharelado em Ciência da Computação (2016 - 2020)`;

const SAMPLE_RESUME_EN = `Carla Mendes
carla.mendes@email.com | +1 (555) 234-5678 | linkedin.com/in/carlamendes | github.com/carlamendes

PROFESSIONAL SUMMARY
Full Stack Software Engineer with 5 years of experience building scalable web applications and microservices using React, TypeScript, and Node.js. Passionate about cloud architecture, CI/CD, and clean code.

TECHNICAL SKILLS
TypeScript, JavaScript, React, Next.js, Node.js, PostgreSQL, Docker, Kubernetes, AWS, Git, Unit Testing, Agile Scrum.

PROFESSIONAL EXPERIENCE
TechCorp Solutions — Senior Software Engineer (Jan 2023 - Present)
• Led the migration of a legacy monolith to Node.js and TypeScript microservices serving 250k+ active users.
• Optimized PostgreSQL queries and implemented Redis caching, reducing API latency by 42%.
• Automated CI/CD pipelines with GitHub Actions, cutting deployment time from 45 minutes to 8 minutes.

InovaWeb Digital — Full Stack Developer (Mar 2020 - Dec 2022)
• Developed responsive interfaces in React and Tailwind CSS, increasing checkout conversion by 18%.
• Implemented automated tests using Vitest and Playwright, raising test coverage to 85%.

EDUCATION
University of Sao Paulo (USP) — B.S. in Computer Science (2016 - 2020)`;

const SECTION_HEADING_TEST =
  /^(?:RESUMO(?:\s+PROFISSIONAL)?|SOBRE(?:\s+MIM)?|PERFIL(?:\s+PROFISSIONAL)?|OBJETIVO|PROFESSIONAL\s+SUMMARY|SUMMARY|PROFILE|EXPERI[ÊE]NCIA(?:S)?(?:\s+PROFISSIONA(?:L|IS))?|HIST[ÓO]RICO\s+PROFISSIONAL|PROFESSIONAL\s+EXPERIENCE|WORK\s+EXPERIENCE|EXPERIENCE|FORMA[ÇC][ÃA]O(?:\s+ACAD[ÊE]MICA)?|EDUCA[ÇC][ÃA]O|EDUCATION|HABILIDADES(?:\s+T[ÉE]CNICAS)?|COMPET[ÊE]NCIAS(?:\s+T[ÉE]CNICAS)?|TECNOLOGIAS|SKILLS|TECHNICAL\s+SKILLS|IDIOMAS|LANGUAGES|(?:CERTIFICA[ÇC][ÕO]ES|CURSOS)(?:\s+(?:E|&|\/)\s+(?:CERTIFICA[ÇC][ÕO]ES|CURSOS)|\s+COMPLEMENTARES)?|PROJETOS|CERTIFICATIONS|PROJECTS)$/i;

/**
 * Highlights Action Verbs and Quantified Metrics inside a line of text for the ATS X-Ray view.
 */
function renderHighlightedLine(line: string) {
  const verbsPattern = ACTION_VERBS_LIST.join("|");
  const tokenRegex = new RegExp(
    `(\\b(?:${verbsPattern})\\b|(?:\\b\\d+(?:[.,]\\d+)?\\s*(?:%|por\\s*cento|percent|x|vezes|dias|horas|minutos|minutes|meses|usu[áa]rios|users|clientes|projetos|ms|s|k|mil|milh[õo]es)\\b|(?:R\\$|US\\$|\\$|€)\\s*\\d+(?:[.,]\\d+)?(?:\\s*(?:mil|milh[õo]es|k|m))?))`,
    "gi"
  );

  const parts = line.split(tokenRegex);
  const verbSet = new Set(ACTION_VERBS_LIST.map((v) => v.toLowerCase()));

  return parts.map((part, idx) => {
    if (!part) return null;
    const lower = part.toLowerCase();
    if (verbSet.has(lower)) {
      return (
        <span
          key={idx}
          className="bg-primary/15 text-primary font-semibold px-1.5 py-0.5 rounded text-xs"
          title="Verbo de Ação Forte"
        >
          {part}
        </span>
      );
    }
    if (/\d/.test(part)) {
      return (
        <span
          key={idx}
          className="bg-success/15 text-success font-semibold px-1.5 py-0.5 rounded text-xs"
          title="Métrica / Impacto Quantificado"
        >
          {part}
        </span>
      );
    }
    return <span key={idx}>{part}</span>;
  });
}

export default function ATSParser() {
  const { t, locale } = useLanguage();
  const navigate = useNavigate();
  const [resumeText, setResumeText] = useState<string>(() => {
    try {
      sessionStorage.removeItem("talenthub_last_parsed_resume");
      localStorage.removeItem("talenthub_resume_builder_draft_v1");
      return sessionStorage.getItem(LAST_PARSED_RESUME_KEY) || "";
    } catch {
      return "";
    }
  });
  const [pdfMetadata, setPdfMetadata] = useState<PDFLayoutMetadata | undefined>(
    undefined
  );
  const [analysisResult, setAnalysisResult] =
    useState<ATSAnalysisResult | null>(null);
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [formattedFeedback, setFormattedFeedback] = useState(false);
  const [copiedFeedback, setCopiedFeedback] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const textStats = useMemo(() => {
    const trimmed = resumeText.trim();
    if (!trimmed) return { words: 0, lines: 0 };
    const words = trimmed.split(/\s+/).filter(Boolean).length;
    const lines = trimmed.split("\n").filter((l) => l.trim().length > 0).length;
    return { words, lines };
  }, [resumeText]);

  const handleFile = useCallback(
    async (file: File) => {
      setUploading(true);
      setUploadError("");
      setFileName("");
      setPdfMetadata(undefined);
      try {
        const ext = file.name.split(".").pop()?.toLowerCase();
        if (ext === "pdf") {
          const { text, metadata } = await extractAndAnalyzePDF(file);
          setPdfMetadata(metadata);
          if (text.trim() || metadata.isLikelyScannedOrImage) {
            setResumeText(text);
            setFileName(file.name);
            setFormattedFeedback(true);
            setTimeout(() => setFormattedFeedback(false), 4000);
            if (text.trim()) {
              sessionStorage.setItem(LAST_PARSED_RESUME_KEY, text);
              syncResumeToBuilderStorage(text);
            }
          } else {
            setUploadError(t("ats.uploadError"));
          }
        } else {
          const raw = await file.text();
          const formatted = formatResumeText(raw);
          if (formatted.trim()) {
            setResumeText(formatted);
            setFileName(file.name);
            setFormattedFeedback(true);
            setTimeout(() => setFormattedFeedback(false), 4000);
            sessionStorage.setItem(LAST_PARSED_RESUME_KEY, formatted);
            syncResumeToBuilderStorage(formatted);
          } else {
            setUploadError(t("ats.uploadError"));
          }
        }
      } catch (err) {
        const detail = err instanceof Error ? ` (${err.message})` : "";
        setUploadError(`${t("ats.uploadError")}${detail}`);
      } finally {
        setUploading(false);
      }
    },
    [t]
  );

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleAutoFormat = () => {
    if (!resumeText.trim()) return;
    const cleaned = formatResumeText(resumeText);
    setResumeText(cleaned);
    sessionStorage.setItem(LAST_PARSED_RESUME_KEY, cleaned);
    syncResumeToBuilderStorage(cleaned);
    setFormattedFeedback(true);
    setTimeout(() => setFormattedFeedback(false), 3000);
  };

  const handleCopyText = () => {
    if (!resumeText.trim()) return;
    navigator.clipboard.writeText(resumeText);
    setCopiedFeedback(true);
    setTimeout(() => setCopiedFeedback(false), 2000);
  };

  const handleClearText = () => {
    setResumeText("");
    setFileName("");
    setPdfMetadata(undefined);
    setUploadError("");
    sessionStorage.removeItem(LAST_PARSED_RESUME_KEY);
  };

  const handleLoadSample = () => {
    const sample = locale === "pt" ? SAMPLE_RESUME_PT : SAMPLE_RESUME_EN;
    setResumeText(sample);
    setPdfMetadata(undefined);
    setFileName(locale === "pt" ? "curriculo-exemplo.pdf" : "sample-resume.pdf");
    setUploadError("");
    sessionStorage.setItem(LAST_PARSED_RESUME_KEY, sample);
    syncResumeToBuilderStorage(sample);
  };

  const handleSimulate = () => {
    if (!resumeText.trim() && !pdfMetadata?.isLikelyScannedOrImage) return;
    const cleaned = formatResumeText(resumeText);
    setResumeText(cleaned);
    sessionStorage.setItem(LAST_PARSED_RESUME_KEY, cleaned);
    syncResumeToBuilderStorage(cleaned);
    const result = analyzeResumeForATS(cleaned, pdfMetadata);
    sessionStorage.setItem(LAST_ATS_SCORE_KEY, String(result.overallScore));
    setAnalysisResult(result);
  };

  const handleSendToMatcher = () => {
    sessionStorage.setItem(LAST_PARSED_RESUME_KEY, resumeText);
    syncResumeToBuilderStorage(resumeText);
    navigate("/keyword-matcher");
  };

  const getMappedSectionsList = (res: ATSAnalysisResult) => {
    const list: string[] = [];
    if (res.sections.detectedHeaders.summary)
      list.push(locale === "pt" ? "Resumo" : "Summary");
    if (res.sections.detectedHeaders.experience)
      list.push(locale === "pt" ? "Experiência" : "Experience");
    if (res.sections.detectedHeaders.education)
      list.push(locale === "pt" ? "Formação" : "Education");
    if (res.sections.detectedHeaders.skills)
      list.push(locale === "pt" ? "Habilidades" : "Skills");
    if (res.sections.detectedHeaders.projectsOrCerts)
      list.push(locale === "pt" ? "Projetos/Certs" : "Projects/Certs");
    return list;
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="space-y-1">
            <ExpertTip tip={t("ats.tip")}>
              <h1 className="text-2xl font-bold tracking-tight">
                {t("ats.title")}
              </h1>
            </ExpertTip>
            <p className="text-muted-foreground">{t("ats.subtitle")}</p>
          </div>
          {!analysisResult && (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleLoadSample}
              className="shrink-0 self-start"
            >
              <Sparkles className="h-3.5 w-3.5 mr-1.5 text-primary" />
              {t("ats.loadSample")}
            </Button>
          )}
        </div>

        {!analysisResult ? (
          <div className="space-y-4">
            {/* Upload area with drag & drop */}
            <div
              className="border-2 border-dashed rounded-xl p-8 text-center bg-card hover:border-primary/50 hover:bg-primary/[0.02] transition-all cursor-pointer group"
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.txt,.text"
                className="hidden"
                onChange={handleFileInput}
              />
              <div className="flex flex-col items-center gap-3">
                <div className="w-14 h-14 rounded-full bg-primary/10 group-hover:bg-primary/15 flex items-center justify-center transition-colors">
                  {uploading ? (
                    <Loader2 className="h-6 w-6 text-primary animate-spin" />
                  ) : (
                    <Upload className="h-6 w-6 text-primary animate-pulse-soft" />
                  )}
                </div>
                <div>
                  <p className="font-semibold text-base">
                    {uploading ? t("ats.uploading") : t("ats.paste")}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t("ats.pasteHint")}
                  </p>
                </div>
                {!uploading && (
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                  >
                    <Upload className="h-3.5 w-3.5 mr-1.5" />
                    {t("ats.uploadBtn")}
                  </Button>
                )}
                {uploadError && (
                  <p className="text-sm text-destructive font-medium flex items-center gap-1.5 mt-1">
                    <AlertTriangle className="h-4 w-4" />
                    {uploadError}
                  </p>
                )}
              </div>
            </div>

            {/* Smart Editor Card with Formatting Toolbar & PDF Metadata */}
            <div className="bg-card border rounded-xl shadow-card overflow-hidden">
              <div className="px-4 py-3 bg-secondary/40 border-b flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                    <FileText className="h-4 w-4 text-primary" />
                    <span>
                      {fileName
                        ? fileName
                        : locale === "pt"
                        ? "Editor de Currículo (Formatado para ATS)"
                        : "Resume Editor (ATS-Formatted)"}
                    </span>
                  </div>

                  {pdfMetadata && (
                    <Badge variant="outline" className="text-[11px] bg-background">
                      {pdfMetadata.pageCount}{" "}
                      {pdfMetadata.pageCount === 1
                        ? locale === "pt"
                          ? "página"
                          : "page"
                        : locale === "pt"
                        ? "páginas"
                        : "pages"}
                    </Badge>
                  )}

                  {pdfMetadata && (
                    <Badge
                      variant="outline"
                      className={`text-[11px] ${
                        pdfMetadata.isMultiColumnDetected
                          ? "bg-warning/10 text-warning border-warning/30"
                          : "bg-success/10 text-success border-success/30"
                      }`}
                    >
                      {pdfMetadata.isMultiColumnDetected
                        ? locale === "pt"
                          ? "2 Colunas (Reconstruído)"
                          : "2 Columns (Reconstructed)"
                        : locale === "pt"
                        ? "Coluna Única Ideal"
                        : "Single Column Ideal"}
                    </Badge>
                  )}

                  {textStats.words > 0 && (
                    <span className="text-[11px] text-muted-foreground">
                      • {textStats.words}{" "}
                      {locale === "pt" ? "palavras" : "words"} ({textStats.lines}{" "}
                      {locale === "pt" ? "linhas" : "lines"})
                    </span>
                  )}

                  {formattedFeedback && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-success bg-success/10 px-2 py-0.5 rounded-full animate-fade-in">
                      <CheckCircle className="h-3 w-3" />
                      {locale === "pt"
                        ? "Texto auto-formatado e organizado!"
                        : "Text auto-formatted & structured!"}
                    </span>
                  )}
                </div>

                {/* Formatting & Utility Buttons */}
                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={!resumeText.trim()}
                    onClick={handleAutoFormat}
                    className="h-7 text-xs px-2.5"
                    title={
                      locale === "pt"
                        ? "Junta linhas quebradas do PDF, padroniza tópicos (•) e organiza os títulos de seção"
                        : "Joins broken PDF lines, standardizes bullets (•), and spaces section headers"
                    }
                  >
                    <Wand2 className="h-3.5 w-3.5 mr-1.5 text-primary" />
                    {locale === "pt" ? "Auto-Formatar" : "Auto-Format"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={!resumeText.trim()}
                    onClick={handleCopyText}
                    className="h-7 text-xs px-2"
                  >
                    {copiedFeedback ? (
                      <Check className="h-3.5 w-3.5 text-success" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </Button>
                  {resumeText.trim() && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleClearText}
                      className="h-7 text-xs px-2 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>

              <Textarea
                placeholder={t("ats.placeholder")}
                value={resumeText}
                onChange={(e) => {
                  setResumeText(e.target.value);
                }}
                className="min-h-[300px] border-0 rounded-none focus-visible:ring-0 p-4 text-sm leading-relaxed font-sans resize-y"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={handleSimulate}
                disabled={
                  (!resumeText.trim() &&
                    !pdfMetadata?.isLikelyScannedOrImage) ||
                  uploading
                }
                className="flex-1 h-11 text-base font-semibold shadow-sm"
              >
                <FileSearch className="h-4 w-4 mr-2" />
                {t("ats.simulate")}
              </Button>
              {resumeText.trim() && (
                <Button
                  variant="secondary"
                  className="h-11"
                  onClick={() => {
                    const draft = parseRawResumeToBuilderDraft(resumeText);
                    localStorage.setItem(
                      RESUME_BUILDER_STORAGE_KEY,
                      JSON.stringify(draft)
                    );
                    sessionStorage.setItem(LAST_PARSED_RESUME_KEY, resumeText);
                    navigate("/resume-builder");
                  }}
                >
                  <Sparkles className="h-4 w-4 mr-2 text-primary" />
                  {t("ats.importToBuilder")}
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-6 animate-slide-up">
            {/* Score Overview + Subscores */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-card rounded-xl p-6 border shadow-card items-center">
              <div className="flex flex-col items-center justify-center border-b md:border-b-0 md:border-r pb-4 md:pb-0 md:pr-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  {t("ats.overallScore")}
                </p>
                <div className="relative flex justify-center">
                  <ScoreGauge score={analysisResult.overallScore} size={140} />
                </div>
              </div>

              <div className="md:col-span-2 space-y-4 pl-0 md:pl-2">
                <div className="space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium flex items-center gap-1.5">
                      <Layers className="h-4 w-4 text-primary" />
                      {t("ats.sub.parseability")}
                    </span>
                    <span className="font-bold">
                      {analysisResult.subScores.parseability}/100
                    </span>
                  </div>
                  <Progress
                    value={analysisResult.subScores.parseability}
                    className="h-2"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium flex items-center gap-1.5">
                      <CheckCircle className="h-4 w-4 text-success" />
                      {t("ats.sub.structure")}
                    </span>
                    <span className="font-bold">
                      {analysisResult.subScores.structure}/100
                    </span>
                  </div>
                  <Progress
                    value={analysisResult.subScores.structure}
                    className="h-2"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium flex items-center gap-1.5">
                      <TrendingUp className="h-4 w-4 text-warning" />
                      {t("ats.sub.impact")}
                    </span>
                    <span className="font-bold">
                      {analysisResult.subScores.impact}/100
                    </span>
                  </div>
                  <Progress
                    value={analysisResult.subScores.impact}
                    className="h-2"
                  />
                </div>
              </div>
            </div>

            {/* Extracted Entities Grid */}
            <div className="bg-card rounded-xl p-5 border shadow-card space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                {t("ats.extractedEntities")}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                <div className="p-3 rounded-lg bg-secondary/40 border flex items-start gap-2.5">
                  <Mail className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">
                      {t("ats.entity.email")}
                    </p>
                    <p className="font-medium truncate">
                      {analysisResult.sections.contact.email || (
                        <span className="text-destructive">
                          {t("ats.entity.notDetected")}
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-secondary/40 border flex items-start gap-2.5">
                  <Phone className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">
                      {t("ats.entity.phone")}
                    </p>
                    <p className="font-medium truncate">
                      {analysisResult.sections.contact.phone || (
                        <span className="text-destructive">
                          {t("ats.entity.notDetected")}
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-secondary/40 border flex items-start gap-2.5">
                  <Linkedin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">
                      {t("ats.entity.linkedin")}
                    </p>
                    <p className="font-medium truncate">
                      {analysisResult.sections.contact.linkedin || (
                        <span className="text-warning">
                          {t("ats.entity.notDetected")}
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-secondary/40 border flex items-start gap-2.5">
                  <Layers className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">
                      {t("ats.entity.sections")}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {getMappedSectionsList(analysisResult).length > 0 ? (
                        getMappedSectionsList(analysisResult).map((sec) => (
                          <Badge
                            key={sec}
                            variant="secondary"
                            className="text-[11px] px-1.5 py-0"
                          >
                            {sec}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-destructive font-medium">
                          {t("ats.entity.notDetected")}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-secondary/40 border flex items-start gap-2.5">
                  <TrendingUp className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {t("ats.entity.metrics")}
                    </p>
                    <p className="font-medium">
                      {analysisResult.sections.metrics.quantifiedBulletsCount}{" "}
                      {locale === "pt"
                        ? "resultados quantificados"
                        : "quantified results"}
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-secondary/40 border flex items-start gap-2.5">
                  <Zap className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {t("ats.entity.verbs")}
                    </p>
                    <p className="font-medium">
                      {analysisResult.sections.metrics.actionVerbsFound.length}{" "}
                      {locale === "pt" ? "verbos fortes" : "strong verbs"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Dynamic Diagnostic Findings */}
            <div className="space-y-3">
              <h2 className="text-lg font-semibold">{t("ats.diagnosis")}</h2>
              <div className="grid gap-2.5">
                {analysisResult.findings.map((f) => (
                  <div
                    key={f.id}
                    className={`flex items-start gap-3 p-3.5 rounded-lg border ${
                      f.severity === "error"
                        ? "bg-destructive/5 border-destructive/25"
                        : f.severity === "warning"
                        ? "bg-warning/5 border-warning/25"
                        : "bg-success/5 border-success/25"
                    }`}
                  >
                    {f.severity === "error" ? (
                      <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                    ) : f.severity === "warning" ? (
                      <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                    ) : (
                      <CheckCircle className="h-4 w-4 text-success shrink-0 mt-0.5" />
                    )}
                    <div className="space-y-0.5">
                      <p className="text-sm font-semibold">
                        {locale === "pt" ? f.titlePt : f.titleEn}
                      </p>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {locale === "pt" ? f.descPt : f.descEn}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Interactive ATS Document X-Ray & Editable Formatted View */}
            <div className="bg-card rounded-xl p-5 border shadow-card space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <ExpertTip tip={t("ats.rawTip")}>
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    {t("ats.rawTitle")}
                  </h2>
                </ExpertTip>
                <div className="flex items-center gap-3 text-xs">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-primary/25 border border-primary/40" />
                    {locale === "pt" ? "Verbos de Ação" : "Action Verbs"}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-success/25 border border-success/40" />
                    {locale === "pt"
                      ? "Métricas Quantificadas"
                      : "Quantified Metrics"}
                  </span>
                </div>
              </div>

              <Tabs defaultValue="xray" className="space-y-3">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="xray" className="gap-1.5 text-xs sm:text-sm">
                    <Eye className="h-3.5 w-3.5" />
                    {locale === "pt"
                      ? "Visão Estruturada (Raio-X ATS)"
                      : "Structured View (ATS X-Ray)"}
                  </TabsTrigger>
                  <TabsTrigger value="edit" className="gap-1.5 text-xs sm:text-sm">
                    <Edit3 className="h-3.5 w-3.5" />
                    {locale === "pt"
                      ? "Editar Texto & Recalcular"
                      : "Edit Text & Recalculate"}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="xray">
                  <div className="bg-secondary/30 rounded-xl p-5 border max-h-[420px] overflow-auto space-y-2 text-sm leading-relaxed">
                    {analysisResult.rawText ? (
                      analysisResult.rawText.split("\n").map((line, i) => {
                        const trimmed = line.trim();
                        if (!trimmed) {
                          return <div key={i} className="h-2" />;
                        }
                        if (SECTION_HEADING_TEST.test(trimmed)) {
                          return (
                            <div
                              key={i}
                              className="pt-2 pb-1 border-b border-primary/20 flex items-center justify-between"
                            >
                              <span className="font-bold text-xs tracking-wider uppercase text-primary">
                                {trimmed}
                              </span>
                              <Badge
                                variant="secondary"
                                className="text-[10px] h-4 px-1.5"
                              >
                                {locale === "pt"
                                  ? "Seção Mapeada"
                                  : "Mapped Section"}
                              </Badge>
                            </div>
                          );
                        }
                        if (trimmed.startsWith("•")) {
                          return (
                            <div
                              key={i}
                              className="pl-3 py-1 border-l-2 border-primary/20 text-foreground/90"
                            >
                              {renderHighlightedLine(trimmed)}
                            </div>
                          );
                        }
                        return (
                          <div
                            key={i}
                            className={
                              i === 0
                                ? "font-bold text-base text-foreground"
                                : "text-foreground/90"
                            }
                          >
                            {renderHighlightedLine(trimmed)}
                          </div>
                        );
                      })
                    ) : (
                      <span className="text-muted-foreground italic">
                        [Nenhum texto legível extraído]
                      </span>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="edit" className="space-y-3">
                  <Textarea
                    value={resumeText}
                    onChange={(e) => setResumeText(e.target.value)}
                    className="min-h-[300px] text-sm leading-relaxed font-sans"
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleAutoFormat}
                    >
                      <Wand2 className="h-3.5 w-3.5 mr-1.5 text-primary" />
                      {locale === "pt" ? "Auto-Formatar" : "Auto-Format"}
                    </Button>
                    <Button size="sm" onClick={handleSimulate}>
                      <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                      {locale === "pt"
                        ? "Recalcular Nota ATS"
                        : "Recalculate ATS Score"}
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setAnalysisResult(null);
                }}
              >
                {t("ats.tryAnother")}
              </Button>
              <div className="flex flex-col sm:flex-row gap-2 sm:ml-auto">
                <Button
                  variant="secondary"
                  onClick={() => {
                    const draft = parseRawResumeToBuilderDraft(resumeText);
                    localStorage.setItem(
                      RESUME_BUILDER_STORAGE_KEY,
                      JSON.stringify(draft)
                    );
                    navigate("/resume-builder");
                  }}
                >
                  <Sparkles className="h-4 w-4 mr-2 text-primary" />
                  {t("ats.importToBuilder")}
                </Button>
                <Button onClick={handleSendToMatcher}>
                  {t("ats.sendToMatcher")}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
