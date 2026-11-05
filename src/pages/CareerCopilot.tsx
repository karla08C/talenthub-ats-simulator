import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { ExpertTip } from "@/components/ExpertTip";
import { ScoreGauge } from "@/components/ScoreGauge";
import { useLanguage } from "@/i18n/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  MessageSquare,
  FolderKanban,
  Copy,
  Check,
  Plus,
  Trash2,
  ArrowUpRight,
  Sparkles,
  ShieldAlert,
  CheckCircle2,
  HelpCircle,
  Play,
  RotateCcw,
} from "lucide-react";
import {
  generateCareerPrepAssets,
  evaluateInterviewAnswer,
  type InterviewQuestionItem,
  type VoiceInterviewFeedback,
} from "@/lib/careerCopilotEngine";
import {
  RESUME_BUILDER_STORAGE_KEY,
  calculateBuilderScores,
  type ResumeDraftData,
} from "@/pages/ResumeBuilder";

export const SAVED_VERSIONS_STORAGE_KEY = "talenthub_saved_resume_versions_v1";
export const LAST_MATCH_CONTEXT_KEY = "talenthub_last_match_context";

export type ApplicationStatus = "saved" | "applied" | "interview" | "offer";

export interface SavedResumeVersion {
  id: string;
  versionName: string;
  company: string;
  createdAt: string;
  atsScore: number;
  baselineScore?: number;
  status: ApplicationStatus;
  draft: ResumeDraftData;
}

export interface LastMatchContext {
  matchedSkills: string[];
  missingSkills: string[];
  jobTitle?: string;
}

export default function CareerCopilot() {
  const { t, locale } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  const initialTab = location.search.includes("tab=voice")
    ? "voice"
    : "voice";
  const [activeTab, setActiveTab] = useState<string>(initialTab);

  const [targetRole, setTargetRole] = useState(
    locale === "pt"
      ? "Engenheiro(a) de Software Full Stack"
      : "Full Stack Software Engineer"
  );
  const [candidateName, setCandidateName] = useState("Carla Mendes");
  const [matchedSkills, setMatchedSkills] = useState<string[]>([
    "TypeScript",
    "React",
    "Node.js",
    "PostgreSQL",
    "Docker",
  ]);
  const [missingSkills, setMissingSkills] = useState<string[]>([
    "Kubernetes",
    "GraphQL",
    "CI/CD",
  ]);
  const [topResult, setTopResult] = useState(
    locale === "pt"
      ? "redução de 42% na latência da API e suporte a 250 mil usuários ativos"
      : "reducing API latency by 42% across 250k+ active users"
  );

  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Voice Interview Simulator State (Web Speech API)
  const [selectedQuestionIdx, setSelectedQuestionIdx] = useState(0);
  const [answerTranscript, setAnswerTranscript] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [speechSupported, setSpeechSupported] = useState(true);
  const recognitionRef = useRef<{
    stop: () => void;
    start: () => void;
  } | null>(null);

  // Versions & Kanban state
  const [versions, setVersions] = useState<SavedResumeVersion[]>(() => {
    try {
      const raw = localStorage.getItem(SAVED_VERSIONS_STORAGE_KEY);
      if (raw) return JSON.parse(raw) as SavedResumeVersion[];
    } catch {
      // ignore
    }
    return [];
  });
  const [newVersionName, setNewVersionName] = useState("");
  const [newCompany, setNewCompany] = useState("");
  const [loadedVersionId, setLoadedVersionId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | ApplicationStatus>(
    "all"
  );
  const [mockSessionScores, setMockSessionScores] = useState<
    Record<string, { score: number; wpm: number; fillers: number }>
  >({});

  // Load context from ResumeBuilder and KeywordMatcher if available
  useEffect(() => {
    try {
      const savedDraftRaw = localStorage.getItem(RESUME_BUILDER_STORAGE_KEY);
      if (savedDraftRaw) {
        const draft = JSON.parse(savedDraftRaw) as ResumeDraftData;
        if (draft.personalInfo?.name) {
          setCandidateName(draft.personalInfo.name);
        }
        const firstExp = draft.experiences?.[0];
        if (firstExp?.role) {
          setTargetRole(firstExp.role);
        }
        if (firstExp?.result) {
          setTopResult(firstExp.result);
        }
        if (draft.personalInfo?.skills) {
          const parsedSkills = draft.personalInfo.skills
            .split(/[,;|]+/)
            .map((s) => s.trim())
            .filter(Boolean);
          if (parsedSkills.length > 0) {
            setMatchedSkills(parsedSkills.slice(0, 6));
          }
        }
      }

      const matchCtxRaw = sessionStorage.getItem(LAST_MATCH_CONTEXT_KEY);
      if (matchCtxRaw) {
        const ctx = JSON.parse(matchCtxRaw) as LastMatchContext;
        if (ctx.matchedSkills?.length) setMatchedSkills(ctx.matchedSkills);
        if (ctx.missingSkills?.length) setMissingSkills(ctx.missingSkills);
        if (ctx.jobTitle) setTargetRole(ctx.jobTitle);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    const win = window as unknown as {
      SpeechRecognition?: unknown;
      webkitSpeechRecognition?: unknown;
    };
    if (!win.SpeechRecognition && !win.webkitSpeechRecognition) {
      setSpeechSupported(false);
    }
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      recognitionRef.current?.stop();
    };
  }, []);

  useEffect(() => {
    if (!isRecording) return;
    const timer = setInterval(() => {
      setRecordingSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [isRecording]);

  useEffect(() => {
    localStorage.setItem(SAVED_VERSIONS_STORAGE_KEY, JSON.stringify(versions));
  }, [versions]);

  const prepAssets = useMemo(
    () =>
      generateCareerPrepAssets({
        candidateName,
        candidateRole: targetRole,
        matchedSkills,
        missingSkills,
        topQuantifiedResult: topResult,
      }),
    [candidateName, targetRole, matchedSkills, missingSkills, topResult]
  );

  const currentQuestion =
    prepAssets.questions[selectedQuestionIdx] || prepAssets.questions[0];

  const voiceFeedback = useMemo<VoiceInterviewFeedback | null>(() => {
    if (!currentQuestion || !answerTranscript.trim()) return null;
    return evaluateInterviewAnswer({
      question: currentQuestion,
      transcript: answerTranscript,
      targetSkills: [...matchedSkills, ...missingSkills],
      candidateRole: targetRole,
      recordingSeconds,
    });
  }, [
    currentQuestion,
    answerTranscript,
    matchedSkills,
    missingSkills,
    targetRole,
    recordingSeconds,
  ]);

  const mockReadinessSummary = useMemo(() => {
    const entries = Object.values(mockSessionScores);
    if (entries.length === 0) return null;
    const avgScore = Math.round(
      entries.reduce((acc, e) => acc + e.score, 0) / entries.length
    );
    const avgWpm = Math.round(
      entries.reduce((acc, e) => acc + e.wpm, 0) / entries.length
    );
    const totalFillers = entries.reduce((acc, e) => acc + e.fillers, 0);
    return {
      completedCount: entries.length,
      totalQuestions: prepAssets.questions.length,
      avgScore,
      avgWpm,
      totalFillers,
    };
  }, [mockSessionScores, prepAssets.questions.length]);

  const handleRecordMockStepAndNext = () => {
    if (!currentQuestion || !voiceFeedback) return;
    setMockSessionScores((prev) => ({
      ...prev,
      [currentQuestion.id]: {
        score: voiceFeedback.overallScore,
        wpm: voiceFeedback.estimatedWpm,
        fillers: voiceFeedback.totalFillers,
      },
    }));
    if (selectedQuestionIdx + 1 < prepAssets.questions.length) {
      setSelectedQuestionIdx((idx) => idx + 1);
      setAnswerTranscript("");
      setRecordingSeconds(0);
    }
  };

  const handleSpeakText = (textToSpeak: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = locale === "pt" ? "pt-BR" : "en-US";
    utterance.rate = 1.02;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  const handleStopSpeaking = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  };

  const handleToggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }

    const win = window as unknown as {
      SpeechRecognition?: new () => {
        lang: string;
        continuous: boolean;
        interimResults: boolean;
        onresult: (event: {
          resultIndex: number;
          results: {
            length: number;
            [idx: number]: { isFinal: boolean; 0: { transcript: string } };
          };
        }) => void;
        onerror: () => void;
        onend: () => void;
        start: () => void;
        stop: () => void;
      };
      webkitSpeechRecognition?: new () => {
        lang: string;
        continuous: boolean;
        interimResults: boolean;
        onresult: (event: {
          resultIndex: number;
          results: {
            length: number;
            [idx: number]: { isFinal: boolean; 0: { transcript: string } };
          };
        }) => void;
        onerror: () => void;
        onend: () => void;
        start: () => void;
        stop: () => void;
      };
    };

    const SpeechRec = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!SpeechRec) {
      setSpeechSupported(false);
      return;
    }

    handleStopSpeaking();
    const recognition = new SpeechRec();
    recognition.lang = locale === "pt" ? "pt-BR" : "en-US";
    recognition.continuous = true;
    recognition.interimResults = true;

    const baseText = answerTranscript ? `${answerTranscript.trim()} ` : "";

    recognition.onresult = (event) => {
      let sessionText = "";
      for (let i = 0; i < event.results.length; i++) {
        sessionText += event.results[i][0].transcript;
      }
      setAnswerTranscript(`${baseText}${sessionText}`.trim());
    };

    recognition.onerror = () => {
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recognition;
    setRecordingSeconds(0);
    setIsRecording(true);
    recognition.start();
  };

  const handleFillSampleAnswer = () => {
    const focusSkill =
      currentQuestion?.skillOrTopic === "Método STAR"
        ? matchedSkills[0] || "TypeScript"
        : currentQuestion?.skillOrTopic || "SQL";

    if (locale === "pt") {
      setAnswerTranscript(
        `No meu último projeto atuando como ${targetRole}, tínhamos um gargalo crítico no processamento das rotinas da área e precisávamos elevar a confiabilidade das entregas. Eu assumi a tarefa e implementei uma nova arquitetura automatizada utilizando ${focusSkill} e monitoramento de indicadores com ${
          matchedSkills[1] || "Power BI"
        }. Como resultado direto, reduzimos o tempo de execução em 42% e atendemos mais de 150 clientes internos sem falhas.`
      );
    } else {
      setAnswerTranscript(
        `In my recent project working as a ${targetRole}, we faced a critical bottleneck in our core workflow and needed to improve delivery reliability. I took ownership and implemented an automated solution using ${focusSkill} and real-time monitoring with ${
          matchedSkills[1] || "Docker"
        }. As a result, we reduced processing latency by 42% and supported 150k+ users with zero downtime.`
      );
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSaveCurrentVersion = () => {
    let draft: ResumeDraftData = {
      personalInfo: {
        name: candidateName,
        email: "carla.mendes@email.com",
        phone: "(11) 98765-4321",
        linkedin: "linkedin.com/in/carlamendes",
        summary: "",
        skills: matchedSkills.join(", "),
      },
      experiences: [
        {
          id: "1",
          company: newCompany || "Empresa",
          role: targetRole,
          period: "2023 - Atual",
          situation: "",
          task: "",
          action: "",
          result: topResult,
        },
      ],
      educations: [{ id: "1", institution: "", degree: "", period: "" }],
    };

    try {
      const savedDraftRaw = localStorage.getItem(RESUME_BUILDER_STORAGE_KEY);
      if (savedDraftRaw) {
        draft = JSON.parse(savedDraftRaw) as ResumeDraftData;
      }
    } catch {
      // use fallback draft
    }

    const scoreObj = calculateBuilderScores(
      draft.personalInfo,
      draft.experiences,
      draft.educations
    );

    const versionTitle =
      newVersionName.trim() ||
      `${targetRole} (${new Date().toLocaleDateString(locale === "pt" ? "pt-BR" : "en-US")})`;

    let baselineScore: number | undefined;
    try {
      const initialAts = sessionStorage.getItem("talenthub_last_ats_score");
      if (initialAts) baselineScore = Number(initialAts);
    } catch {
      // ignore
    }

    const newItem: SavedResumeVersion = {
      id:
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `v-${Date.now()}`,
      versionName: versionTitle,
      company: newCompany.trim() || "Geral",
      createdAt: new Date().toLocaleDateString(
        locale === "pt" ? "pt-BR" : "en-US"
      ),
      atsScore: scoreObj.totalScore,
      baselineScore,
      status: "saved",
      draft,
    };

    setVersions((prev) => [newItem, ...prev]);
    setNewVersionName("");
    setNewCompany("");
  };

  const handleLoadVersionIntoBuilder = (v: SavedResumeVersion) => {
    localStorage.setItem(RESUME_BUILDER_STORAGE_KEY, JSON.stringify(v.draft));
    setLoadedVersionId(v.id);
    setTimeout(() => {
      navigate("/resume-builder");
    }, 450);
  };

  const handleUpdateStatus = (id: string, status: ApplicationStatus) => {
    setVersions((prev) =>
      prev.map((v) => (v.id === id ? { ...v, status } : v))
    );
  };

  const handleDeleteVersion = (id: string) => {
    setVersions((prev) => prev.filter((v) => v.id !== id));
  };

  const getQuestionBadge = (q: InterviewQuestionItem) => {
    if (q.type === "technical") {
      return (
        <Badge className="bg-success/10 text-success border-success/25">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          {t("cc.type.technical")}
        </Badge>
      );
    }
    if (q.type === "gap_defense") {
      return (
        <Badge
          variant="destructive"
          className="bg-warning/15 text-warning border-warning/30"
        >
          <ShieldAlert className="h-3 w-3 mr-1" />
          {t("cc.type.gap_defense")}
        </Badge>
      );
    }
    return (
      <Badge variant="secondary">
        <HelpCircle className="h-3 w-3 mr-1" />
        {t("cc.type.behavioral_star")}
      </Badge>
    );
  };

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
        {/* Studio Page Header Banner */}
        <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-card">
          <div
            className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full opacity-15 blur-2xl"
            style={{
              background: "linear-gradient(135deg, #1D3ECF 0%, #B04EB8 100%)",
            }}
          />
          <div className="relative z-10 space-y-1.5">
            <div className="inline-flex items-center gap-2 rounded-full palette-pill-mint border px-2.5 py-0.5 text-[11px] font-mono font-semibold">
              <span>ETAPA 04 / 04</span>
              <span>·</span>
              <span>
                {locale === "pt"
                  ? "SIMULADOR DE VOZ IA, PITCH E KANBAN"
                  : "AI VOICE SIMULATOR, PITCH & KANBAN"}
              </span>
            </div>
            <ExpertTip tip={t("cc.tip")}>
              <h1 className="text-2xl sm:text-3xl font-display font-extrabold tracking-tight">
                {t("cc.title")}
              </h1>
            </ExpertTip>
            <p className="text-sm text-muted-foreground max-w-2xl">
              {t("cc.subtitle")}
            </p>
          </div>
        </div>

        {/* Context Bar */}
        <div className="bg-card rounded-2xl p-4 sm:p-5 border border-border/80 shadow-card grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              {t("cc.targetRole")}
            </label>
            <Input
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              className="h-9 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Hard Skills (Match)
            </label>
            <Input
              value={matchedSkills.join(", ")}
              onChange={(e) =>
                setMatchedSkills(
                  e.target.value
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean)
                )
              }
              className="h-9 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Gaps da Vaga (Para Defender)
            </label>
            <Input
              value={missingSkills.join(", ")}
              onChange={(e) =>
                setMissingSkills(
                  e.target.value
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean)
                )
              }
              className="h-9 text-sm"
            />
          </div>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <TabsList className="grid w-full grid-cols-1 sm:grid-cols-4 h-auto gap-1 p-1">
            <TabsTrigger value="voice" className="py-2 font-semibold">
              <Mic className="h-3.5 w-3.5 mr-1.5 text-primary" />
              {locale === "pt"
                ? "Simulador de Voz (IA)"
                : "Voice Simulator (AI)"}
            </TabsTrigger>
            <TabsTrigger value="interview" className="py-2">
              {t("cc.tab.interview")}
            </TabsTrigger>
            <TabsTrigger value="pitches" className="py-2">
              {t("cc.tab.pitches")}
            </TabsTrigger>
            <TabsTrigger value="versions" className="py-2">
              {t("cc.tab.versions")} ({versions.length})
            </TabsTrigger>
          </TabsList>

          {/* TAB 0: Interactive Voice Interview Simulator (Web Speech API + Real-Time AI Evaluation) */}
          <TabsContent value="voice" className="space-y-6">
            <div className="bg-card rounded-xl p-6 border shadow-card space-y-5">
              {/* Question Selector & TTS Controls */}
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b pb-4">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className="bg-primary/15 text-primary border-primary/30">
                      {locale === "pt"
                        ? `Pergunta ${selectedQuestionIdx + 1} de ${prepAssets.questions.length}`
                        : `Question ${selectedQuestionIdx + 1} of ${prepAssets.questions.length}`}
                    </Badge>
                    {currentQuestion && getQuestionBadge(currentQuestion)}
                    {currentQuestion && (
                      <span className="text-xs font-mono font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded">
                        {currentQuestion.skillOrTopic}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {locale === "pt"
                      ? "Ouça a pergunta em voz alta (Web Speech TTS), grave sua resposta no microfone e receba avaliação STAR em tempo real"
                      : "Listen to the AI question aloud (Web Speech TTS), record your spoken answer, and get real-time STAR feedback"}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {prepAssets.questions.map((q, idx) => (
                    <Button
                      key={q.id}
                      type="button"
                      size="sm"
                      variant={
                        selectedQuestionIdx === idx ? "default" : "outline"
                      }
                      onClick={() => {
                        handleStopSpeaking();
                        if (isRecording) handleToggleRecording();
                        setSelectedQuestionIdx(idx);
                        setAnswerTranscript("");
                      }}
                      className="h-8 text-xs px-2.5"
                    >
                      #{idx + 1}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Active Question Display + AI Voice Reader */}
              {currentQuestion && (
                <div className="rounded-xl bg-primary/5 border border-primary/20 p-5 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <p className="text-base font-semibold leading-relaxed">
                      "
                      {locale === "pt"
                        ? currentQuestion.questionPt
                        : currentQuestion.questionEn}
                      "
                    </p>
                    <div className="flex items-center gap-2 shrink-0">
                      {isSpeaking ? (
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={handleStopSpeaking}
                        >
                          <VolumeX className="h-4 w-4 mr-1.5 animate-pulse" />
                          {locale === "pt" ? "Parar Áudio" : "Stop Audio"}
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          variant="default"
                          size="sm"
                          onClick={() =>
                            handleSpeakText(
                              locale === "pt"
                                ? currentQuestion.questionPt
                                : currentQuestion.questionEn
                            )
                          }
                        >
                          <Volume2 className="h-4 w-4 mr-1.5" />
                          {locale === "pt"
                            ? "Ouvir Pergunta (IA)"
                            : "Listen to Question (AI)"}
                        </Button>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span>
                      {locale === "pt"
                        ? currentQuestion.tipPt
                        : currentQuestion.tipEn}
                    </span>
                  </p>
                </div>
              )}

              {/* Microphone Recording Bar & Live Transcription */}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant={isRecording ? "destructive" : "default"}
                      onClick={handleToggleRecording}
                      disabled={!speechSupported}
                      className="font-semibold"
                    >
                      {isRecording ? (
                        <>
                          <MicOff className="h-4 w-4 mr-2 animate-pulse" />
                          {locale === "pt"
                            ? `Parar Gravação (${recordingSeconds}s)`
                            : `Stop Recording (${recordingSeconds}s)`}
                        </>
                      ) : (
                        <>
                          <Mic className="h-4 w-4 mr-2" />
                          {locale === "pt"
                            ? "Responder por Voz (Microfone)"
                            : "Answer by Voice (Microphone)"}
                        </>
                      )}
                    </Button>

                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={handleFillSampleAnswer}
                    >
                      <Play className="h-3.5 w-3.5 mr-1.5 text-primary" />
                      {locale === "pt"
                        ? "Testar com Resposta Exemplo"
                        : "Test with Sample Answer"}
                    </Button>

                    {answerTranscript && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setAnswerTranscript("")}
                      >
                        <RotateCcw className="h-3.5 w-3.5 mr-1" />
                        {locale === "pt" ? "Limpar" : "Clear"}
                      </Button>
                    )}
                  </div>

                  {isRecording && (
                    <Badge
                      variant="destructive"
                      className="animate-pulse text-xs"
                    >
                      ●{" "}
                      {locale === "pt"
                        ? "Ouvindo e transcrevendo em tempo real..."
                        : "Listening & transcribing in real time..."}
                    </Badge>
                  )}
                </div>

                {!speechSupported && (
                  <p className="text-xs text-warning">
                    {locale === "pt"
                      ? "Nota: Seu navegador atual não expõe a API nativa SpeechRecognition. Você pode digitar ou colar sua resposta abaixo para receber o mesmo feedback em tempo real da IA."
                      : "Note: Your browser does not expose native SpeechRecognition. You can type or paste your answer below for real-time AI feedback."}
                  </p>
                )}

                <Textarea
                  value={answerTranscript}
                  onChange={(e) => setAnswerTranscript(e.target.value)}
                  placeholder={
                    locale === "pt"
                      ? "Clique em 'Responder por Voz' e fale naturalmente no microfone, ou digite sua resposta aqui seguindo o método STAR (Situação, Tarefa, Ação e Resultado com métricas)..."
                      : "Click 'Answer by Voice' and speak into your microphone, or type your response here following the STAR method..."
                  }
                  className="min-h-[130px] text-sm leading-relaxed"
                />
              </div>

              {/* Real-Time AI Evaluation Dashboard */}
              {voiceFeedback && (
                <div className="space-y-4 pt-3 border-t animate-fade-in">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-muted/25 rounded-2xl p-5 border border-border/80 items-center">
                    <div className="flex flex-col items-center justify-center border-b md:border-b-0 md:border-r pb-3 md:pb-0 md:pr-4">
                      <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground font-semibold mb-2">
                        {locale === "pt"
                          ? "Score da Resposta (IA)"
                          : "Answer Score (AI)"}
                      </p>
                      <ScoreGauge
                        score={voiceFeedback.overallScore}
                        size={125}
                      />
                      <p className="text-[11px] font-mono text-muted-foreground mt-2">
                        {voiceFeedback.wordCount}{" "}
                        {locale === "pt" ? "palavras faladas" : "words spoken"}{" "}
                        · {voiceFeedback.estimatedWpm} WPM
                      </p>
                      <div className="flex flex-wrap items-center justify-center gap-1.5 mt-2">
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                            voiceFeedback.paceAssessment === "ideal"
                              ? "palette-pill-mint"
                              : "bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-500/30"
                          }`}
                        >
                          {voiceFeedback.paceAssessment === "ideal"
                            ? locale === "pt"
                              ? "Ritmo Ideal (115-160 WPM)"
                              : "Ideal Pace (115-160 WPM)"
                            : voiceFeedback.paceAssessment === "fast"
                            ? locale === "pt"
                              ? "Ritmo Acelerado"
                              : "Fast Pace"
                            : locale === "pt"
                            ? "Ritmo Pausado"
                            : "Slow Pace"}
                        </span>
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                            voiceFeedback.totalFillers === 0
                              ? "palette-pill-mint"
                              : "palette-pill-blush"
                          }`}
                        >
                          {voiceFeedback.totalFillers === 0
                            ? locale === "pt"
                              ? "0 vícios de linguagem"
                              : "0 verbal fillers"
                            : locale === "pt"
                            ? `${voiceFeedback.totalFillers} vício(s) detectado(s)`
                            : `${voiceFeedback.totalFillers} filler(s) detected`}
                        </span>
                      </div>
                    </div>

                    <div className="md:col-span-2 space-y-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          {locale === "pt"
                            ? "Raio-X Estrutural STAR em Tempo Real"
                            : "Real-Time STAR Structure X-Ray"}
                        </p>
                        <Button
                          type="button"
                          size="sm"
                          onClick={handleRecordMockStepAndNext}
                          className="h-7 text-xs gradient-primary text-white border-0"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                          {selectedQuestionIdx + 1 < prepAssets.questions.length
                            ? locale === "pt"
                              ? "Registrar Nota no Simulado e Avançar"
                              : "Save Score to Mock Round & Next"
                            : locale === "pt"
                            ? "Concluir Rodada do Simulado"
                            : "Finish Mock Interview Round"}
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                        {[
                          {
                            key: "situation",
                            labelPt: "Situação",
                            labelEn: "Situation",
                            ok: voiceFeedback.starBreakdown.situation,
                          },
                          {
                            key: "task",
                            labelPt: "Tarefa",
                            labelEn: "Task",
                            ok: voiceFeedback.starBreakdown.task,
                          },
                          {
                            key: "action",
                            labelPt: "Ação (1ª p.)",
                            labelEn: "Action",
                            ok: voiceFeedback.starBreakdown.action,
                          },
                          {
                            key: "result",
                            labelPt: "Resultado",
                            labelEn: "Result",
                            ok: voiceFeedback.starBreakdown.result,
                          },
                          {
                            key: "metric",
                            labelPt: "Métrica (%)",
                            labelEn: "Metric (%)",
                            ok: voiceFeedback.starBreakdown.quantifiedMetric,
                          },
                        ].map((item) => (
                          <div
                            key={item.key}
                            className={`rounded-lg border p-2 text-center text-xs font-medium ${
                              item.ok
                                ? "bg-success/10 border-success/30 text-success"
                                : "bg-muted/40 border-border text-muted-foreground"
                            }`}
                          >
                            <div className="font-bold">
                              {item.ok ? "✓" : "○"}
                            </div>
                            <div>
                              {locale === "pt" ? item.labelPt : item.labelEn}
                            </div>
                          </div>
                        ))}
                      </div>
                      <Progress
                        value={voiceFeedback.overallScore}
                        className="h-2"
                      />
                    </div>
                  </div>

                  {/* Strengths & Improvements */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="rounded-lg border bg-success/5 border-success/20 p-4 space-y-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-success flex items-center gap-1.5">
                        <CheckCircle2 className="h-4 w-4" />
                        {locale === "pt"
                          ? "Pontos Fortes Detectados"
                          : "Detected Strengths"}
                      </h4>
                      <ul className="space-y-1.5 text-xs text-foreground">
                        {(locale === "pt"
                          ? voiceFeedback.strengthsPt
                          : voiceFeedback.strengthsEn
                        ).map((s, i) => (
                          <li key={i}>• {s}</li>
                        ))}
                        {voiceFeedback.strengthsPt.length === 0 && (
                          <li className="text-muted-foreground">
                            {locale === "pt"
                              ? "Continue desenvolvendo sua resposta para destravar os pontos fortes."
                              : "Keep expanding your answer to unlock strengths."}
                          </li>
                        )}
                      </ul>
                    </div>

                    <div className="rounded-lg border bg-warning/5 border-warning/25 p-4 space-y-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-warning flex items-center gap-1.5">
                        <Sparkles className="h-4 w-4" />
                        {locale === "pt"
                          ? "O Que Melhorar Agora"
                          : "How to Improve Right Now"}
                      </h4>
                      <ul className="space-y-1.5 text-xs text-foreground">
                        {(locale === "pt"
                          ? voiceFeedback.improvementsPt
                          : voiceFeedback.improvementsEn
                        ).map((imp, i) => (
                          <li key={i}>• {imp}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* AI Senior Model Answer */}
                  <div className="rounded-lg border bg-secondary/40 p-4 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-primary flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5" />
                        {locale === "pt"
                          ? "Exemplo de Resposta Nível Sênior (Padrão STAR 100%)"
                          : "Senior-Level Model Answer (100% STAR Standard)"}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() =>
                          handleSpeakText(
                            locale === "pt"
                              ? voiceFeedback.modelAnswerPt
                              : voiceFeedback.modelAnswerEn
                          )
                        }
                      >
                        <Volume2 className="h-3.5 w-3.5 mr-1 text-primary" />
                        {locale === "pt"
                          ? "Ouvir Resposta Modelo"
                          : "Listen to Model Answer"}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground italic leading-relaxed">
                      {locale === "pt"
                        ? voiceFeedback.modelAnswerPt
                        : voiceFeedback.modelAnswerEn}
                    </p>
                  </div>
                </div>
              )}

              {/* Consolidated Mock Interview Readiness Report */}
              {mockReadinessSummary && (
                <div className="rounded-2xl border border-[#B04EB8]/35 bg-card p-5 shadow-card space-y-3 animate-fade-in">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-wider text-[#B04EB8] font-semibold">
                        {locale === "pt"
                          ? "Relatório de Prontidão (Mock Interview)"
                          : "Mock Interview Readiness Report"}
                      </span>
                      <h4 className="text-sm font-display font-bold">
                        {locale === "pt"
                          ? `${mockReadinessSummary.completedCount} de ${mockReadinessSummary.totalQuestions} perguntas avaliadas na rodada`
                          : `${mockReadinessSummary.completedCount} of ${mockReadinessSummary.totalQuestions} questions evaluated in round`}
                      </h4>
                    </div>
                    <Badge className="font-mono text-xs palette-pill-mint border">
                      {locale === "pt"
                        ? `Média Geral: ${mockReadinessSummary.avgScore}/100`
                        : `Overall Avg: ${mockReadinessSummary.avgScore}/100`}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="rounded-xl bg-secondary/40 border p-3">
                      <span className="text-muted-foreground block">
                        {locale === "pt" ? "Nota Média STAR" : "Avg STAR Score"}
                      </span>
                      <span className="font-mono font-bold text-base text-primary">
                        {mockReadinessSummary.avgScore}/100
                      </span>
                    </div>
                    <div className="rounded-xl bg-secondary/40 border p-3">
                      <span className="text-muted-foreground block">
                        {locale === "pt" ? "Ritmo Médio" : "Average Pace"}
                      </span>
                      <span className="font-mono font-bold text-base">
                        {mockReadinessSummary.avgWpm} WPM
                      </span>
                    </div>
                    <div className="rounded-xl bg-secondary/40 border p-3">
                      <span className="text-muted-foreground block">
                        {locale === "pt"
                          ? "Total de Vícios Verbais"
                          : "Total Verbal Fillers"}
                      </span>
                      <span className="font-mono font-bold text-base">
                        {mockReadinessSummary.totalFillers}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          {/* TAB 1: Interview Script & Gap Defense (#3) */}
          <TabsContent value="interview" className="space-y-6">
            <div className="bg-card rounded-xl p-5 border shadow-card space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-semibold flex items-center gap-2">
                  <Mic className="h-4 w-4 text-primary" />
                  {t("cc.elevatorTitle")}
                </h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    handleCopy(
                      "elevator",
                      locale === "pt"
                        ? prepAssets.elevatorPitchPt
                        : prepAssets.elevatorPitchEn
                    )
                  }
                >
                  {copiedId === "elevator" ? (
                    <>
                      <Check className="h-3.5 w-3.5 mr-1.5 text-success" />
                      {t("kw.copied")}
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5 mr-1.5" />
                      {t("cc.copy")}
                    </>
                  )}
                </Button>
              </div>
              <div className="p-4 rounded-lg bg-secondary/50 border text-sm leading-relaxed">
                {locale === "pt"
                  ? prepAssets.elevatorPitchPt
                  : prepAssets.elevatorPitchEn}
              </div>
            </div>

            <div className="space-y-3">
              <h2 className="font-semibold text-lg">
                {t("cc.questionsTitle")}
              </h2>
              <div className="grid gap-3">
                {prepAssets.questions.map((q) => (
                  <div
                    key={q.id}
                    className="bg-card rounded-xl p-5 border shadow-card space-y-2.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      {getQuestionBadge(q)}
                      <span className="text-xs font-mono font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded">
                        {q.skillOrTopic}
                      </span>
                    </div>
                    <p className="font-semibold text-sm">
                      "{locale === "pt" ? q.questionPt : q.questionEn}"
                    </p>
                    <div className="p-3 rounded-lg bg-primary/5 border border-primary/15 text-xs text-muted-foreground leading-relaxed flex items-start gap-2">
                      <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <span>{locale === "pt" ? q.tipPt : q.tipEn}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* TAB 2: Recruiter LinkedIn Pitch & Cover Letter (#4) */}
          <TabsContent value="pitches" className="space-y-6">
            <div className="bg-card rounded-xl p-5 border shadow-card space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-semibold flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-primary" />
                  {t("cc.linkedinTitle")}
                </h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    handleCopy(
                      "linkedin",
                      locale === "pt"
                        ? prepAssets.linkedinPitchPt
                        : prepAssets.linkedinPitchEn
                    )
                  }
                >
                  {copiedId === "linkedin" ? (
                    <>
                      <Check className="h-3.5 w-3.5 mr-1.5 text-success" />
                      {t("kw.copied")}
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5 mr-1.5" />
                      {t("cc.copy")}
                    </>
                  )}
                </Button>
              </div>
              <Textarea
                readOnly
                value={
                  locale === "pt"
                    ? prepAssets.linkedinPitchPt
                    : prepAssets.linkedinPitchEn
                }
                className="min-h-[100px] text-sm bg-secondary/40"
              />
            </div>

            <div className="bg-card rounded-xl p-5 border shadow-card space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-semibold flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-success" />
                  {t("cc.coverLetterTitle")}
                </h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    handleCopy(
                      "coverletter",
                      locale === "pt"
                        ? prepAssets.coverLetterPt
                        : prepAssets.coverLetterEn
                    )
                  }
                >
                  {copiedId === "coverletter" ? (
                    <>
                      <Check className="h-3.5 w-3.5 mr-1.5 text-success" />
                      {t("kw.copied")}
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5 mr-1.5" />
                      {t("cc.copy")}
                    </>
                  )}
                </Button>
              </div>
              <Textarea
                readOnly
                value={
                  locale === "pt"
                    ? prepAssets.coverLetterPt
                    : prepAssets.coverLetterEn
                }
                className="min-h-[240px] text-sm bg-secondary/40 leading-relaxed"
              />
            </div>
          </TabsContent>

          {/* TAB 3: Resume Versions & Application Kanban (#5) */}
          <TabsContent value="versions" className="space-y-6">
            <div className="bg-card rounded-xl p-5 border shadow-card space-y-4">
              <h2 className="font-semibold flex items-center gap-2">
                <FolderKanban className="h-4 w-4 text-primary" />
                {t("cc.saveCurrentBtn")}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Input
                  placeholder={t("cc.versionNamePlaceholder")}
                  value={newVersionName}
                  onChange={(e) => setNewVersionName(e.target.value)}
                />
                <Input
                  placeholder={t("cc.companyPlaceholder")}
                  value={newCompany}
                  onChange={(e) => setNewCompany(e.target.value)}
                />
                <Button onClick={handleSaveCurrentVersion} className="w-full">
                  <Plus className="h-4 w-4 mr-1.5" />
                  {t("cc.saveCurrentBtn")}
                </Button>
              </div>
            </div>

            {versions.length === 0 ? (
              <div className="bg-card rounded-xl p-10 border text-center text-muted-foreground text-sm">
                {t("cc.noVersions")}
              </div>
            ) : (
              <div className="space-y-4">
                {/* Status Filter Bar */}
                <div className="flex flex-wrap items-center gap-2">
                  {(
                    ["all", "saved", "applied", "interview", "offer"] as const
                  ).map((st) => (
                    <Button
                      key={st}
                      type="button"
                      size="sm"
                      variant={statusFilter === st ? "default" : "outline"}
                      onClick={() => setStatusFilter(st)}
                      className="h-8 text-xs"
                    >
                      {st === "all"
                        ? locale === "pt"
                          ? `Todas (${versions.length})`
                          : `All (${versions.length})`
                        : `${t(`cc.status.${st}`)} (${
                            versions.filter((v) => v.status === st).length
                          })`}
                    </Button>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {versions
                    .filter(
                      (v) => statusFilter === "all" || v.status === statusFilter
                    )
                    .map((v) => {
                      const delta =
                        typeof v.baselineScore === "number"
                          ? v.atsScore - v.baselineScore
                          : null;
                      return (
                        <div
                          key={v.id}
                          className="bg-card rounded-xl p-5 border shadow-card space-y-4 flex flex-col justify-between"
                        >
                          <div className="space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h3 className="font-bold text-base">
                                  {v.versionName}
                                </h3>
                                <p className="text-xs text-muted-foreground">
                                  {v.company} • {v.createdAt}
                                </p>
                              </div>
                              <div className="flex flex-col items-end gap-1">
                                <Badge
                                  className={
                                    v.atsScore >= 75
                                      ? "bg-success/15 text-success border-success/30"
                                      : "bg-warning/15 text-warning border-warning/30"
                                  }
                                >
                                  ATS Score: {v.atsScore}/100
                                </Badge>
                                {delta !== null && delta > 0 && (
                                  <span className="text-[10px] font-mono font-semibold text-success">
                                    +{delta} pts vs. inicial ({v.baselineScore})
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Status Selector */}
                            <div className="flex flex-wrap gap-1.5 pt-2">
                              {(
                                [
                                  "saved",
                                  "applied",
                                  "interview",
                                  "offer",
                                ] as const
                              ).map((st) => (
                                <button
                                  key={st}
                                  type="button"
                                  onClick={() => handleUpdateStatus(v.id, st)}
                                  className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
                                    v.status === st
                                      ? "bg-primary text-primary-foreground border-primary font-semibold"
                                      : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
                                  }`}
                                >
                                  {t(`cc.status.${st}`)}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-3 border-t">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteVersion(v.id)}
                              className="text-muted-foreground hover:text-destructive h-8 px-2"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleLoadVersionIntoBuilder(v)}
                              className="h-8 text-xs"
                            >
                              {loadedVersionId === v.id ? (
                                <>
                                  <Check className="h-3.5 w-3.5 mr-1 text-success" />
                                  {t("cc.loadedSuccess")}
                                </>
                              ) : (
                                <>
                                  {t("cc.loadIntoBuilder")}
                                  <ArrowUpRight className="h-3.5 w-3.5 ml-1" />
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
