import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useLanguage } from "@/i18n/LanguageContext";
import {
  FileSearch,
  Target,
  FileText,
  TrendingUp,
  ArrowRight,
  Activity,
  Compass,
  Sparkles,
  CheckCircle2,
  Mic,
  Link2,
  Upload,
} from "lucide-react";
import { Link } from "react-router-dom";
import type { TranslationKey } from "@/i18n/translations";
import { LAST_ATS_SCORE_KEY } from "@/pages/ATSParser";
import { LAST_KW_SCORE_KEY } from "@/pages/KeywordMatcher";
import {
  RESUME_BUILDER_STORAGE_KEY,
  calculateBuilderScores,
  type ResumeDraftData,
} from "@/pages/ResumeBuilder";

const Index = () => {
  const { t, locale } = useLanguage();
  const [lastAtsScore, setLastAtsScore] = useState<string | null>(null);
  const [lastKwScore, setLastKwScore] = useState<string | null>(null);
  const [builderScore, setBuilderScore] = useState<number | null>(null);

  useEffect(() => {
    setLastAtsScore(sessionStorage.getItem(LAST_ATS_SCORE_KEY));
    setLastKwScore(sessionStorage.getItem(LAST_KW_SCORE_KEY));
    try {
      const savedDraft = localStorage.getItem(RESUME_BUILDER_STORAGE_KEY);
      if (savedDraft) {
        const parsed = JSON.parse(savedDraft) as ResumeDraftData;
        if (parsed.personalInfo && parsed.personalInfo.name.trim()) {
          const s = calculateBuilderScores(
            parsed.personalInfo,
            parsed.experiences || [],
            parsed.educations || []
          );
          setBuilderScore(s.totalScore);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  const completedStepsCount = [
    lastAtsScore !== null,
    lastKwScore !== null,
    builderScore !== null,
  ].filter(Boolean).length;

  const features: {
    stepNumber: string;
    icon: typeof FileSearch;
    titleKey: TranslationKey;
    descKey: TranslationKey;
    href: string;
    tagPt: string;
    tagEn: string;
    badgeBg: string;
    borderHover: string;
  }[] = [
    {
      stepNumber: "01",
      icon: FileSearch,
      titleKey: "nav.atsParser",
      descKey: "index.feature.ats.desc",
      href: "/ats-parser",
      tagPt: "PDF e Geometria",
      tagEn: "PDF & Geometry",
      badgeBg: "bg-[#1D3ECF]/12 text-[#1D3ECF] dark:text-[#7C9BFF]",
      borderHover: "hover:border-[#1D3ECF]/60",
    },
    {
      stepNumber: "02",
      icon: Target,
      titleKey: "nav.keywordMatcher",
      descKey: "index.feature.keyword.desc",
      href: "/keyword-matcher",
      tagPt: "Link LinkedIn e Gupy",
      tagEn: "LinkedIn & Gupy URL",
      badgeBg: "bg-[#B04EB8]/15 text-[#B04EB8] dark:text-[#E28CE8]",
      borderHover: "hover:border-[#B04EB8]/60",
    },
    {
      stepNumber: "03",
      icon: FileText,
      titleKey: "nav.resumeBuilder",
      descKey: "index.feature.builder.desc",
      href: "/resume-builder",
      tagPt: "Método STAR + A4",
      tagEn: "STAR Method + A4",
      badgeBg: "bg-[#E6AF00]/15 text-[#B88A00] dark:text-[#FFD24C]",
      borderHover: "hover:border-[#E6AF00]/60",
    },
    {
      stepNumber: "04",
      icon: Compass,
      titleKey: "nav.careerCopilot",
      descKey: "index.feature.copilot.desc",
      href: "/career-copilot?tab=voice",
      tagPt: "Simulador de Voz IA",
      tagEn: "AI Voice Simulator",
      badgeBg: "palette-pill-mint",
      borderHover: "hover:border-emerald-500/50",
    },
  ];

  const stats: {
    labelKey: TranslationKey;
    value: string;
    trendKey: TranslationKey;
    accentColor: string;
  }[] = [
    {
      labelKey: "index.stat1.label",
      value: "72%",
      trendKey: "index.stat1.trend",
      accentColor: "#1D3ECF",
    },
    {
      labelKey: "index.stat2.label",
      value: "15 a 25",
      trendKey: "index.stat2.trend",
      accentColor: "#B04EB8",
    },
    {
      labelKey: "index.stat3.label",
      value: "8+",
      trendKey: "index.stat3.trend",
      accentColor: "#E6AF00",
    },
  ];

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-7 animate-fade-in">
        {/* Editorial Hero Section */}
        <section className="relative overflow-hidden rounded-2xl border border-border/80 bg-card p-6 sm:p-8 shadow-card">
          <div
            className="pointer-events-none absolute -right-16 -top-16 h-60 w-60 rounded-full opacity-20 blur-3xl"
            style={{
              background: "linear-gradient(135deg, #1D3ECF 0%, #B04EB8 100%)",
            }}
          />
          <div
            className="pointer-events-none absolute -bottom-16 left-1/3 h-48 w-48 rounded-full opacity-15 blur-3xl"
            style={{ backgroundColor: "#E6AF00" }}
          />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="space-y-3.5 max-w-2xl">
              <h1 className="text-3xl sm:text-4xl font-display font-extrabold tracking-tight leading-tight">
                {t("index.welcome")}{" "}
                <span className="text-gradient-brand">
                  {locale === "pt" ? "Carreira Tech" : "Career Studio"}
                </span>
              </h1>
              <p className="text-muted-foreground text-base leading-relaxed">
                {t("index.subtitle")}
              </p>

              {/* Quick Start Entry Pills */}
              <div className="pt-2 flex flex-wrap items-center gap-2">
                <Link
                  to="/ats-parser"
                  className="inline-flex items-center gap-2 rounded-xl gradient-primary px-4 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-sm hover:opacity-95 transition-all"
                >
                  <Upload className="h-4 w-4" />
                  <span>
                    {locale === "pt"
                      ? "Enviar PDF do Currículo"
                      : "Upload Resume PDF"}
                  </span>
                </Link>
                <Link
                  to="/keyword-matcher"
                  className="inline-flex items-center gap-2 rounded-xl border border-border bg-secondary/70 px-4 py-2.5 text-xs sm:text-sm font-medium text-foreground hover:bg-secondary transition-all"
                >
                  <Link2 className="h-4 w-4 text-[#B04EB8]" />
                  <span>
                    {locale === "pt"
                      ? "Colar Link da Vaga (LinkedIn / Gupy)"
                      : "Paste Job URL (LinkedIn / Gupy)"}
                  </span>
                </Link>
                <Link
                  to="/career-copilot?tab=voice"
                  className="inline-flex items-center gap-2 rounded-xl border border-border bg-secondary/70 px-4 py-2.5 text-xs sm:text-sm font-medium text-foreground hover:bg-secondary transition-all"
                >
                  <Mic className="h-4 w-4 text-[#E6AF00]" />
                  <span>
                    {locale === "pt"
                      ? "Simulador de Entrevista por Voz"
                      : "Voice Interview Simulator"}
                  </span>
                </Link>
              </div>
            </div>

            {/* Right Visual Readiness Card */}
            <div className="rounded-xl border border-border/80 bg-secondary/35 p-4 sm:p-5 lg:w-64 shrink-0 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
                  {locale === "pt" ? "Fluxo da Jornada" : "Journey Progress"}
                </span>
                <span className="text-xs font-mono font-bold text-primary">
                  {completedStepsCount}/3 {locale === "pt" ? "etapas" : "steps"}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                <div
                  className={`h-2 rounded-full transition-colors ${
                    lastAtsScore ? "bg-[#1D3ECF]" : "bg-border"
                  }`}
                />
                <div
                  className={`h-2 rounded-full transition-colors ${
                    lastKwScore ? "bg-[#B04EB8]" : "bg-border"
                  }`}
                />
                <div
                  className={`h-2 rounded-full transition-colors ${
                    builderScore !== null ? "bg-[#10B981]" : "bg-border"
                  }`}
                />
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {locale === "pt"
                  ? "Seus dados sincronizam automaticamente entre o Leitor ATS, o Matcher e o Gerador STAR."
                  : "Your resume syncs automatically across the ATS Parser, Matcher, and STAR Builder."}
              </p>
            </div>
          </div>
        </section>

        {/* Dynamic User Session Telemetry */}
        <div className="bg-card rounded-2xl p-5 sm:p-6 shadow-card border border-border/80 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-mono font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <Activity className="h-3.5 w-3.5 text-primary" />
              {t("index.session.title")}
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <Link
              to="/ats-parser"
              className="p-4 rounded-xl bg-secondary/40 border border-border/70 hover:border-[#1D3ECF]/60 transition-all flex justify-between items-center group"
            >
              <div>
                <p className="text-xs text-muted-foreground font-medium">
                  {t("index.session.lastAts")}
                </p>
                <p className="text-xl font-mono font-bold mt-1">
                  {lastAtsScore ? (
                    `${lastAtsScore}/100`
                  ) : (
                    <span className="text-xs font-sans font-normal text-muted-foreground">
                      {t("index.session.notRun")}
                    </span>
                  )}
                </p>
              </div>
              <div className="h-9 w-9 rounded-lg bg-[#1D3ECF]/12 flex items-center justify-center group-hover:scale-105 transition-transform">
                <FileSearch className="h-4 w-4 text-primary" />
              </div>
            </Link>

            <Link
              to="/keyword-matcher"
              className="p-4 rounded-xl bg-secondary/40 border border-border/70 hover:border-[#B04EB8]/60 transition-all flex justify-between items-center group"
            >
              <div>
                <p className="text-xs text-muted-foreground font-medium">
                  {t("index.session.lastKw")}
                </p>
                <p className="text-xl font-mono font-bold mt-1">
                  {lastKwScore ? (
                    `${lastKwScore}%`
                  ) : (
                    <span className="text-xs font-sans font-normal text-muted-foreground">
                      {t("index.session.notRun")}
                    </span>
                  )}
                </p>
              </div>
              <div className="h-9 w-9 rounded-lg bg-[#B04EB8]/15 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Target className="h-4 w-4 text-[#B04EB8]" />
              </div>
            </Link>

            <Link
              to="/resume-builder"
              className="p-4 rounded-xl bg-secondary/40 border border-border/70 hover:border-[#E6AF00]/60 transition-all flex justify-between items-center group"
            >
              <div>
                <p className="text-xs text-muted-foreground font-medium">
                  {t("index.session.builderDraft")}
                </p>
                <p className="text-xl font-mono font-bold mt-1">
                  {builderScore !== null ? (
                    `${builderScore}/100`
                  ) : (
                    <span className="text-xs font-sans font-normal text-muted-foreground">
                      {t("index.session.notRun")}
                    </span>
                  )}
                </p>
              </div>
              <div className="h-9 w-9 rounded-lg bg-[#E6AF00]/15 flex items-center justify-center group-hover:scale-105 transition-transform">
                <FileText className="h-4 w-4 text-[#E6AF00]" />
              </div>
            </Link>
          </div>
        </div>

        {/* Benchmark Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {stats.map((stat) => (
            <div
              key={stat.labelKey}
              className="bg-card rounded-2xl p-5 shadow-card border border-border/80 animate-slide-up relative overflow-hidden"
            >
              <div
                className="h-1 w-10 rounded-full mb-3"
                style={{ backgroundColor: stat.accentColor }}
              />
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-mono font-medium">
                {t(stat.labelKey)}
              </p>
              <div className="flex items-end gap-2.5 mt-1.5">
                <span className="text-2xl font-display font-extrabold">
                  {stat.value}
                </span>
                <span className="text-xs text-primary font-medium flex items-center gap-0.5 mb-1">
                  <TrendingUp className="h-3 w-3" />
                  {t(stat.trendKey)}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* 2x2 Balanced Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {features.map((feature) => (
            <Link
              key={feature.titleKey}
              to={feature.href}
              className={`group bg-card rounded-2xl p-6 shadow-card border border-border/80 ${feature.borderHover} hover:shadow-elevated transition-all duration-300 animate-slide-up flex flex-col justify-between`}
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div
                    className={`${feature.badgeBg} w-11 h-11 rounded-xl flex items-center justify-center border border-border/50`}
                  >
                    <feature.icon className="h-5 w-5" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-medium text-muted-foreground bg-secondary/70 px-2.5 py-0.5 rounded-full">
                      {locale === "pt" ? feature.tagPt : feature.tagEn}
                    </span>
                    <span className="text-xs font-mono font-semibold text-muted-foreground/70 bg-secondary/70 px-2 py-0.5 rounded-md">
                      {feature.stepNumber} / 04
                    </span>
                  </div>
                </div>
                <h3 className="font-display font-bold text-lg mb-2 group-hover:text-primary transition-colors">
                  {t(feature.titleKey)}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-5">
                  {t(feature.descKey)}
                </p>
              </div>
              <span className="text-xs font-mono font-semibold uppercase tracking-wider text-primary flex items-center gap-1.5 group-hover:gap-2.5 transition-all">
                {t("index.access")} <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </Link>
          ))}
        </div>

        {/* Expert Guideline Banner */}
        <div className="rounded-2xl border border-[#B04EB8]/25 bg-card p-6 shadow-card relative overflow-hidden">
          <div
            className="absolute left-0 top-0 bottom-0 w-1.5"
            style={{
              background:
                "linear-gradient(180deg, #1D3ECF 0%, #B04EB8 50%, #E6AF00 100%)",
            }}
          />
          <div className="pl-2 space-y-1.5">
            <h3 className="font-display font-bold text-sm text-foreground flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-[#B04EB8]" />
              {t("index.tip.title")}
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t("index.tip.text")}
            </p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Index;
