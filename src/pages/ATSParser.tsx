import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { ExpertTip } from "@/components/ExpertTip";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Upload,
  FileText,
  AlertTriangle,
  CheckCircle,
  FileSearch,
} from "lucide-react";

const sampleWarnings = [
  { type: "error", message: "Detectada formatação em duas colunas — robôs ATS podem misturar o conteúdo." },
  { type: "error", message: "Ícones ou gráficos detectados — ATS ignora elementos visuais." },
  { type: "warning", message: "Cabeçalho com imagem — pode ocultar informações de contato." },
  { type: "success", message: "Seções bem definidas: Experiência, Formação, Habilidades." },
];

export default function ATSParser() {
  const [resumeText, setResumeText] = useState("");
  const [parsed, setParsed] = useState(false);
  const [rawOutput, setRawOutput] = useState("");

  const handleSimulate = () => {
    if (!resumeText.trim()) return;

    // Simulate ATS raw text extraction
    const lines = resumeText.split("\n").filter((l) => l.trim());
    const raw = lines
      .map((line) => line.replace(/[^\w\sáàãâéêíóôõúçÁÀÃÂÉÊÍÓÔÕÚÇ.,;:\-()/@]/g, "").trim())
      .filter(Boolean)
      .join("\n");

    setRawOutput(raw);
    setParsed(true);
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
        <div className="space-y-1">
          <ExpertTip tip="Sistemas ATS como Gupy, Solides e Indeed extraem apenas texto bruto. Formatação rica, colunas duplas e gráficos são ignorados ou causam erros.">
            <h1 className="text-2xl font-bold tracking-tight">ATS Parser Simulator</h1>
          </ExpertTip>
          <p className="text-muted-foreground">
            Veja como um robô ATS lê seu currículo e identifique problemas.
          </p>
        </div>

        {!parsed ? (
          <div className="space-y-4">
            {/* Upload area */}
            <div className="border-2 border-dashed rounded-xl p-10 text-center bg-card hover:border-primary/40 transition-colors">
              <div className="flex flex-col items-center gap-3">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                  <Upload className="h-6 w-6 text-primary animate-pulse-soft" />
                </div>
                <div>
                  <p className="font-medium">Cole o texto do seu currículo abaixo</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Copie e cole o conteúdo do seu PDF/DOCX para simular a leitura ATS
                  </p>
                </div>
              </div>
            </div>

            <Textarea
              placeholder="Cole aqui o texto completo do seu currículo..."
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              className="min-h-[200px] text-sm"
            />

            <Button onClick={handleSimulate} disabled={!resumeText.trim()} className="w-full">
              <FileSearch className="h-4 w-4 mr-2" />
              Simular Leitura ATS
            </Button>
          </div>
        ) : (
          <div className="space-y-6 animate-slide-up">
            {/* Warnings */}
            <div className="space-y-3">
              <h2 className="text-lg font-semibold">Diagnóstico</h2>
              <div className="grid gap-2">
                {sampleWarnings.map((w, i) => (
                  <div
                    key={i}
                    className={`flex items-start gap-3 p-3 rounded-lg border ${
                      w.type === "error"
                        ? "bg-destructive/5 border-destructive/20"
                        : w.type === "warning"
                        ? "bg-warning/5 border-warning/20"
                        : "bg-success/5 border-success/20"
                    }`}
                  >
                    {w.type === "error" ? (
                      <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                    ) : w.type === "warning" ? (
                      <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                    ) : (
                      <CheckCircle className="h-4 w-4 text-success shrink-0 mt-0.5" />
                    )}
                    <p className="text-sm">{w.message}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Raw output */}
            <div className="space-y-3">
              <ExpertTip tip="Este é o texto bruto que o ATS extrai. Se parecer desorganizado, seu currículo provavelmente será descartado.">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Saída Raw Text (como o ATS vê)
                </h2>
              </ExpertTip>
              <div className="bg-secondary/60 rounded-xl p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap max-h-[400px] overflow-auto border">
                {rawOutput}
              </div>
            </div>

            <Button variant="outline" onClick={() => { setParsed(false); setResumeText(""); }}>
              Testar outro currículo
            </Button>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
