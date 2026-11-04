import * as pdfjsLib from "pdfjs-dist";

export interface PDFTextItem {
  str: string;
  transform: number[]; // [scaleX, skewY, skewX, scaleY, x, y]
  width: number;
  height: number;
  hasEOL?: boolean;
}

export interface PDFLayoutMetadata {
  pageCount: number;
  totalTextItems: number;
  charCount: number;
  isLikelyScannedOrImage: boolean;
  isMultiColumnDetected: boolean;
  columnMixingRiskScore: number; // 0 to 100
  tableOrGridDetected: boolean;
  weirdGlyphsCount: number;
}

export interface ExtractedResumeSections {
  contact: {
    email: string | null;
    phone: string | null;
    linkedin: string | null;
    githubOrPortfolio: string | null;
  };
  detectedHeaders: {
    experience: boolean;
    education: boolean;
    skills: boolean;
    summary: boolean;
    projectsOrCerts: boolean;
  };
  metrics: {
    wordCount: number;
    bulletCount: number;
    quantifiedBulletsCount: number;
    actionVerbsFound: string[];
    standardizedDatesCount: number;
    unstandardizedDatesWarning: boolean;
  };
}

export type DiagnosticSeverity = "error" | "warning" | "success" | "info";

export interface ATSDiagnosticFinding {
  id: string;
  severity: DiagnosticSeverity;
  category: "layout" | "contact" | "sections" | "impact" | "encoding";
  titlePt: string;
  titleEn: string;
  descPt: string;
  descEn: string;
}

export interface ATSAnalysisResult {
  overallScore: number;
  subScores: {
    parseability: number; // 0-100 (layout, encoding, length)
    structure: number;    // 0-100 (sections & contact info)
    impact: number;       // 0-100 (action verbs, metrics, dates)
  };
  rawText: string;
  sections: ExtractedResumeSections;
  pdfMetadata?: PDFLayoutMetadata;
  findings: ATSDiagnosticFinding[];
}

export const ALLOWED_CHARS_REGEX =
  /[^\w\sáàãâéêíóôõúçÁÀÃÂÉÊÍÓÔÕÚÇ.,;:\-–—()/@+#%$|•&'"!?]/g;

export const ACTION_VERBS_LIST = [
  // PT
  "desenvolvi", "liderei", "otimizei", "implementei", "gerenciei", "coordenei",
  "criei", "projetei", "analisei", "automatizei", "reduzi", "aumentei",
  "melhorei", "entreguei", "conduzi", "estruturei", "negociei", "supervisionei",
  "planejei", "executei", "construí", "lancei", "integrei", "monitorei",
  "arquietetei", "arquitetamos", "refatorei", "escalei", "migrei", "administrei",
  // EN
  "developed", "led", "optimized", "implemented", "managed", "created",
  "designed", "analyzed", "automated", "reduced", "increased", "improved",
  "delivered", "built", "launched", "integrated", "monitored", "architected",
  "spearheaded", "engineered", "refactored", "scaled", "migrated", "streamlined",
];

function isPDFTextItem(item: unknown): item is PDFTextItem {
  return (
    typeof item === "object" &&
    item !== null &&
    "str" in item &&
    typeof (item as { str: unknown }).str === "string" &&
    "transform" in item &&
    Array.isArray((item as { transform: unknown }).transform)
  );
}

const SECTION_HEADER_LINE_REGEX =
  /^(?:resumo(?:\s+profissional)?|sobre(?:\s+mim)?|perfil(?:\s+profissional)?|objetivo(?:\s+profissional)?|professional\s+summary|summary|profile|about\s+me|experi[êe]ncia(?:s)?(?:\s+profissiona(?:l|is))?|hist[óo]rico\s+profissional|professional\s+experience|work\s+experience|employment\s+history|experience|forma[çc][ãa]o(?:\s+acad[êe]mica)?|educa[çc][ãa]o|escolaridade|education|academic\s+background|habilidades(?:\s+t[ée]cnicas)?|compet[êe]ncias(?:\s+t[ée]cnicas)?|tecnologias|ferramentas|conhecimentos|skills|technical\s+skills|core\s+competencies|idiomas|languages|(?:certifica[çc][õo]es|cursos)(?:\s+(?:e|&|\/)\s+(?:certifica[çc][õo]es|cursos)|\s+complementares|\s+profissionais|\s+livres)?|forma[çc][ãa]o\s+complementar|qualifica[çc][õo]es(?:\s+profissionais)?|projetos|certifications(?:\s*(?:&|and)\s*courses)?|courses(?:\s*(?:&|and)\s*certifications)?|projects)\s*:?$/i;

const DATE_TOKEN_REGEX =
  /\b(?:(?:jan|fev|feb|mar|abr|apr|mai|may|jun|jul|ago|aug|set|sep|out|oct|nov|dez|dec)[a-zç]*\.?(?:[\s/.-]+(?:de\s+)?)?(?:19|20)\d{2}|\d{1,2}\/(?:19|20)\d{2}|(?:19|20)\d{2}\s*[-–—a/]\s*(?:(?:19|20)\d{2}|atual|presente|present|current|hoje|momento|cursando|em\s+andamento)|(?:conclu[íi]do|previs[ãa]o|cursando|em\s+andamento|formado)[^.\n]{0,30}\b(?:19|20)\d{2}\b|\(\s*(?:19|20)\d{2}\s*\))/i;

/**
 * Normalizes PDF text strings using Unicode NFKC so typographic ligatures
 * (e.g. "ﬁ" -> "fi", "ﬂ" -> "fl", "ﬀ" -> "ff") and decomposed accents
 * ("a" + "~" -> "ã", "c" + "¸" -> "ç") are preserved intact.
 */
function normalizePDFTextStr(str: string): string {
  if (!str) return "";
  return str
    .replace(/[\uF0B7\uF0A7\u2022\u2023\u25E6\u2043\u2219\u25CF\u25AA\u25B8\u25B6]/g, "•")
    .normalize("NFKC")
    .replace(/[\uFFFD\uE000-\uF8FF]/g, "");
}

/**
 * Clusters PDFTextItems into horizontal visual lines using a continuous Y-distance tolerance
 * (instead of fixed rounding buckets that can split accented glyphs or slightly shifted baselines).
 */
export function clusterItemsIntoVisualLines(items: PDFTextItem[], yTolerance = 3.5): PDFTextItem[][] {
  const nonEmpty = items.filter((it) => normalizePDFTextStr(it.str).trim().length > 0);
  if (nonEmpty.length === 0) return [];

  // Sort top-to-bottom (descending Y in PDF coordinate space)
  const sortedByY = [...nonEmpty].sort((a, b) => b.transform[5] - a.transform[5]);
  const clusters: { refY: number; items: PDFTextItem[] }[] = [];

  for (const item of sortedByY) {
    const itemY = item.transform[5];
    let matchedCluster: { refY: number; items: PDFTextItem[] } | null = null;
    let bestDiff = Infinity;

    for (const cluster of clusters) {
      const diff = Math.abs(itemY - cluster.refY);
      if (diff <= yTolerance && diff < bestDiff) {
        bestDiff = diff;
        matchedCluster = cluster;
      }
    }

    if (matchedCluster) {
      matchedCluster.items.push(item);
    } else {
      clusters.push({ refY: itemY, items: [item] });
    }
  }

  return clusters
    .sort((a, b) => b.refY - a.refY)
    .map((c) => c.items.sort((a, b) => a.transform[4] - b.transform[4]));
}

/**
 * Joins PDFTextItems on a single horizontal line using X-coordinate gap heuristics
 * so fragmented syllables/glyphs (especially around accented characters and ligatures)
 * are merged without spaces while separate words and right-aligned dates stay intact on the same line.
 */
export function joinLineItemsSmartly(items: PDFTextItem[], pageWidth = 600): string {
  if (items.length === 0) return "";
  const sorted = [...items].sort((a, b) => a.transform[4] - b.transform[4]);
  let result = normalizePDFTextStr(sorted[0].str);

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    const currStr = normalizePDFTextStr(curr.str);
    if (!currStr) continue;

    const fontSize =
      Math.abs(curr.transform[0]) ||
      Math.abs(curr.transform[3]) ||
      curr.height ||
      10;
    const prevStrNorm = normalizePDFTextStr(prev.str);
    const prevWidth =
      prev.width > 0 ? prev.width : prevStrNorm.length * (fontSize * 0.48);
    const prevEnd = prev.transform[4] + prevWidth;
    const gap = curr.transform[4] - prevEnd;

    const prevEndsWithSpaceOrHyphen = /[\s\-/(\[]$/.test(result);
    const currStartsWithSpaceOrPunct = /^[\s.,;:!?)}\]]/.test(currStr);
    const prevIsBullet = /^[-•*▪▸◦●➢❖]$/.test(result.trim());

    // Large horizontal tab/right-align gap on the same line (e.g. Role/Course on left, Date on right)
    if (gap > Math.max(45, pageWidth * 0.11)) {
      const trimmedRes = result.trimEnd();
      const trimmedCurr = currStr.trimStart();
      if (
        trimmedRes &&
        trimmedCurr &&
        !/[-–—|:]$/.test(trimmedRes) &&
        !/^[-–—|:(]/.test(trimmedCurr) &&
        DATE_TOKEN_REGEX.test(trimmedCurr)
      ) {
        result = `${trimmedRes} — ${trimmedCurr}`;
      } else {
        result = `${trimmedRes} ${trimmedCurr}`;
      }
    } else if (prevIsBullet) {
      result = `${result.trim()} ${currStr.trimStart()}`;
    } else if (prevEndsWithSpaceOrHyphen || currStartsWithSpaceOrPunct) {
      result += currStr;
    } else if (gap < fontSize * 0.22 && gap > -fontSize * 1.5) {
      // Tight kerning or split word around accented glyph/ligature (e.g. "Farm" + "ácia", "peri" + "ódicos")
      result += currStr;
    } else {
      result += ` ${currStr}`;
    }
  }

  return result.replace(/\s{2,}/g, " ").trim();
}

/**
 * Cleans, normalizes, and reflows raw resume text extracted from PDFs or pasted by the user.
 * - Normalizes Unicode NFKC ligatures ("ﬁ" -> "fi", "ﬂ" -> "fl") and accents
 * - Removes icon-font artifacts (Private Use Unicode)
 * - Collapses letter-spaced headings ("E X P E R I Ê N C I A" -> "EXPERIÊNCIA")
 * - Normalizes bullets to "• "
 * - Merges soft-wrapped continuation lines inside paragraphs and bullets safely
 * - Adds clean visual spacing before section headers and between experience blocks
 */
export function formatResumeText(rawInput: string): string {
  if (!rawInput || !rawInput.trim()) return "";

  // 1. Normalize Unicode ligatures/accents, line breaks, remove private-use glyphs, rejoin hyphenated wraps
  const cleaned = normalizePDFTextStr(rawInput)
    .replace(/\r\n/g, "\n")
    .replace(/([a-záàâãéêíóôõúç])-\s*\n\s*([a-záàâãéêíóôõúç])/gi, "$1$2");

  // 2. Split inline bullets that were glued on the same line (except on contact lines with emails/urls)
  const rawLines = cleaned.split("\n");
  const expandedLines: string[] = [];

  for (let line of rawLines) {
    // Collapse spaced-out uppercase titles like "E X P E R I Ê N C I A   P R O F I S S I O N A L" before collapsing spaces
    const trimmedRaw = line.trim();
    if (/^(?:[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ]\s+){4,}[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ]$/.test(trimmedRaw)) {
      line = trimmedRaw
        .split(/\s{2,}/)
        .map((w) => w.replace(/\s+/g, ""))
        .join(" ")
        .replace(/^EXPERI[ÊE]NCIAPROFISSIONAL$/i, "EXPERIÊNCIA PROFISSIONAL")
        .replace(/^RESUMOPROFISSIONAL$/i, "RESUMO PROFISSIONAL")
        .replace(/^FORMA[ÇC][ÃA]OACAD[ÊE]MICA$/i, "FORMAÇÃO ACADÊMICA")
        .replace(/^HABILIDADEST[ÉE]CNICAS$/i, "HABILIDADES TÉCNICAS")
        .replace(/^PROFESSIONALEXPERIENCE$/i, "PROFESSIONAL EXPERIENCE")
        .replace(/^PROFESSIONALSUMMARY$/i, "PROFESSIONAL SUMMARY")
        .replace(/^TECHNICALSKILLS$/i, "TECHNICAL SKILLS");
    }

    line = line
      .replace(/^[\s•*▪▸◦●➢❖\u2022\u2023\u25E6\u2043\u2219]+(?=\S)/, (m) =>
        /[•*▪▸◦●➢❖\u2022\u2023\u25E6\u2043\u2219]/.test(m) ? "• " : ""
      )
      .replace(/^\s*[-–]\s+(?=[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ])(?!\s*(?:jan|fev|feb|mar|abr|apr|mai|may|jun|jul|ago|aug|set|sep|out|oct|nov|dez|dec)\b)/i, "• ")
      .replace(/\s+/g, " ")
      .trim();

    if (!line) continue;

    // If a line has multiple inline "•" bullets (and isn't a contact line), split into separate bullet lines
    const isContactLine =
      /@|linkedin\.com|github\.com|(?:\(?\d{2,3}\)?[\s.-]?\d{4,5}[\s.-]?\d{4})/i.test(
        line
      );
    if (!isContactLine && (line.match(/•/g) || []).length >= 2 && !line.startsWith("•")) {
      const subParts = line.split(/\s*•\s*/).filter(Boolean);
      subParts.forEach((sp, idx) => {
        expandedLines.push(idx === 0 ? sp : `• ${sp}`);
      });
    } else if (!isContactLine && line.startsWith("•") && (line.match(/•/g) || []).length >= 2) {
      const subParts = line.split(/\s*•\s*/).filter(Boolean);
      subParts.forEach((sp) => expandedLines.push(`• ${sp}`));
    } else {
      expandedLines.push(line);
    }
  }

  // 3. Smart Soft-Wrap Line Reflow (join continuation lines broken by PDF margin wrapping)
  const reflowed: string[] = [];

  for (let i = 0; i < expandedLines.length; i++) {
    const curr = expandedLines[i];
    if (reflowed.length === 0) {
      reflowed.push(curr);
      continue;
    }

    const prev = reflowed[reflowed.length - 1];
    const prevIsHeader = SECTION_HEADER_LINE_REGEX.test(prev);
    const currIsHeader = SECTION_HEADER_LINE_REGEX.test(curr);
    const currIsBullet = curr.startsWith("• ");
    const prevIsContact =
      /@|linkedin\.com|github\.com|(?:\(?\d{2,3}\)?[\s.-]?\d{4,5}[\s.-]?\d{4})/i.test(
        prev
      );
    const currIsContact =
      /@|linkedin\.com|github\.com|(?:\(?\d{2,3}\)?[\s.-]?\d{4,5}[\s.-]?\d{4})/i.test(
        curr
      );
    const prevHasDate = DATE_TOKEN_REGEX.test(prev);
    const currHasDate = DATE_TOKEN_REGEX.test(curr);
    const currLooksLikeRoleOrEduHeader =
      currHasDate ||
      (/[—–|]/.test(curr) && curr.length < 95 && !curr.endsWith("."));

    // Check if `curr` is a wrapped continuation of `prev`
    const prevIsBullet = prev.startsWith("• ");
    const prevEndsWithConnector =
      /[,]$/.test(prev) ||
      /\b(?:e|ou|de|da|do|das|dos|em|no|na|nos|nas|para|com|por|como|entre|até|sob|sobre|and|or|of|in|on|for|with|to|from|by|using|including|as|at)$/i.test(
        prev
      );

    // Only reflow when `prev` ends with a connector/comma, or is a long line/bullet that wrapped mid-sentence into a lowercase continuation
    const currStartsLowercaseOrNumber = /^[a-záàâãéêíóôõúç0-9%]/.test(curr);
    const prevEndsIncomplete =
      !prevIsHeader &&
      !prevIsContact &&
      !prevHasDate &&
      reflowed.length > 1 &&
      !/[.!?:;)]$/.test(prev) &&
      (prevEndsWithConnector ||
        (currStartsLowercaseOrNumber &&
          ((prevIsBullet && prev.length >= 48) || prev.length >= 62)));

    if (
      prevEndsIncomplete &&
      !currIsHeader &&
      !currIsBullet &&
      !currIsContact &&
      !currLooksLikeRoleOrEduHeader
    ) {
      reflowed[reflowed.length - 1] = `${prev} ${curr}`;
    } else {
      reflowed.push(curr);
    }
  }

  // 4. Add clean spacing around Section Headers and between Experience blocks
  const finalLines: string[] = [];
  for (let i = 0; i < reflowed.length; i++) {
    const line = reflowed[i];
    const isHeader = SECTION_HEADER_LINE_REGEX.test(line);

    if (isHeader) {
      if (finalLines.length > 0 && finalLines[finalLines.length - 1] !== "") {
        finalLines.push("");
      }
      finalLines.push(line.replace(/:$/, "").toUpperCase());
      continue;
    }

    // Add a subtle blank line before a new Experience/Company header if previous line was a bullet point
    const prevLine = finalLines.length > 0 ? finalLines[finalLines.length - 1] : "";
    const isRoleCompanyLine =
      !line.startsWith("•") &&
      (DATE_TOKEN_REGEX.test(line) || (/[—–|]/.test(line) && line.length < 90)) &&
      prevLine.startsWith("• ");

    if (isRoleCompanyLine) {
      finalLines.push("");
    }

    finalLines.push(line);
  }

  return finalLines.join("\n").trim();
}

/**
 * Extracts text and geometric layout metadata from a PDF file using PDF.js.
 * Preserves horizontal line integrity (including right-aligned dates and accented/ligature words),
 * detects multi-column layouts, table grids, and scanned/image PDFs,
 * and returns cleanly formatted & reflowed text.
 */
export async function extractAndAnalyzePDF(
  file: File
): Promise<{ text: string; metadata: PDFLayoutMetadata }> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pagesText: string[] = [];

  let totalTextItems = 0;
  let multiColumnJumpLines = 0;
  let totalAnalyzedLines = 0;
  let tableLikeLines = 0;
  let weirdGlyphsCount = 0;

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 1.0 });
    const pageWidth = viewport.width || 600;
    const content = await page.getTextContent();

    const validItems = content.items.filter(isPDFTextItem);
    totalTextItems += validItems.length;

    for (const item of validItems) {
      // Count private-use unicode / replacement chars (excluding standard bullet glyphs)
      const nonBulletWeird = item.str
        .replace(/[\uF0B7\uF0A7\u2022\u2023\u25E6\u2043\u2219\u25CF\u25AA\u25B8\u25B6]/g, "")
        .match(/[\uFFFD\uE000-\uF8FF]/g);
      if (nonBulletWeird) {
        weirdGlyphsCount += nonBulletWeird.length;
      }
    }

    const visualLines = clusterItemsIntoVisualLines(validItems, 3.5);
    const pageLines: string[] = [];

    for (const itemsInLine of visualLines) {
      if (itemsInLine.length > 1) {
        totalAnalyzedLines++;
        let largeNonDateGapsInLine = 0;
        let allLargeGapsInLine = 0;

        for (let j = 1; j < itemsInLine.length; j++) {
          const prev = itemsInLine[j - 1];
          const curr = itemsInLine[j];
          const prevEnd = prev.transform[4] + (prev.width || prev.str.length * 5);
          const gap = curr.transform[4] - prevEnd;

          if (gap > pageWidth * 0.14 && curr.transform[4] > pageWidth * 0.28) {
            allLargeGapsInLine++;
            // Check if the right-hand part of the line is simply a right-aligned date/period/status
            const rightSideText = itemsInLine
              .slice(j)
              .map((it) => normalizePDFTextStr(it.str))
              .join(" ")
              .trim();
            const isRightAlignedDate =
              DATE_TOKEN_REGEX.test(rightSideText) && rightSideText.length <= 42;
            if (!isRightAlignedDate) {
              largeNonDateGapsInLine++;
            }
          }
        }

        if (largeNonDateGapsInLine === 1) {
          multiColumnJumpLines++;
        } else if (allLargeGapsInLine >= 2) {
          tableLikeLines++;
        }
      }

      const lineStr = joinLineItemsSmartly(itemsInLine, pageWidth);
      if (lineStr) {
        pageLines.push(lineStr);
      }
    }

    pagesText.push(pageLines.join("\n"));
  }

  const rawJoined = pagesText.join("\n\n");
  const formattedText = formatResumeText(rawJoined);
  const charCount = formattedText.replace(/\s+/g, "").length;
  const isLikelyScannedOrImage = pdf.numPages > 0 && charCount < 80;

  const columnRatio =
    totalAnalyzedLines > 6 ? multiColumnJumpLines / totalAnalyzedLines : 0;
  const isMultiColumnDetected = multiColumnJumpLines >= 5 && columnRatio >= 0.22;
  const columnMixingRiskScore = Math.min(100, Math.round(columnRatio * 180));
  const tableOrGridDetected = tableLikeLines >= 4;

  return {
    text: formattedText,
    metadata: {
      pageCount: pdf.numPages,
      totalTextItems,
      charCount,
      isLikelyScannedOrImage,
      isMultiColumnDetected,
      columnMixingRiskScore,
      tableOrGridDetected,
      weirdGlyphsCount,
    },
  };
}

/**
 * Audits resume text and optional PDF metadata, producing a realistic ATS diagnosis.
 */
export function analyzeResumeForATS(
  rawInputText: string,
  pdfMetadata?: PDFLayoutMetadata
): ATSAnalysisResult {
  const formattedInput = formatResumeText(rawInputText);
  const lines = formattedInput
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const rawText = formattedInput
    .split("\n")
    .map((line) => line.replace(ALLOWED_CHARS_REGEX, "").trim())
    .join("\n");

  const lowerText = rawInputText.toLowerCase();

  // 1. Contact Extraction
  const emailMatch = rawInputText.match(
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/
  );
  const phoneMatch = rawInputText.match(
    /(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{2,3}\)?[\s.-]?)?\d{4,5}[\s.-]?\d{4}/
  );
  const linkedinMatch = rawInputText.match(
    /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[a-zA-Z0-9_-]+\/?/i
  );
  const githubMatch = rawInputText.match(
    /(?:https?:\/\/)?(?:www\.)?(?:github\.com|gitlab\.com|behance\.net)\/[a-zA-Z0-9_-]+\/?/i
  );

  // 2. Section Header Detection
  const hasExperienceHeader =
    /(?:^|\n)\s*(?:experi[êe]ncia(?:s)?(?:\s+profissiona(?:l|is))?|professional\s+experience|work\s+experience|hist[óo]rico\s+profissional|employment\s+history)\b/i.test(
      rawInputText
    );
  const hasEducationHeader =
    /(?:^|\n)\s*(?:forma[çc][ãa]o(?:\s+acad[êe]mica)?|educa[çc][ãa]o|education|academic\s+background|escolaridade)\b/i.test(
      rawInputText
    );
  const hasSkillsHeader =
    /(?:^|\n)\s*(?:habilidades|compet[êe]ncias|skills|technical\s+skills|tecnologias|ferramentas|stack|conhecimentos)\b/i.test(
      rawInputText
    );
  const hasSummaryHeader =
    /(?:^|\n)\s*(?:resumo(?:\s+profissional)?|sobre(?:\s+mim)?|perfil|objetivo|summary|professional\s+summary|about\s+me|profile)\b/i.test(
      rawInputText
    );
  const hasProjectsOrCerts =
    /(?:^|\n)\s*(?:projetos|certifica[çc][õo]es|idiomas|cursos|projects|certifications|languages)\b/i.test(
      rawInputText
    );

  // 3. Metrics & Impact Analysis
  const words = rawText.split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  const bulletLines = lines.filter(
    (l) => /^[-•*▪▸>]|\b(?:situa[çc][ãa]o|tarefa|a[çc][ãa]o|resultado)\b/i.test(l) || l.length > 45
  );
  const quantifiedLines = lines.filter((l) =>
    /(?:\b\d+(?:[.,]\d+)?\s*(?:%|por\s*cento|percent|x|vezes|dias|horas|meses|usu[áa]rios|clientes|projetos|ms|s|k|mil|milh[õo]es)\b|(?:R\$|US\$|\$|€)\s*\d+)/i.test(
      l
    )
  );

  const actionVerbsFound = ACTION_VERBS_LIST.filter((verb) => {
    const regex = new RegExp(`\\b${verb}\\b`, "i");
    return regex.test(lowerText);
  });

  // Standardized dates (e.g. 01/2022, Jan 2022, 2021 - 2024, 2022 - Atual/Present)
  const standardizedDateMatches =
    rawInputText.match(
      /\b(?:(?:0?[1-9]|1[0-2])\/20\d{2}|(?:jan|fev|feb|mar|abr|apr|mai|may|jun|jul|ago|aug|set|sep|out|oct|nov|dez|dec)[a-z]*[\s./-]*20\d{2}|20\d{2}\s*[-–—a]\s*(?:20\d{2}|atual|presente|present|current|hoje))\b/gi
    ) || [];

  const unstandardizedDatesWarning =
    hasExperienceHeader && standardizedDateMatches.length === 0;

  const findings: ATSDiagnosticFinding[] = [];

  // --- Evaluate PDF Layout & Encoding ---
  let parseabilityScore = 100;

  if (pdfMetadata) {
    if (pdfMetadata.isLikelyScannedOrImage) {
      parseabilityScore -= 70;
      findings.push({
        id: "scanned-pdf",
        severity: "error",
        category: "layout",
        titlePt: "PDF baseado em imagem / escaneado detectado",
        titleEn: "Image-based / Scanned PDF detected",
        descPt:
          "O arquivo possui páginas, mas quase nenhum texto selecionável foi extraído. Sistemas ATS sem OCR descartarão o currículo como vazio.",
        descEn:
          "The file has pages, but almost no selectable text was extracted. ATS parsers without OCR will read this resume as blank.",
      });
    } else if (pdfMetadata.isMultiColumnDetected) {
      parseabilityScore -= 30;
      findings.push({
        id: "multi-column",
        severity: "error",
        category: "layout",
        titlePt: "Layout em múltiplas colunas detectado",
        titleEn: "Multi-column layout detected",
        descPt: `Detectamos saltos horizontais frequentes no PDF (risco de mistura: ${pdfMetadata.columnMixingRiskScore}%). Parsers ATS lineares podem fundir frases da coluna esquerda com a direita.`,
        descEn: `Frequent horizontal column jumps detected in the PDF (mixing risk: ${pdfMetadata.columnMixingRiskScore}%). Linear ATS parsers may merge left and right column lines together.`,
      });
    } else {
      findings.push({
        id: "single-column-ok",
        severity: "success",
        category: "layout",
        titlePt: "Fluxo de leitura linear (Coluna Única)",
        titleEn: "Linear reading flow (Single Column)",
        descPt:
          "A geometria do seu PDF segue uma leitura linear de cima para baixo, ideal para Gupy, Workday e Greenhouse.",
        descEn:
          "Your PDF geometry follows a clean top-to-bottom linear flow, ideal for Gupy, Workday, and Greenhouse.",
      });
    }

    if (pdfMetadata.tableOrGridDetected) {
      parseabilityScore -= 15;
      findings.push({
        id: "tables-detected",
        severity: "warning",
        category: "layout",
        titlePt: "Possível uso de tabelas ou grades multi-colunas",
        titleEn: "Possible tables or multi-column grids detected",
        descPt:
          "Múltiplos blocos de texto alinhados na mesma linha horizontal sugerem tabelas. Prefira listas simples (bullet points).",
        descEn:
          "Multiple text blocks aligned on the same horizontal row suggest tables. Prefer standard bullet points.",
      });
    }

    if (pdfMetadata.weirdGlyphsCount > 2) {
      parseabilityScore -= 10;
      findings.push({
        id: "icon-fonts",
        severity: "warning",
        category: "encoding",
        titlePt: `Ícones ou fontes não-padronizadas (${pdfMetadata.weirdGlyphsCount} símbolos)`,
        titleEn: `Icons or non-standard font glyphs (${pdfMetadata.weirdGlyphsCount} symbols)`,
        descPt:
          "Foram encontrados caracteres privados de fontes de ícones (comum em templates do Canva). Remova ícones ao lado de telefone/e-mail.",
        descEn:
          "Private-use icon font glyphs were found (common in Canva templates). Remove icons next to phone/email fields.",
      });
    }
  }

  // Word count check
  if (wordCount < 120 && !pdfMetadata?.isLikelyScannedOrImage) {
    parseabilityScore -= 25;
    findings.push({
      id: "short-resume",
      severity: "warning",
      category: "layout",
      titlePt: `Volume de texto muito baixo (${wordCount} palavras)`,
      titleEn: `Very low text volume (${wordCount} words)`,
      descPt:
        "Currículos abaixo de 150 palavras raramente contêm densidade semântica suficiente para ranquear bem no algoritmo de triagem.",
      descEn:
        "Resumes under 150 words rarely contain enough semantic density to rank well in ATS scoring algorithms.",
    });
  } else if (wordCount >= 150 && wordCount <= 900) {
    findings.push({
      id: "word-count-ok",
      severity: "success",
      category: "layout",
      titlePt: `Extensão ideal para leitura ATS (${wordCount} palavras)`,
      titleEn: `Optimal length for ATS parsing (${wordCount} words)`,
      descPt:
        "O volume textual está dentro da faixa recomendada (150 a 900 palavras) para indexação completa.",
      descEn:
        "Text volume is within the recommended range (150 to 900 words) for complete indexing.",
    });
  }

  // --- Evaluate Structure & Contact ---
  let structureScore = 0;
  const missingContacts: string[] = [];
  const missingContactsEn: string[] = [];

  if (emailMatch) structureScore += 18;
  else {
    missingContacts.push("E-mail");
    missingContactsEn.push("Email");
  }

  if (phoneMatch) structureScore += 14;
  else {
    missingContacts.push("Telefone");
    missingContactsEn.push("Phone");
  }

  if (linkedinMatch) structureScore += 10;
  else {
    missingContacts.push("LinkedIn");
    missingContactsEn.push("LinkedIn");
  }

  if (missingContacts.length === 0) {
    findings.push({
      id: "contact-complete",
      severity: "success",
      category: "contact",
      titlePt: "Dados de contato extraídos com sucesso",
      titleEn: "Contact details successfully extracted",
      descPt: `O parser identificou claramente seu e-mail (${emailMatch?.[0]}), telefone e perfil do LinkedIn.`,
      descEn: `The parser clearly identified your email (${emailMatch?.[0]}), phone, and LinkedIn profile.`,
    });
  } else {
    findings.push({
      id: "contact-missing",
      severity: missingContacts.includes("E-mail") ? "error" : "warning",
      category: "contact",
      titlePt: `Dados de contato ausentes ou ilegíveis: ${missingContacts.join(", ")}`,
      titleEn: `Missing or unreadable contact info: ${missingContactsEn.join(", ")}`,
      descPt:
        "Se esses dados estiverem dentro de cabeçalhos de imagem, caixas de texto flutuantes ou hiperlinks sem texto explícito, o ATS não conseguirá preenchê-los.",
      descEn:
        "If these details are inside image headers, floating text boxes, or hidden hyperlinks, the ATS cannot populate your candidate profile.",
    });
  }

  // Sections Check
  const missingSectionsPt: string[] = [];
  const missingSectionsEn: string[] = [];

  if (hasExperienceHeader) structureScore += 22;
  else {
    missingSectionsPt.push("Experiência Profissional");
    missingSectionsEn.push("Professional Experience");
  }

  if (hasEducationHeader) structureScore += 16;
  else {
    missingSectionsPt.push("Formação Acadêmica");
    missingSectionsEn.push("Education");
  }

  if (hasSkillsHeader) structureScore += 12;
  else {
    missingSectionsPt.push("Habilidades / Competências");
    missingSectionsEn.push("Skills");
  }

  if (hasSummaryHeader) structureScore += 8;

  if (missingSectionsPt.length === 0) {
    findings.push({
      id: "sections-complete",
      severity: "success",
      category: "sections",
      titlePt: "Cabeçalhos de seção padronizados reconhecidos",
      titleEn: "Standard section headers recognized",
      descPt:
        "As seções essenciais (Experiência, Formação e Habilidades) possuem títulos claros que o parser consegue mapear.",
      descEn:
        "Essential sections (Experience, Education, and Skills) have clear headings that the parser can map.",
    });
  } else {
    findings.push({
      id: "sections-missing",
      severity: missingSectionsPt.length >= 2 ? "error" : "warning",
      category: "sections",
      titlePt: `Seções não reconhecidas pelo parser: ${missingSectionsPt.join(", ")}`,
      titleEn: `Sections not recognized by parser: ${missingSectionsEn.join(", ")}`,
      descPt:
        "Evite títulos criativos como 'Minha Trajetória' ou 'O que eu sei fazer'. Use rótulos diretos: 'Experiência Profissional', 'Formação Acadêmica' e 'Habilidades'.",
      descEn:
        "Avoid creative headings like 'My Journey'. Use standard labels: 'Professional Experience', 'Education', and 'Technical Skills'.",
    });
  }

  // --- Evaluate Impact, Dates & Action Verbs ---
  let impactScore = 0;

  if (actionVerbsFound.length >= 5) {
    impactScore += 40;
    findings.push({
      id: "verbs-strong",
      severity: "success",
      category: "impact",
      titlePt: `Forte presença de verbos de ação (${actionVerbsFound.length} identificados)`,
      titleEn: `Strong presence of action verbs (${actionVerbsFound.length} identified)`,
      descPt: `Verbos detectados: ${actionVerbsFound.slice(0, 6).join(", ")}${actionVerbsFound.length > 6 ? "..." : ""}.`,
      descEn: `Detected verbs: ${actionVerbsFound.slice(0, 6).join(", ")}${actionVerbsFound.length > 6 ? "..." : ""}.`,
    });
  } else {
    impactScore += actionVerbsFound.length * 8;
    findings.push({
      id: "verbs-weak",
      severity: "warning",
      category: "impact",
      titlePt: `Poucos verbos de impacto detectados (${actionVerbsFound.length})`,
      titleEn: `Few action verbs detected (${actionVerbsFound.length})`,
      descPt:
        "Inicie suas descrições de experiência com verbos de ação (ex: Desenvolvi, Liderei, Otimizei, Reduzi, Implementei) para destacar entregas.",
      descEn:
        "Start your experience bullet points with strong action verbs (e.g., Developed, Led, Optimized, Reduced, Implemented).",
    });
  }

  if (quantifiedLines.length >= 2) {
    impactScore += 35;
    findings.push({
      id: "metrics-strong",
      severity: "success",
      category: "impact",
      titlePt: `Resultados quantificados encontrados (${quantifiedLines.length} ocorrências)`,
      titleEn: `Quantified results found (${quantifiedLines.length} occurrences)`,
      descPt:
        "Seu currículo apresenta indicadores numéricos (%, valores, prazos ou escala), fator decisivo na triagem técnica e método STAR.",
      descEn:
        "Your resume includes numerical indicators (%, currency, timeframes, or scale), a key factor in STAR-based screening.",
    });
  } else {
    impactScore += quantifiedLines.length * 15;
    findings.push({
      id: "metrics-missing",
      severity: "warning",
      category: "impact",
      titlePt: "Baixa densidade de resultados mensuráveis (Métricas / KPIs)",
      titleEn: "Low density of measurable results (Metrics / KPIs)",
      descPt:
        "Adicione números concretos às suas conquistas (ex: 'Reduzi o tempo de resposta em 35%', 'Gerenciei projetos de R$ 200k').",
      descEn:
        "Add concrete numbers to your achievements (e.g., 'Reduced response time by 35%', 'Managed 50k+ active users').",
    });
  }

  if (standardizedDateMatches.length >= 1) {
    impactScore += 25;
  } else {
    findings.push({
      id: "dates-missing",
      severity: "warning",
      category: "impact",
      titlePt: "Períodos de experiência fora do padrão ATS",
      titleEn: "Non-standard date formats in experience/education",
      descPt:
        "Sistemas ATS calculam seu tempo total de experiência automaticamente. Use formatos claros como 'Jan 2022 - Atual' ou '03/2021 - 11/2023'.",
      descEn:
        "ATS systems automatically calculate your total years of experience. Use clear formats like 'Jan 2022 - Present' or '03/2021 - 11/2023'.",
    });
  }

  parseabilityScore = Math.max(0, Math.min(100, parseabilityScore));
  structureScore = Math.max(0, Math.min(100, structureScore));
  impactScore = Math.max(0, Math.min(100, impactScore));

  const overallScore = Math.round(
    parseabilityScore * 0.35 + structureScore * 0.4 + impactScore * 0.25
  );

  // Sort findings: errors first, then warnings, then success
  const severityOrder: Record<DiagnosticSeverity, number> = {
    error: 0,
    warning: 1,
    info: 2,
    success: 3,
  };
  findings.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return {
    overallScore,
    subScores: {
      parseability: parseabilityScore,
      structure: structureScore,
      impact: impactScore,
    },
    rawText,
    sections: {
      contact: {
        email: emailMatch?.[0] || null,
        phone: phoneMatch?.[0] || null,
        linkedin: linkedinMatch?.[0] || null,
        githubOrPortfolio: githubMatch?.[0] || null,
      },
      detectedHeaders: {
        experience: hasExperienceHeader,
        education: hasEducationHeader,
        skills: hasSkillsHeader,
        summary: hasSummaryHeader,
        projectsOrCerts: hasProjectsOrCerts,
      },
      metrics: {
        wordCount,
        bulletCount: bulletLines.length,
        quantifiedBulletsCount: quantifiedLines.length,
        actionVerbsFound,
        standardizedDatesCount: standardizedDateMatches.length,
        unstandardizedDatesWarning,
      },
    },
    pdfMetadata,
    findings,
  };
}
