import { useState, useMemo } from "react";
import { AppLayout } from "@/components/AppLayout";
import { ExpertTip } from "@/components/ExpertTip";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Target, Search, CheckCircle, XCircle } from "lucide-react";

function extractKeywords(text: string): string[] {
  const stopwords = new Set([
    "e", "o", "a", "os", "as", "de", "do", "da", "dos", "das", "em", "no", "na",
    "nos", "nas", "um", "uma", "uns", "umas", "para", "com", "por", "que", "se",
    "ou", "ao", "aos", "à", "às", "seu", "sua", "seus", "suas", "ter", "ser",
    "estar", "como", "mais", "muito", "já", "também", "entre", "sobre", "até",
    "the", "and", "or", "in", "of", "to", "for", "with", "on", "at", "is", "are",
    "was", "were", "be", "been", "being", "have", "has", "had", "do", "does", "did",
    "will", "would", "could", "should", "may", "can", "this", "that", "these", "those",
    "from", "not", "but", "all", "any", "each", "every",
  ]);

  const words = text
    .toLowerCase()
    .replace(/[^\w\sáàãâéêíóôõúçÁÀÃÂÉÊÍÓÔÕÚÇ]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stopwords.has(w));

  const freq = new Map<string, number>();
  words.forEach((w) => freq.set(w, (freq.get(w) || 0) + 1));

  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30)
    .map(([w]) => w);
}

export default function KeywordMatcher() {
  const [jobDescription, setJobDescription] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [analyzed, setAnalyzed] = useState(false);

  const analysis = useMemo(() => {
    if (!analyzed) return null;

    const jobKeywords = extractKeywords(jobDescription);
    const resumeLower = resumeText.toLowerCase();

    const matched = jobKeywords.filter((kw) => resumeLower.includes(kw));
    const missing = jobKeywords.filter((kw) => !resumeLower.includes(kw));
    const matchRate = jobKeywords.length > 0 ? Math.round((matched.length / jobKeywords.length) * 100) : 0;

    return { jobKeywords, matched, missing, matchRate };
  }, [analyzed, jobDescription, resumeText]);

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
        <div className="space-y-1">
          <ExpertTip tip="A Gupy utiliza NLP para ranquear candidatos. Quanto mais palavras-chave da vaga estiverem no seu currículo, maior sua pontuação.">
            <h1 className="text-2xl font-bold tracking-tight">Keyword Matcher</h1>
          </ExpertTip>
          <p className="text-muted-foreground">
            Compare seu currículo com a descrição da vaga e encontre gaps.
          </p>
        </div>

        {!analyzed ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Descrição da Vaga</label>
                <Textarea
                  placeholder="Cole a descrição completa da vaga aqui..."
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  className="min-h-[240px] text-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Seu Currículo</label>
                <Textarea
                  placeholder="Cole o texto do seu currículo aqui..."
                  value={resumeText}
                  onChange={(e) => setResumeText(e.target.value)}
                  className="min-h-[240px] text-sm"
                />
              </div>
            </div>

            <Button
              onClick={() => setAnalyzed(true)}
              disabled={!jobDescription.trim() || !resumeText.trim()}
              className="w-full"
            >
              <Search className="h-4 w-4 mr-2" />
              Analisar Compatibilidade
            </Button>
          </div>
        ) : analysis ? (
          <div className="space-y-6 animate-slide-up">
            {/* Match Rate */}
            <div className="bg-card rounded-xl p-6 shadow-card border text-center">
              <p className="text-sm text-muted-foreground font-medium mb-1">Taxa de Compatibilidade</p>
              <p className={`text-5xl font-bold ${
                analysis.matchRate >= 70 ? "text-success" : analysis.matchRate >= 40 ? "text-warning" : "text-destructive"
              }`}>
                {analysis.matchRate}%
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                {analysis.matched.length} de {analysis.jobKeywords.length} palavras-chave encontradas
              </p>
            </div>

            {/* Keywords */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-success" />
                  Presentes ({analysis.matched.length})
                </h3>
                <div className="flex flex-wrap gap-2">
                  {analysis.matched.map((kw) => (
                    <Badge key={kw} className="bg-success/10 text-success border-success/20 hover:bg-success/20">
                      {kw}
                    </Badge>
                  ))}
                  {analysis.matched.length === 0 && (
                    <p className="text-sm text-muted-foreground">Nenhuma palavra-chave encontrada.</p>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-destructive" />
                  Ausentes ({analysis.missing.length})
                </h3>
                <div className="flex flex-wrap gap-2">
                  {analysis.missing.map((kw) => (
                    <Badge key={kw} variant="destructive" className="bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20">
                      {kw}
                    </Badge>
                  ))}
                  {analysis.missing.length === 0 && (
                    <p className="text-sm text-muted-foreground">Todas as palavras-chave estão presentes! 🎉</p>
                  )}
                </div>
              </div>
            </div>

            <Button variant="outline" onClick={() => setAnalyzed(false)}>
              Nova análise
            </Button>
          </div>
        ) : null}
      </div>
    </AppLayout>
  );
}
