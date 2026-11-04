import { useLocation, useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useLanguage } from "@/i18n/LanguageContext";
import {
  FileSearch,
  GitCompareArrows,
  FileEdit,
  Sparkles,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";

const PIPELINE_STEPS = [
  {
    path: "/ats-parser",
    labelPt: "1. Simulador ATS",
    labelEn: "1. ATS Simulator",
    icon: FileSearch,
  },
  {
    path: "/keyword-matcher",
    labelPt: "2. Match de Vaga",
    labelEn: "2. Job Match",
    icon: GitCompareArrows,
  },
  {
    path: "/resume-builder",
    labelPt: "3. Gerador STAR",
    labelEn: "3. STAR Builder",
    icon: FileEdit,
  },
  {
    path: "/career-copilot",
    labelPt: "4. Copiloto & Pitch",
    labelEn: "4. Copilot & Pitch",
    icon: Sparkles,
  },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { t, locale } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();

  const hasResumeInSession =
    typeof window !== "undefined" &&
    Boolean(sessionStorage.getItem("talenthub_last_parsed_resume"));
  const lastAtsScore =
    typeof window !== "undefined"
      ? sessionStorage.getItem("talenthub_last_ats_score")
      : null;
  const lastMatchScore =
    typeof window !== "undefined"
      ? sessionStorage.getItem("talenthub_last_kw_score")
      : null;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background/60">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="min-h-14 py-2 flex flex-wrap items-center justify-between gap-3 border-b bg-card/90 backdrop-blur-md sticky top-0 z-20 px-4 shadow-sm">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="mr-1" />
              <span className="text-sm font-medium text-muted-foreground hidden xl:inline">
                {t("layout.subtitle")}
              </span>
            </div>

            {/* Interactive Candidate Journey Stepper */}
            <nav
              aria-label="Jornada do Candidato"
              className="hidden md:flex items-center gap-1 bg-secondary/50 p-1 rounded-xl border"
            >
              {PIPELINE_STEPS.map((step, idx) => {
                const Icon = step.icon;
                const isActive = location.pathname === step.path;
                return (
                  <div key={step.path} className="flex items-center">
                    <button
                      type="button"
                      onClick={() => navigate(step.path)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                        isActive
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground hover:bg-background/70"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0" />
                      <span>
                        {locale === "pt" ? step.labelPt : step.labelEn}
                      </span>
                      {step.path === "/ats-parser" && lastAtsScore && (
                        <span
                          className={`ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                            isActive
                              ? "bg-primary-foreground/20 text-primary-foreground"
                              : "bg-primary/15 text-primary"
                          }`}
                        >
                          {lastAtsScore}
                        </span>
                      )}
                      {step.path === "/keyword-matcher" && lastMatchScore && (
                        <span
                          className={`ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                            isActive
                              ? "bg-primary-foreground/20 text-primary-foreground"
                              : "bg-success/15 text-success"
                          }`}
                        >
                          {lastMatchScore}%
                        </span>
                      )}
                    </button>
                    {idx < PIPELINE_STEPS.length - 1 && (
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 mx-0.5" />
                    )}
                  </div>
                );
              })}
            </nav>

            <div className="flex items-center gap-2.5">
              {hasResumeInSession && (
                <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-medium text-success bg-success/10 border border-success/25 px-2.5 py-1 rounded-full">
                  <CheckCircle2 className="h-3 w-3" />
                  {locale === "pt" ? "Currículo Ativo" : "Resume Active"}
                </span>
              )}
              <LanguageSwitcher />
            </div>
          </header>
          <main className="flex-1 p-4 sm:p-6 overflow-auto">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}

