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
  const { t } = useLanguage();
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

  const features: {
    icon: typeof FileSearch;
    titleKey: TranslationKey;
    descKey: TranslationKey;
    href: string;
    color: string;
    bgColor: string;
  }[] = [
    {
      icon: FileSearch,
      titleKey: "nav.atsParser",
      descKey: "index.feature.ats.desc",
      href: "/ats-parser",
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      icon: Target,
      titleKey: "nav.keywordMatcher",
      descKey: "index.feature.keyword.desc",
      href: "/keyword-matcher",
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      icon: FileText,
      titleKey: "nav.resumeBuilder",
      descKey: "index.feature.builder.desc",
      href: "/resume-builder",
      color: "text-warning",
      bgColor: "bg-warning/10",
    },
    {
      icon: Compass,
      titleKey: "nav.careerCopilot",
      descKey: "index.feature.copilot.desc",
      href: "/career-copilot",
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
  ];

  const stats: {
    labelKey: TranslationKey;
    value: string;
    trendKey: TranslationKey;
  }[] = [
    {
      labelKey: "index.stat1.label",
      value: "72%",
      trendKey: "index.stat1.trend",
    },
    {
      labelKey: "index.stat2.label",
      value: "15-25",
      trendKey: "index.stat2.trend",
    },
    {
      labelKey: "index.stat3.label",
      value: "8+",
      trendKey: "index.stat3.trend",
    },
  ];

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-8 animate-fade-in">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">
            {t("index.welcome")}
          </h1>
          <p className="text-muted-foreground text-lg">{t("index.subtitle")}</p>
        </div>

        {/* Dynamic User Session Telemetry */}
        <div className="bg-card rounded-xl p-5 shadow-card border space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Activity className="h-3.5 w-3.5 text-primary" />
            {t("index.session.title")}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Link
              to="/ats-parser"
              className="p-3.5 rounded-lg bg-secondary/40 border hover:border-primary/40 transition-colors flex justify-between items-center"
            >
              <div>
                <p className="text-xs text-muted-foreground">
                  {t("index.session.lastAts")}
                </p>
                <p className="text-lg font-bold mt-0.5">
                  {lastAtsScore ? (
                    `${lastAtsScore}/100`
                  ) : (
                    <span className="text-xs font-normal text-muted-foreground">
                      {t("index.session.notRun")}
                    </span>
                  )}
                </p>
              </div>
              <FileSearch className="h-5 w-5 text-primary opacity-80" />
            </Link>

            <Link
              to="/keyword-matcher"
              className="p-3.5 rounded-lg bg-secondary/40 border hover:border-success/40 transition-colors flex justify-between items-center"
            >
              <div>
                <p className="text-xs text-muted-foreground">
                  {t("index.session.lastKw")}
                </p>
                <p className="text-lg font-bold mt-0.5">
                  {lastKwScore ? (
                    `${lastKwScore}%`
                  ) : (
                    <span className="text-xs font-normal text-muted-foreground">
                      {t("index.session.notRun")}
                    </span>
                  )}
                </p>
              </div>
              <Target className="h-5 w-5 text-success opacity-80" />
            </Link>

            <Link
              to="/resume-builder"
              className="p-3.5 rounded-lg bg-secondary/40 border hover:border-warning/40 transition-colors flex justify-between items-center"
            >
              <div>
                <p className="text-xs text-muted-foreground">
                  {t("index.session.builderDraft")}
                </p>
                <p className="text-lg font-bold mt-0.5">
                  {builderScore !== null ? (
                    `${builderScore}/100`
                  ) : (
                    <span className="text-xs font-normal text-muted-foreground">
                      {t("index.session.notRun")}
                    </span>
                  )}
                </p>
              </div>
              <FileText className="h-5 w-5 text-warning opacity-80" />
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {stats.map((stat) => (
            <div
              key={stat.labelKey}
              className="bg-card rounded-xl p-5 shadow-card border animate-slide-up"
            >
              <p className="text-sm text-muted-foreground font-medium">
                {t(stat.labelKey)}
              </p>
              <div className="flex items-end gap-2 mt-1">
                <span className="text-2xl font-bold">{stat.value}</span>
                <span className="text-xs text-primary font-medium flex items-center gap-0.5 mb-1">
                  <TrendingUp className="h-3 w-3" />
                  {t(stat.trendKey)}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {features.map((feature) => (
            <Link
              key={feature.titleKey}
              to={feature.href}
              className="group bg-card rounded-xl p-6 shadow-card border hover:shadow-elevated transition-all duration-300 animate-slide-up"
            >
              <div
                className={`${feature.bgColor} w-10 h-10 rounded-lg flex items-center justify-center mb-4`}
              >
                <feature.icon className={`h-5 w-5 ${feature.color}`} />
              </div>
              <h3 className="font-semibold text-lg mb-2">
                {t(feature.titleKey)}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                {t(feature.descKey)}
              </p>
              <span className="text-sm font-medium text-primary flex items-center gap-1 group-hover:gap-2 transition-all">
                {t("index.access")} <ArrowRight className="h-4 w-4" />
              </span>
            </Link>
          ))}
        </div>

        <div className="bg-primary/5 border border-primary/20 rounded-xl p-6">
          <h3 className="font-semibold text-sm text-primary mb-2">
            {t("index.tip.title")}
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {t("index.tip.text")}
          </p>
        </div>
      </div>
    </AppLayout>
  );
};

export default Index;
