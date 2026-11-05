import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useLanguage } from "@/i18n/LanguageContext";
import {
  AUTH_USER_STORAGE_KEY,
  getStoredAuthUser,
  type AuthUserSession,
} from "@/pages/Login";
import {
  FileSearch,
  GitCompareArrows,
  FileEdit,
  Sparkles,
  CheckCircle2,
  ChevronRight,
  LayoutDashboard,
  LogIn,
  LogOut,
  User,
} from "lucide-react";

const PIPELINE_STEPS = [
  {
    path: "/ats-parser",
    stepNum: "01",
    labelPt: "Simulador ATS",
    labelEn: "ATS Simulator",
    icon: FileSearch,
  },
  {
    path: "/keyword-matcher",
    stepNum: "02",
    labelPt: "Match de Vaga",
    labelEn: "Job Match",
    icon: GitCompareArrows,
  },
  {
    path: "/resume-builder",
    stepNum: "03",
    labelPt: "Gerador STAR",
    labelEn: "STAR Builder",
    icon: FileEdit,
  },
  {
    path: "/career-copilot",
    stepNum: "04",
    labelPt: "Copiloto e Voz",
    labelEn: "Copilot & Voice",
    icon: Sparkles,
  },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { t, locale } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const [authUser, setAuthUser] = useState<AuthUserSession | null>(() =>
    getStoredAuthUser()
  );

  const handleLogout = () => {
    localStorage.removeItem(AUTH_USER_STORAGE_KEY);
    setAuthUser(null);
    navigate("/login");
  };

  const hasResumeInSession =
    typeof window !== "undefined" &&
    Boolean(
      sessionStorage.getItem("talenthub_last_parsed_resume_v2") ||
        sessionStorage.getItem("talenthub_last_parsed_resume")
    );
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
      <div className="min-h-screen flex w-full bg-background/70">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top Signature Brand Accent Line */}
          <div
            className="h-1 w-full shrink-0"
            style={{
              background:
                "linear-gradient(90deg, #1D3ECF 0%, #B04EB8 50%, #E6AF00 85%, #D7F7E1 100%)",
            }}
          />

          <header className="border-b border-border/80 bg-card/85 backdrop-blur-xl sticky top-0 z-20 shadow-sm">
            <div className="min-h-14 py-2 px-4 sm:px-6 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <SidebarTrigger className="mr-0.5" />
                <button
                  type="button"
                  onClick={() => navigate("/")}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                    location.pathname === "/"
                      ? "bg-primary/12 text-primary font-semibold"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                  }`}
                >
                  <LayoutDashboard className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">
                    {locale === "pt" ? "Painel" : "Dashboard"}
                  </span>
                </button>
                <span className="text-xs font-medium text-muted-foreground hidden 2xl:inline border-l border-border pl-2.5">
                  {t("layout.subtitle")}
                </span>
              </div>

              {/* Desktop Candidate Journey Stepper */}
              <nav
                aria-label="Jornada do Candidato"
                className="hidden lg:flex items-center gap-1 bg-secondary/60 p-1 rounded-xl border border-border/70"
              >
                {PIPELINE_STEPS.map((step, idx) => {
                  const Icon = step.icon;
                  const isActive = location.pathname === step.path;
                  return (
                    <div key={step.path} className="flex items-center">
                      <button
                        type="button"
                        onClick={() => navigate(step.path)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          isActive
                            ? "gradient-primary text-white shadow-sm"
                            : "text-muted-foreground hover:text-foreground hover:bg-background/80"
                        }`}
                      >
                        <span
                          className={`text-[10px] font-mono font-bold ${
                            isActive ? "text-white/80" : "text-[#B04EB8]"
                          }`}
                        >
                          {step.stepNum}
                        </span>
                        <Icon className="h-3.5 w-3.5 shrink-0" />
                        <span>
                          {locale === "pt" ? step.labelPt : step.labelEn}
                        </span>
                        {step.path === "/ats-parser" && lastAtsScore && (
                          <span
                            className={`ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                              isActive
                                ? "bg-white/20 text-white"
                                : "bg-primary/15 text-primary"
                            }`}
                          >
                            {lastAtsScore}
                          </span>
                        )}
                        {step.path === "/keyword-matcher" && lastMatchScore && (
                          <span
                            className={`ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                              isActive
                                ? "bg-white/20 text-white"
                                : "palette-pill-mint"
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

              <div className="flex items-center gap-2">
                {hasResumeInSession && (
                  <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-medium palette-pill-mint border px-2.5 py-1 rounded-full">
                    <CheckCircle2 className="h-3 w-3" />
                    {locale === "pt" ? "Currículo Ativo" : "Resume Active"}
                  </span>
                )}
                <ThemeToggle />
                <LanguageSwitcher />
                {authUser ? (
                  <div className="flex items-center gap-1.5 pl-1 border-l border-border/70">
                    <span className="hidden md:inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg bg-secondary/70 border border-border/70">
                      <User className="h-3.5 w-3.5 text-primary" />
                      <span className="max-w-[110px] truncate">
                        {authUser.name}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={handleLogout}
                      title={locale === "pt" ? "Sair da conta" : "Sign out"}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-destructive hover:bg-secondary/70 transition-colors"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">
                        {locale === "pt" ? "Sair" : "Logout"}
                      </span>
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => navigate("/login")}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold gradient-primary text-white shadow-sm transition-opacity hover:opacity-95"
                  >
                    <LogIn className="h-3.5 w-3.5" />
                    <span>{locale === "pt" ? "Entrar" : "Sign In"}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Mobile & Tablet Horizontal Journey Bar */}
            <div className="flex lg:hidden items-center gap-1.5 overflow-x-auto px-4 py-2 border-t border-border/60 bg-secondary/30 no-scrollbar">
              {PIPELINE_STEPS.map((step) => {
                const Icon = step.icon;
                const isActive = location.pathname === step.path;
                return (
                  <button
                    key={step.path}
                    type="button"
                    onClick={() => navigate(step.path)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-all ${
                      isActive
                        ? "gradient-primary text-white shadow-sm"
                        : "bg-card/80 text-muted-foreground border border-border/60"
                    }`}
                  >
                    <span className="text-[10px] font-mono opacity-75">
                      {step.stepNum}
                    </span>
                    <Icon className="h-3 w-3 shrink-0" />
                    <span>{locale === "pt" ? step.labelPt : step.labelEn}</span>
                  </button>
                );
              })}
            </div>
          </header>

          <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
