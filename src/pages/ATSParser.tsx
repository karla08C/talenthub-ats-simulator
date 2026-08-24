import { useState, useRef, useCallback } from "react";
import { AppLayout } from "@/components/AppLayout";
import { ExpertTip } from "@/components/ExpertTip";
import { useLanguage } from "@/i18n/LanguageContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Upload,
  FileText,
  AlertTriangle,
  CheckCircle,
  FileSearch,
  Loader2,
} from "lucide-react";
import type { TranslationKey } from "@/i18n/translations";
import type { PDFTextItem } from "@/lib/pdf.types";
import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.mjs",
  import.meta.url
).toString();

async function extractTextFromPDF(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    // Properly cast to PDFTextItem[] instead of using any
    const text = (content.items as PDFTextItem[])
      .map((item) => item.str)
      .join(" ");
    pages.push(text);
  }
  return pages.join("\n\n");
}

async function extractTextFromFile(file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext === "pdf") {
    return extractTextFromPDF(file);
  }
  // txt or other text files
  return file.text();
}

export default function ATSParser() {
  const { t } = useLanguage();
  const [resumeText, setResumeText] = useState("");
  const [parsed, setParsed] = useState(false);
  const [rawOutput, setRawOutput] = useState("");
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState("");
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sampleWarnings: { type: string; messageKey: TranslationKey }[] = [
    { type: "error", messageKey: "ats.warn1" },
    { type: "error", messageKey: "ats.warn2" },
    { type: "warning", messageKey: "ats.warn3" },
    { type: "success", messageKey: "ats.warn4" },
  ];

  const handleFile = useCallback(async (file: File) => {
    setUploading(true);
    setUploadError("");
    setFileName("");
    try {
      const text = await extractTextFromFile(file);
      if (text.trim()) {
        setResumeText(text);
        setFileName(file.name);
      } else {
        setUploadError(t("ats.uploadError"));
      }
    } catch {
      setUploadError(t("ats.uploadError"));
    } finally {
      setUploading(false);
    }
  }, [t]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleSimulate = () => {
    if (!resumeText.trim()) return;
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
          <ExpertTip tip={t("ats.tip")}>
            <h1 className="text-2xl font-bold tracking-tight">{t("ats.title")}</h1>
          </ExpertTip>
          <p className="text-muted-foreground">{t("ats.subtitle")}</p>
        </div>

        {!parsed ? (
          <div className="space-y-4">
            {/* Upload area with drag & drop */}
            <div
              className="border-2 border-dashed rounded-xl p-10 text-center bg-card hover:border-primary/40 transition-colors cursor-pointer"
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
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                  {uploading ? (
                    <Loader2 className="h-6 w-6 text-primary animate-spin" />
                  ) : (
                    <Upload className="h-6 w-6 text-primary animate-pulse-soft" />
                  )}
                </div>
                <div>
                  <p className="font-medium">
                    {uploading ? t("ats.uploading") : t("ats.paste")}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t("ats.pasteHint")}
                  </p>
                </div>
                {!uploading && (
                  <Button variant="outline" size="sm" type="button" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                    <Upload className="h-3.5 w-3.5 mr-1.5" />
                    {t("ats.uploadBtn")}
                  </Button>
                )}
                {fileName && (
                  <p className="text-sm text-success font-medium flex items-center gap-1.5">
                    <CheckCircle className="h-3.5 w-3.5" />
                    {t("ats.fileLoaded")} {fileName}
                  </p>
                )}
                {uploadError && (
                  <p className="text-sm text-destructive font-medium flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    {uploadError}
                  </p>
                )}
              </div>
            </div>

            <p className="text-xs text-muted-foreground text-center">{t("ats.or")}</p>

            <Textarea
              placeholder={t("ats.placeholder")}
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              className="min-h-[200px] text-sm"
            />

            <Button onClick={handleSimulate} disabled={!resumeText.trim() || uploading} className="w-full">
              <FileSearch className="h-4 w-4 mr-2" />
              {t("ats.simulate")}
            </Button>
          </div>
        ) : (
          <div className="space-y-6 animate-slide-up">
            <div className="space-y-3">
              <h2 className="text-lg font-semibold">{t("ats.diagnosis")}</h2>
              <div className="grid gap-2">
                {sampleWarnings.map((w, i) => (
                  <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border ${
                    w.type === "error" ? "bg-destructive/5 border-destructive/20"
                      : w.type === "warning" ? "bg-warning/5 border-warning/20"
                      : "bg-success/5 border-success/20"
                  }`}>
                    {w.type === "error" ? (
                      <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                    ) : w.type === "warning" ? (
                      <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                    ) : (
                      <CheckCircle className="h-4 w-4 text-success shrink-0 mt-0.5" />
                    )}
                    <p className="text-sm">{t(w.messageKey)}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <ExpertTip tip={t("ats.rawTip")}>
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  {t("ats.rawTitle")}
                </h2>
              </ExpertTip>
              <div className="bg-secondary/60 rounded-xl p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap max-h-[400px] overflow-auto border">
                {rawOutput}
              </div>
            </div>

            <Button variant="outline" onClick={() => { setParsed(false); setResumeText(""); setFileName(""); }}>
              {t("ats.tryAnother")}
            </Button>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
