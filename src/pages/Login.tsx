import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sparkles,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";

export const AUTH_USER_STORAGE_KEY = "talenthub_auth_user_v1";

export interface AuthUserSession {
  name: string;
  email: string;
  loggedAt: string;
}

export function getStoredAuthUser(): AuthUserSession | null {
  try {
    const raw = localStorage.getItem(AUTH_USER_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthUserSession;
  } catch {
    return null;
  }
}

export default function Login() {
  const { locale } = useLanguage();
  const navigate = useNavigate();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanEmail = email.trim();
    const cleanPass = password.trim();

    if (!cleanEmail || !cleanEmail.includes("@")) {
      setError(
        locale === "pt"
          ? "Informe um endereço de e-mail válido."
          : "Please enter a valid email address."
      );
      return;
    }

    if (cleanPass.length < 4) {
      setError(
        locale === "pt"
          ? "A senha deve ter pelo menos 4 caracteres."
          : "Password must be at least 4 characters."
      );
      return;
    }

    const displayName =
      mode === "register" && name.trim()
        ? name.trim()
        : cleanEmail
            .split("@")[0]
            .replace(/[._-]+/g, " ")
            .replace(/\b\w/g, (c) => c.toUpperCase());

    const session: AuthUserSession = {
      name: displayName,
      email: cleanEmail,
      loggedAt: new Date().toISOString(),
    };

    localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(session));
    navigate("/");
  };

  const handleDemoLogin = () => {
    const demoSession: AuthUserSession = {
      name: "Carla Mendes",
      email: "carla.mendes@talenthub.ai",
      loggedAt: new Date().toISOString(),
    };
    localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(demoSession));
    navigate("/");
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* Top Signature Brand Accent Line */}
      <div
        className="h-1 w-full shrink-0"
        style={{
          background:
            "linear-gradient(90deg, #1D3ECF 0%, #B04EB8 50%, #E6AF00 85%, #D7F7E1 100%)",
        }}
      />

      {/* Minimal Top Bar */}
      <header className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="gradient-primary flex h-9 w-9 items-center justify-center rounded-xl shadow-sm">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-display font-bold tracking-tight">
                TalentHub
              </span>
              <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-[#B04EB8]/15 text-[#B04EB8] dark:text-[#E28CE8] border border-[#B04EB8]/30">
                AI
              </span>
            </div>
            <span className="text-[11px] text-muted-foreground">
              {locale === "pt"
                ? "Simulador ATS e Copiloto de Carreira"
                : "ATS Simulator & Career Copilot"}
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <LanguageSwitcher />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 rounded-2xl border border-border/80 bg-card shadow-card overflow-hidden">
          {/* Left Editorial Branding Panel (5 cols) */}
          <div className="lg:col-span-5 gradient-hero text-white p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden">
            <div
              className="pointer-events-none absolute -right-12 -bottom-12 h-44 w-44 rounded-full opacity-25 blur-2xl"
              style={{
                background: "linear-gradient(135deg, #B04EB8 0%, #E6AF00 100%)",
              }}
            />

            <div className="space-y-4 relative z-10">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 border border-white/20 px-3 py-1 text-[11px] font-mono uppercase tracking-wider">
                <ShieldCheck className="h-3.5 w-3.5 text-[#D7F7E1]" />
                {locale === "pt" ? "Acesso do Candidato" : "Candidate Portal"}
              </span>

              <h1 className="text-2xl sm:text-3xl font-display font-extrabold tracking-tight leading-tight">
                {locale === "pt"
                  ? "Domine a triagem ATS e prepare sua entrevista."
                  : "Master ATS screening and ace your interview."}
              </h1>

              <p className="text-xs sm:text-sm text-white/80 leading-relaxed">
                {locale === "pt"
                  ? "Sincronize suas análises de currículo, versões salvas por vaga e histórico de simulados de voz em um só lugar."
                  : "Sync your resume diagnostics, job-tailored versions, and voice interview simulations in one workspace."}
              </p>
            </div>

            <div className="space-y-2.5 pt-6 relative z-10 border-t border-white/15 mt-6">
              {[
                locale === "pt"
                  ? "Diagnóstico ATS determinístico de PDF e TXT"
                  : "Deterministic PDF & TXT ATS diagnostics",
                locale === "pt"
                  ? "Match de vagas por link com reescrita STAR"
                  : "URL job matching with STAR bullet rewrites",
                locale === "pt"
                  ? "Simulador de entrevista por voz em tempo real"
                  : "Real-time AI voice interview simulator",
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 text-xs text-white/90"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 text-[#D7F7E1] shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Form Panel (7 cols) */}
          <div className="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-center space-y-6">
            <div className="flex items-center justify-between border-b border-border/80 pb-4">
              <div>
                <h2 className="text-xl font-display font-bold">
                  {mode === "login"
                    ? locale === "pt"
                      ? "Entrar na sua conta"
                      : "Sign in to your account"
                    : locale === "pt"
                    ? "Criar nova conta"
                    : "Create your account"}
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {mode === "login"
                    ? locale === "pt"
                      ? "Insira suas credenciais ou use o acesso rápido de demonstração"
                      : "Enter your credentials or use the quick demo login"
                    : locale === "pt"
                    ? "Preencha seus dados básicos para iniciar sua jornada"
                    : "Fill in your basic details to start your journey"}
                </p>
              </div>

              <div className="flex rounded-lg bg-secondary/70 p-1 border border-border/60 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setMode("login");
                    setError(null);
                  }}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                    mode === "login"
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {locale === "pt" ? "Entrar" : "Sign In"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode("register");
                    setError(null);
                  }}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                    mode === "register"
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {locale === "pt" ? "Cadastrar" : "Register"}
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "register" && (
                <div className="space-y-1.5">
                  <Label htmlFor="login-name" className="text-xs font-semibold">
                    {locale === "pt" ? "Nome completo" : "Full name"}
                  </Label>
                  <div className="relative">
                    <User className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                    <Input
                      id="login-name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={
                        locale === "pt" ? "Ex: Carla Mendes" : "E.g., Carla Mendes"
                      }
                      className="pl-9 h-10 text-sm"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="login-email" className="text-xs font-semibold">
                  {locale === "pt" ? "E-mail profissional" : "Email address"}
                </Label>
                <div className="relative">
                  <Mail className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    id="login-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="voce@exemplo.com"
                    className="pl-9 h-10 text-sm"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="login-password"
                  className="text-xs font-semibold"
                >
                  {locale === "pt" ? "Senha" : "Password"}
                </Label>
                <div className="relative">
                  <Lock className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pl-9 pr-9 h-10 text-sm"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label="Alternar visibilidade da senha"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <div className="rounded-lg border palette-pill-blush px-3 py-2 text-xs font-medium">
                  {error}
                </div>
              )}

              <div className="pt-1 space-y-2.5">
                <Button
                  type="submit"
                  className="w-full h-10 gradient-primary text-white border-0 font-semibold shadow-sm"
                >
                  {mode === "login"
                    ? locale === "pt"
                      ? "Entrar na Plataforma"
                      : "Sign In to Platform"
                    : locale === "pt"
                    ? "Criar Conta e Acessar"
                    : "Create Account & Continue"}
                  <ArrowRight className="h-4 w-4 ml-1.5" />
                </Button>

                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleDemoLogin}
                  className="w-full h-10 text-xs font-semibold border border-border/70"
                >
                  <Sparkles className="h-3.5 w-3.5 mr-1.5 text-[#B04EB8]" />
                  {locale === "pt"
                    ? "Acesso Rápido Demo (1-Clique)"
                    : "Quick Demo Access (1-Click)"}
                </Button>
              </div>
            </form>

            <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {locale === "pt"
                  ? "Seus dados ficam salvos localmente no seu navegador."
                  : "Your data stays stored locally in your browser."}
              </span>
              <Link
                to="/"
                className="font-semibold text-primary hover:underline shrink-0 ml-2"
              >
                {locale === "pt" ? "Voltar ao Painel" : "Back to Dashboard"}
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
