import type { ResumeDraftData, PersonalInfo, Experience, Education } from "@/pages/ResumeBuilder";
import { ACTION_VERBS_LIST, formatResumeText } from "@/lib/atsEngine";
import { SKILL_SYNONYMS } from "@/lib/keywordEngine";

function createId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

const DATE_RANGE_REGEX =
  /\b((?:(?:0?[1-9]|1[0-2])\/|(?:jan|fev|feb|mar|abr|apr|mai|may|jun|jul|ago|aug|set|sep|out|oct|nov|dez|dec)[a-zç.]*(?:\s+de)?[\s./-]*)?(?:19|20)\d{2}\s*(?:[-–—/]|a|to|até|until)\s*(?:(?:(?:0?[1-9]|1[0-2])\/|(?:jan|fev|feb|mar|abr|apr|mai|may|jun|jul|ago|aug|set|sep|out|oct|nov|dez|dec)[a-zç.]*(?:\s+de)?[\s./-]*)?(?:19|20)\d{2}|atual|presente|present|current|hoje|o\s+momento|momento|now))\b/i;

const SINGLE_YEAR_RANGE_REGEX =
  /(?:conclu[íi]do\s*(?:em\s*)?\(\s*(?:19|20)\d{2}\s*\)|\(\s*previs[ãa]o[^)]*(?:19|20)\d{2}\s*\)|\b(?:(?:19|20)\d{2}\s*[-–—]\s*(?:19|20)\d{2}|(?:conclu[íi]do(?:\s+em)?|previs[ãa]o(?:\s+de\s+conclus[ãa]o)?\s*:?|cursando)\s*\(?(?:19|20)\d{2}\)?|(?:19|20)\d{2})\b)/i;

const ROLE_KEYWORDS_REGEX =
  /\b(engenheir[oa]|desenvolvedor[a]?|developer|engineer|analista|analyst|gerente|manager|coordenador[a]?|coordinator|especialista|specialist|consultor[a]?|consultant|arquitet[oa]|architect|designer|tech\s*lead|líder|diretor[a]?|director|estagiári[oa]|intern|trainee|cientista|scientist|product\s*owner|product\s*manager|scrum\s*master|devops|qa|sre|full\s*stack|front[\s-]*end|back[\s-]*end|software|dados|data|programador[a]?|assistente|auxiliar|supervisor[a]?|técnic[oa]|farmacêutic[oa]|contador[a]?|administrador[a]?|vendedor[a]?|atendente|operador[a]?|encarregad[oa]|líder|fiscal|contábil|financeir[oa])\b/i;

const INSTITUTION_KEYWORDS_REGEX =
  /\b(universidade|university|faculdade|college|instituto|institute|escola|school|centro\s+universitário|uni[a-záàâãéêíóôõúç]{3,}|usp|unicamp|ufmg|ufrj|ufpe|ufrgs|ufc|uece|ifce|puc|mackenzie|fgv|insper|fiap|senac|senai|fatec|cefet|ifsp|unb|ufpr|ufsc|estácio|anhanguera|unip|uninove|cruzeiro\s+do\s+sul|descomplica|infnet|uninter|unopar|pitágoras|anhembi\s+morumbi|são\s+judas|fmu|uva|ucam|ibmr|etec|mit|stanford|harvard|udemy|coursera|alura)\b/i;

const DEGREE_KEYWORDS_REGEX =
  /\b(bacharelado|bacharel|bachelor|licenciatura|tecnólogo|tecnologia\s+em|graduação|mestrado|master|doutorado|phd|mba|pós[\s-]*graduação|especialização|curso\s+superior|técnico\s+em|ensino\s+médio|engenharia|ciência\s+da\s+computação|sistemas\s+de\s+informação|administração|análise\s+e\s+desenvolvimento|computação|informática|design|marketing|economia|direito|farmácia|contabilidade|ciências\s+contábeis|gestão|logística|recursos\s+humanos|enfermagem|psicologia|biomedicina|nutrição|fisioterapia|arquitetura|comércio\s+exterior|processos\s+gerenciais|ciência\s+de\s+dados|b\.?s\.?|b\.?a\.?|m\.?s\.?)\b/i;

const LOCATION_OR_WORKMODE_LINE_REGEX =
  /^(?:(?:são\s+paulo|rio\s+de\s+janeiro|belo\s+horizonte|curitiba|porto\s+alegre|brasília|recife|salvador|fortaleza|campinas|florianópolis|goiânia|remoto|híbrido|presencial|remote|hybrid|on-site|brasil|brazil)(?:\s*[,·|/-]\s*[\w\sáàâãéêíóôõúç]+)*|[a-záàâãéêíóôõúç\s]+\s*[-,]\s*(?:sp|rj|mg|pr|rs|sc|df|pe|ba|ce|go|es|am|pa)(?:\s*·\s*(?:remoto|híbrido|presencial))?)$/i;

const BULLET_VERB_START_REGEX =
  /^(?:desenvolvi|liderei|otimizei|implementei|gerenciei|coordenei|criei|projetei|analisei|automatizei|reduzi|aumentei|melhorei|entreguei|conduzi|estruturei|negociei|supervisionei|planejei|executei|construí|lancei|integrei|monitorei|arquitetei|refatorei|escalei|migrei|administrei|atuei|participei|trabalhei|realizei|apoiei|auxiliei|colaborei|fui\s+respons[áa]vel|respons[áa]vel\s+por|desenvolvimento\s+de|cria[çc][ãa]o\s+de|manuten[çc][ãa]o\s+de|gest[ãa]o\s+de|an[áa]lise\s+de|developed|led|optimized|implemented|managed|created|designed|analyzed|automated|reduced|increased|improved|delivered|built|launched|integrated|monitored|architected|spearheaded|engineered|refactored|scaled|migrated|streamlined|worked\s+on|responsible\s+for|helped|collaborated)\b/i;

/**
 * Classifies an experience bullet or sentence into the most appropriate STAR field:
 * - Result: contains metrics (%, R$, numbers, KPIs) or outcome verbs (reduzi, aumentei, resultando, gerando)
 * - Action: starts with or contains strong action verbs or technical execution details
 * - Task: mentions goal, objective, mission, responsibility ("responsável por", "desafio de", "objetivo")
 * - Situation: provides context, scenario, company/system background
 */
function classifyBulletIntoSTAR(bullet: string): "situation" | "task" | "action" | "result" {
  const clean = bullet.trim();
  const lower = clean.toLowerCase();

  // Check for Result indicators (metrics, percentages, currency, scale, outcome words)
  const hasQuantifiedMetric =
    /(?:\b\d+(?:[.,]\d+)?\s*(?:%|por\s*cento|percent|x|vezes|dias|horas|minutos|segundos|ms|s|meses|usu[áa]rios|clientes|projetos|k|mil|milh[õo]es|bilh[õo]es)\b|(?:R\$|US\$|\$|€)\s*\d+)/i.test(
      clean
    );
  const hasOutcomeVerb =
    /\b(reduzi\w*|aumentei\w*|melhorei\w*|alcancei\w*|atingi\w*|economizei\w*|gerei\w*|gerando|resultando|elevando|diminuindo|cutting|reducing|increasing|improving|achieving|saving|resulting\s+in)\b/i.test(
      lower
    );

  if (hasQuantifiedMetric && (hasOutcomeVerb || clean.length < 160)) {
    return "result";
  }

  // Check for Task / Objective indicators
  const hasTaskIndicator =
    /\b(respons[áa]vel\s+por|objetivo\s+de|meta\s+de|missão\s+de|encarregad[oa]\s+de|desafio\s+de|foco\s+em|responsible\s+for|tasked\s+with|goal\s+was|objective\s+was)\b/i.test(
      lower
    );
  if (hasTaskIndicator) {
    return "task";
  }

  // Default to situation if it describes context/scenario
  if (
    /\b(contexto|cen[áa]rio|sistema\s+legado|ambiente|durante|atuei\s+no|atuação\s+em|projeto\s+de|plataforma\s+com|legacy|environment|context)\b/i.test(
      lower
    )
  ) {
    return "situation";
  }

  // Check for Action Verbs
  const hasActionVerb = ACTION_VERBS_LIST.some((v) =>
    new RegExp(`\\b${v}\\b`, "i").test(lower)
  );
  if (hasActionVerb || hasOutcomeVerb) {
    return "action";
  }

  return "action";
}

/**
 * Splits a block of bullets/sentences and distributes them across Situation, Task, Action, and Result
 * so none of the 4 STAR fields are left blank when rich content exists.
 */
function distributeBulletsToSTAR(rawBullets: string[]): {
  situation: string;
  task: string;
  action: string;
  result: string;
} {
  const sentences: string[] = [];
  for (const b of rawBullets) {
    const cleaned = b
      .replace(/^[-•*▪▸>◦]\s*/, "")
      .replace(
        /^(?:situa[çc][ãa]o|tarefa|a[çc][ãa]o|resultado|situation|task|action|result)\s*[:—–-]\s*/i,
        ""
      )
      .trim();
    if (!cleaned) continue;

    if (/^(?:situa[çc][ãa]o|situation)\s*[:—–-]/i.test(b)) {
      sentences.push(`__S__${cleaned}`);
    } else if (/^(?:tarefa|task)\s*[:—–-]/i.test(b)) {
      sentences.push(`__T__${cleaned}`);
    } else if (/^(?:a[çc][ãa]o|action)\s*[:—–-]/i.test(b)) {
      sentences.push(`__A__${cleaned}`);
    } else if (/^(?:resultado|result)\s*[:—–-]/i.test(b)) {
      sentences.push(`__R__${cleaned}`);
    } else {
      // Check if bullet is a compound Action + Gerund Result ("Reestruturei X, reduzindo Y em 48%")
      const gerundSplit = cleaned.match(
        /^(.*?),?\s+((?:reduzindo|aumentando|melhorando|diminuindo|elevando|gerando|alcançando|economizando|otimizando|atendendo|reducing|increasing|improving|cutting|saving|achieving|serving)\s+.*)$/i
      );
      if (gerundSplit && gerundSplit[1].trim().length > 12) {
        const actPart = gerundSplit[1].trim();
        const resPart = gerundSplit[2].trim();
        sentences.push(`__A__${actPart}`);
        sentences.push(
          `__R__${resPart.charAt(0).toUpperCase() + resPart.slice(1)}`
        );
      } else if (
        cleaned.includes(";") ||
        (cleaned.length > 110 && cleaned.includes(". "))
      ) {
        const parts = cleaned
          .split(/(?:;\s*|\.\s+(?=[A-ZÁÀÂÃÉÊÍÓÔÕÚ]))/)
          .map((p) => p.trim())
          .filter(Boolean);
        sentences.push(...parts);
      } else {
        sentences.push(cleaned);
      }
    }
  }

  const star = {
    situation: [] as string[],
    task: [] as string[],
    action: [] as string[],
    result: [] as string[],
  };

  for (const s of sentences) {
    if (s.startsWith("__S__")) {
      star.situation.push(s.replace("__S__", ""));
    } else if (s.startsWith("__T__")) {
      star.task.push(s.replace("__T__", ""));
    } else if (s.startsWith("__A__")) {
      star.action.push(s.replace("__A__", ""));
    } else if (s.startsWith("__R__")) {
      star.result.push(s.replace("__R__", ""));
    } else {
      const bucket = classifyBulletIntoSTAR(s);
      star[bucket].push(s);
    }
  }

  // Rebalance if everything landed in Action or Result so the user gets well-distributed STAR fields
  if (star.situation.length === 0 && star.action.length >= 3) {
    star.situation.push(star.action.shift()!);
  }
  if (star.task.length === 0 && star.action.length >= 2) {
    star.task.push(star.action.shift()!);
  }
  if (star.action.length === 0 && star.result.length >= 2) {
    star.action.push(star.result.shift()!);
  }

  return {
    situation: star.situation.join(" "),
    task: star.task.join(" "),
    action: star.action.join(" "),
    result: star.result.join(" "),
  };
}

/**
 * Synthesizes or completes missing STAR fields for an Experience card in 1 click.
 */
export function autoCompleteExperienceSTAR(
  exp: Experience,
  skillsStr: string,
  locale: "pt" | "en" = "pt"
): Experience {
  const role = exp.role.trim() || (locale === "pt" ? "Especialista" : "Specialist");
  const company = exp.company.trim() || (locale === "pt" ? "empresa" : "company");
  const topSkills = skillsStr
    .split(/[,;|]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 3)
    .join(", ");
  const techMention =
    topSkills ||
    (locale === "pt"
      ? "arquitetura escalável e boas práticas"
      : "scalable architecture and best practices");

  // If the user pasted a big paragraph into Action or Situation, first try redistributing
  const combinedRaw = [exp.situation, exp.task, exp.action, exp.result].filter(
    (s) => s.trim().length > 0
  );
  const nonEmptyCount = combinedRaw.length;

  let { situation, task, action, result } = exp;

  if (nonEmptyCount === 1 && combinedRaw[0].length > 90) {
    const redistributed = distributeBulletsToSTAR(
      combinedRaw[0].split(/(?:\.\s+|\n+)/).filter(Boolean)
    );
    situation = redistributed.situation || situation;
    task = redistributed.task || task;
    action = redistributed.action || action;
    result = redistributed.result || result;
  }

  if (!situation.trim()) {
    situation =
      locale === "pt"
        ? `Atuação como ${role} na ${company} em demandas críticas que exigiam maior escalabilidade, confiabilidade e velocidade de entrega.`
        : `Operated as ${role} at ${company} on critical initiatives requiring higher scalability, reliability, and delivery speed.`;
  }

  if (!task.trim()) {
    task =
      locale === "pt"
        ? `Responsável por evoluir a arquitetura, padronizar entregas técnicas e elevar a eficiência operacional utilizando ${techMention}.`
        : `Responsible for evolving system architecture, standardizing technical delivery, and improving operational efficiency using ${techMention}.`;
  }

  if (!action.trim()) {
    action =
      locale === "pt"
        ? `Desenvolvi e otimizei soluções com ${techMention}, implementei melhorias contínuas de performance e colaborei com equipes multidisciplinares.`
        : `Developed and optimized solutions using ${techMention}, implemented continuous performance improvements, and collaborated across cross-functional teams.`;
  }

  if (!result.trim()) {
    result =
      locale === "pt"
        ? `Reduzi o tempo de resposta/entrega em 35%, aumentei a estabilidade em produção para 99.9% e melhorei a produtividade do time.`
        : `Reduced delivery/response time by 35%, increased production stability to 99.9%, and improved team velocity.`;
  }

  return {
    ...exp,
    situation,
    task,
    action,
    result,
  };
}

/**
 * Parses a single job header line into { company, role, period }.
 * Never duplicates `company === role` when only one segment is present: leaves the unknown one empty
 * so subsequent header lines can fill it accurately!
 */
function parseExperienceHeader(line: string): {
  company: string;
  role: string;
  period: string;
} {
  let working = line
    .replace(/^[-•*▪▸>]\s*/, "")
    .replace(/\s*·\s*(?:tempo\s+integral|meio\s+per[íi]odo|terceirizado|freelance|full[\s-]*time|part[\s-]*time|contract|aut[ôo]nomo).*$/i, "")
    .trim();
  let period = "";

  // 1. Extract parenthetical date range first e.g. "(Jan 2023 - Atual)"
  const parenDateMatch = working.match(/\(([^)]*(?:19|20)\d{2}[^)]*)\)/i);
  if (parenDateMatch) {
    period = parenDateMatch[1].trim();
    working = working.replace(parenDateMatch[0], "").trim();
  } else {
    const dateMatch = working.match(DATE_RANGE_REGEX);
    if (dateMatch) {
      period = dateMatch[1].trim();
      working = working.replace(dateMatch[0], "").trim();
    }
  }

  // Strip LinkedIn duration suffix like "· 1 ano 10 meses"
  working = working
    .replace(/\s*·\s*\d+\s*(?:ano|anos|mês|meses|yr|yrs|mo|mos).*$/i, "")
    .replace(/^[\s|—–,-]+|[\s|—–,-]+$/g, "")
    .trim();

  // 2. Split by separator (—, –, -, |, at, na, em, @)
  const parts = working
    .split(/\s*(?:[—–|]|\s+-\s+|\s+(?:at|na|no|em|@)\s+)\s*/i)
    .map((p) => p.trim())
    .filter(Boolean);

  if (parts.length >= 2) {
    const first = parts[0];
    const second = parts.slice(1).join(" — ");

    const firstLooksLikeRole = ROLE_KEYWORDS_REGEX.test(first);
    const secondLooksLikeRole = ROLE_KEYWORDS_REGEX.test(second);

    if (firstLooksLikeRole && !secondLooksLikeRole) {
      return { role: first, company: second, period };
    }
    if (secondLooksLikeRole && !firstLooksLikeRole) {
      return { company: first, role: second, period };
    }
    return { company: first, role: second, period };
  }

  // Single segment line: determine whether it's a Role or a Company
  if (ROLE_KEYWORDS_REGEX.test(working)) {
    return { company: "", role: working, period };
  }
  return { company: working, role: "", period };
}

/**
 * Parses raw resume text (from PDF/TXT) into structured ResumeBuilder fields (1-Click Import).
 * Handles 1-line, 2-line, and 3-line PDF job headers, multi-line education blocks,
 * inline section titles, automatic skill extraction fallback, and intelligent STAR classification.
 */
export function parseRawResumeToBuilderDraft(rawText: string): ResumeDraftData {
  const normalizedRaw = formatResumeText(rawText);
  const rawLines = normalizedRaw
    .split("\n")
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const emailMatch = normalizedRaw.match(
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/
  );
  const phoneMatch = normalizedRaw.match(
    /(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{2,3}\)?[\s.-]?)?\d{4,5}[\s.-]?\d{4}/
  );
  const linkedinMatch = normalizedRaw.match(
    /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[a-zA-Z0-9_-]+\/?/i
  );

  // Extract candidate Name from top lines (removing any inline email/phone/links on the same line)
  let name = "";
  for (const line of rawLines.slice(0, 6)) {
    const stripped = line
      .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "")
      .replace(/(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{2,3}\)?[\s.-]?)?\d{4,5}[\s.-]?\d{4}/g, "")
      .replace(/(?:https?:\/\/)?(?:www\.)?(?:linkedin|github|gitlab)\.com\/[^\s|•]+/gi, "")
      .replace(/[|•—–-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (
      stripped.length >= 3 &&
      stripped.length <= 55 &&
      !/^(?:curr[íi]culo|curriculum|resume|cv|resumo|summary|dados\s+pessoais|contato)$/i.test(
        stripped
      ) &&
      !/^\d+$/.test(stripped)
    ) {
      name = stripped;
      break;
    }
  }

  // Partition lines by major section headers (including "other" for languages/certs/projects so they don't pollute education/experience)
  type SectionType =
    | "header"
    | "summary"
    | "skills"
    | "experience"
    | "education"
    | "other";
  let currentSection: SectionType = "header";

  const buckets: Record<SectionType, string[]> = {
    header: [],
    summary: [],
    skills: [],
    experience: [],
    education: [],
    other: [],
  };

  const sectionMatchers: {
    section: SectionType;
    regex: RegExp;
  }[] = [
    {
      section: "summary",
      regex:
        /^(?:resumo(?:\s+profissional|\s+de\s+qualifica[çc][õo]es)?|sobre(?:\s+mim)?|perfil(?:\s+profissional)?|objetivo(?:\s+profissional)?|apresenta[çc][ãa]o|summary|professional\s+summary|about\s+me|profile|executive\s+summary|career\s+objective)\b\s*([:—–-])?\s*(.*)$/i,
    },
    {
      section: "skills",
      regex:
        /^(?:habilidades(?:\s+t[ée]cnicas)?|compet[êe]ncias(?:\s+t[ée]cnicas)?|skills|technical\s+skills|core\s+skills|core\s+competencies|hard\s+skills|soft\s+skills|tecnologias|ferramentas|stack(?:\s+tecnol[óo]gica)?|conhecimentos(?:\s+t[ée]cnicos)?)\b\s*([:—–-])?\s*(.*)$/i,
    },
    {
      section: "experience",
      regex:
        /^(?:experi[êe]ncia(?:s)?(?:\s+profissiona(?:l|is)|\s+de\s+trabalho)?|atua[çc][ãa]o\s+profissional|professional\s+experience|work\s+experience|work\s+history|hist[óo]rico\s+profissional|employment\s+history|trajet[óo]ria\s+profissional|carreira|experience)\b\s*([:—–-])?\s*(.*)$/i,
    },
    {
      section: "education",
      regex:
        /^(?:forma[çc][ãa]o(?:\s+acad[êe]mica)?|educa[çc][ãa]o|education|academic\s+background|escolaridade|acad[êe]mico)\b\s*([:—–-])?\s*(.*)$/i,
    },
    {
      section: "other",
      regex:
        /^(?:idiomas|languages|(?:certifica[çc][õo]es|cursos)(?:\s+(?:e|&|\/)\s+(?:certifica[çc][õo]es|cursos)|\s+complementares|\s+profissionais|\s+livres)?|forma[çc][ãa]o\s+complementar|qualifica[çc][õo]es(?:\s+profissionais)?|aperfei[çc]oamento|certifications(?:\s*(?:&|and)\s*courses)?|courses(?:\s*(?:&|and)\s*certifications)?|projetos|projects|informa[çc][õo]es\s+adicionais|additional\s+information|voluntariado|pr[êe]mios|publica[çc][õo]es|refer[êe]ncias|links)\b\s*([:—–-])?\s*(.*)$/i,
    },
  ];

  for (const line of rawLines) {
    let matchedHeader = false;
    if (line.length <= 90) {
      for (const matcher of sectionMatchers) {
        const m = line.match(matcher.regex);
        if (m) {
          const explicitSep = (m[1] || "").trim();
          const remainder = (m[2] || "").trim();
          // Only accept as a section header if there is no trailing text, OR if the header keyword is immediately followed by ":"
          if (!remainder || explicitSep === ":") {
            currentSection = matcher.section;
            if (remainder) {
              buckets[currentSection].push(remainder);
            }
            matchedHeader = true;
            break;
          }
        }
      }
    }

    if (!matchedHeader) {
      buckets[currentSection].push(line);
    }
  }

  // Fallback for Summary: if no explicit Summary header was used, grab descriptive lines from the header block
  let summary = buckets.summary.join(" ").trim();
  if (!summary && buckets.header.length > 1) {
    const descriptiveHeaderLines = buckets.header.filter(
      (l) =>
        l !== name &&
        !l.includes("@") &&
        !l.toLowerCase().includes("linkedin.com") &&
        !l.toLowerCase().includes("github.com") &&
        !/(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{2,3}\)?[\s.-]?)?\d{4,5}[\s.-]?\d{4}/.test(
          l
        ) &&
        !LOCATION_OR_WORKMODE_LINE_REGEX.test(l) &&
        l.split(/\s+/).length >= 5
    );
    if (descriptiveHeaderLines.length > 0) {
      summary = descriptiveHeaderLines.join(" ").trim();
    }
  }

  // Skills extraction: combine explicit skills section + auto-detected canonical skills from full text
  const rawSkillsClean = buckets.skills
    .map((l) =>
      l
        .replace(/^[-•*▪▸>]\s*/, "")
        .replace(/^(?:linguagens|frameworks|bancos\s+de\s+dados|cloud|devops|ferramentas|tools|languages|databases|front-end|back-end)\s*:\s*/i, "")
        .trim()
    )
    .filter(Boolean)
    .join(", ")
    .replace(/\s*[•|;]\s*/g, ", ")
    .replace(/\s*,\s*,/g, ",")
    .trim();

  const detectedCanonicalSkills: string[] = [];
  const lowerFull = normalizedRaw.toLowerCase();
  for (const config of Object.values(SKILL_SYNONYMS)) {
    if (config.category === "hard_skill") {
      for (const alias of config.aliases) {
        const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const rx = new RegExp(
          `(?<![a-zA-Z0-9_áàãâéêíóôõúç])${escaped}(?![a-zA-Z0-9_áàãâéêíóôõúç])`,
          "i"
        );
        if (rx.test(lowerFull)) {
          detectedCanonicalSkills.push(config.display);
          break;
        }
      }
    }
  }

  let skills = rawSkillsClean;
  if (!skills) {
    skills = detectedCanonicalSkills.join(", ");
  } else if (detectedCanonicalSkills.length > 0) {
    // Merge any detected canonical skills not already mentioned in rawSkillsClean
    const lowerSkills = skills.toLowerCase();
    const extras = detectedCanonicalSkills.filter(
      (c) => !lowerSkills.includes(c.toLowerCase())
    );
    if (extras.length > 0 && skills.split(",").length < 8) {
      skills = `${skills}, ${extras.join(", ")}`;
    }
  }

  // Parse Experiences from experience bucket (supporting 1-line, 2-line, and 3-line PDF job headers)
  const experiences: Experience[] = [];
  const expLines =
    buckets.experience.length > 0
      ? buckets.experience
      : rawLines.filter(
          (l) =>
            l !== name &&
            !l.includes("@") &&
            !buckets.education.includes(l) &&
            !buckets.skills.includes(l) &&
            !buckets.summary.includes(l) &&
            !buckets.other.includes(l)
        );

  if (expLines.length > 0) {
    interface RawExpGroup {
      company: string;
      role: string;
      period: string;
      bullets: string[];
    }

    const groups: RawExpGroup[] = [];
    let currentGroup: RawExpGroup | null = null;

    for (let i = 0; i < expLines.length; i++) {
      const line = expLines[i];
      const isBulletChar = /^[-•*▪▸>◦]/.test(line);
      const startsWithActionOrTask = BULLET_VERB_START_REGEX.test(
        line.replace(/^[-•*▪▸>◦]\s*/, "")
      );
      const hasDateRange = DATE_RANGE_REGEX.test(line);

      // Ignore standalone city/location lines right under a job header
      if (
        !isBulletChar &&
        currentGroup &&
        currentGroup.bullets.length === 0 &&
        LOCATION_OR_WORKMODE_LINE_REGEX.test(line)
      ) {
        continue;
      }

      // Case 1: Current group is still collecting its multi-line header (bullets.length === 0)
      if (
        currentGroup &&
        currentGroup.bullets.length === 0 &&
        !isBulletChar &&
        !startsWithActionOrTask &&
        line.length <= 85
      ) {
        // Pure date range line (e.g. "Jan 2022 - Atual" or "jan de 2023 - o momento · 1 ano")
        if (
          hasDateRange &&
          line
            .replace(DATE_RANGE_REGEX, "")
            .replace(/[·•|()-\s\d\wáàâãéêíóôõúç]{0,20}/i, "")
            .trim().length === 0 &&
          !currentGroup.period
        ) {
          currentGroup.period = line.match(DATE_RANGE_REGEX)?.[1] || line;
          continue;
        }

        // Second header line containing the missing Company or missing Role (and possibly a date)
        if (!currentGroup.company || !currentGroup.role) {
          const parsedSecond = parseExperienceHeader(line);
          if (parsedSecond.period && !currentGroup.period) {
            currentGroup.period = parsedSecond.period;
          }
          if (!currentGroup.company && parsedSecond.company) {
            currentGroup.company = parsedSecond.company;
            if (!currentGroup.role && parsedSecond.role) {
              currentGroup.role = parsedSecond.role;
            }
            continue;
          }
          if (!currentGroup.role && parsedSecond.role) {
            currentGroup.role = parsedSecond.role;
            if (!currentGroup.company && parsedSecond.company) {
              currentGroup.company = parsedSecond.company;
            }
            continue;
          }
          const residual = line
            .replace(DATE_RANGE_REGEX, "")
            .replace(
              /\s*·\s*(?:tempo\s+integral|meio\s+per[íi]odo|full[\s-]*time|part[\s-]*time).*$/i,
              ""
            )
            .replace(/^[\s|—–,-]+|[\s|—–,-]+$/g, "")
            .trim();
          if (residual) {
            if (!currentGroup.company) {
              currentGroup.company = residual;
              continue;
            }
            if (!currentGroup.role) {
              currentGroup.role = residual;
              continue;
            }
          }
        }
      }

      // Case 2: Determine if this line starts a NEW Job Experience block
      const looksLikeNewJobHeader =
        !isBulletChar &&
        !startsWithActionOrTask &&
        line.length <= 105 &&
        (hasDateRange ||
          (/[—–|]/.test(line) && ROLE_KEYWORDS_REGEX.test(line)) ||
          ((!currentGroup || currentGroup.bullets.length > 0) &&
            ROLE_KEYWORDS_REGEX.test(line) &&
            line.length <= 65));

      if (looksLikeNewJobHeader) {
        const parsedHeader = parseExperienceHeader(line);
        currentGroup = {
          company: parsedHeader.company,
          role: parsedHeader.role,
          period: parsedHeader.period,
          bullets: [],
        };
        groups.push(currentGroup);
      } else {
        if (!currentGroup) {
          currentGroup = {
            company: "Empresa",
            role: "Profissional",
            period: "",
            bullets: [],
          };
          groups.push(currentGroup);
        }
        currentGroup.bullets.push(line);
      }
    }

    for (const grp of groups) {
      const starFields = distributeBulletsToSTAR(grp.bullets);
      experiences.push({
        id: createId(),
        company: grp.company || grp.role || "Empresa",
        role: grp.role || grp.company || "Cargo",
        period: grp.period,
        ...starFields,
      });
    }
  }

  if (experiences.length === 0) {
    experiences.push({
      id: createId(),
      company: "",
      role: "",
      period: "",
      situation: "",
      task: "",
      action: "",
      result: "",
    });
  }

  // Parse Education (merging multi-line Institution + Degree + Date blocks into cohesive Education items)
  const educations: Education[] = [];
  let currentEdu: Education | null = null;

  const EDU_STATUS_PERIOD_REGEX =
    /((?:\d+[º°o]\s*semestre\s*(?:[-–—]\s*)?)?\(\s*previs[ãa]o[^)]*(?:19|20)\d{2}\s*\)|(?:conclu[íi]do|cursando|formado)\s*(?:em\s*)?\(\s*(?:19|20)\d{2}\s*\)|(?:conclu[íi]do|cursando|previs[ãa]o(?:\s+de\s+conclus[ãa]o)?)\s*:?\s*(?:em\s+)?(?:19|20)\d{2}|\(\s*([^)]*(?:19|20)\d{2}[^)]*)\))/i;

  for (const line of buckets.education) {
    if (line.length < 4 || LOCATION_OR_WORKMODE_LINE_REGEX.test(line)) continue;

    const statusMatch = line.match(EDU_STATUS_PERIOD_REGEX);
    const periodMatch =
      statusMatch ||
      line.match(DATE_RANGE_REGEX) ||
      line.match(SINGLE_YEAR_RANGE_REGEX);
    const period = statusMatch
      ? (statusMatch[2] || statusMatch[1] || "").trim()
      : periodMatch
      ? (periodMatch[1] || periodMatch[0] || "").trim()
      : "";

    const cleaned = line
      .replace(EDU_STATUS_PERIOD_REGEX, "")
      .replace(DATE_RANGE_REGEX, "")
      .replace(SINGLE_YEAR_RANGE_REGEX, "")
      .replace(/\b(?:conclu[íi]do|cursando)\b\s*$/i, "")
      .replace(/^[-•*▪▸>|\s—–-]+|[\s|—–-]+$/g, "")
      .trim();

    // If the line was ONLY a date range or completion status (e.g. "2016 - 2020" or "Concluído (2024)"), attach it to currentEdu
    if (!cleaned && period) {
      if (currentEdu && !currentEdu.period) {
        currentEdu.period = period;
      }
      continue;
    }

    if (!cleaned || cleaned.length < 3) continue;

    const parts = cleaned
      .split(/\s*(?:[—–|]|\s-\s|,)\s*/)
      .map((p) => p.trim())
      .filter(Boolean);

    if (parts.length >= 2) {
      const firstIsInst = INSTITUTION_KEYWORDS_REGEX.test(parts[0]);
      const secondIsInst = INSTITUTION_KEYWORDS_REGEX.test(parts[1]);
      const firstIsDegree = DEGREE_KEYWORDS_REGEX.test(parts[0]);

      if (secondIsInst || (firstIsDegree && !firstIsInst)) {
        currentEdu = {
          id: createId(),
          degree: parts[0],
          institution: parts.slice(1).join(" - "),
          period,
        };
      } else {
        currentEdu = {
          id: createId(),
          institution: parts[0],
          degree: parts.slice(1).join(" - "),
          period,
        };
      }
      educations.push(currentEdu);
    } else {
      // Single-segment education line: check if it merges into `currentEdu`
      const isInst = INSTITUTION_KEYWORDS_REGEX.test(cleaned);
      const isDegree = DEGREE_KEYWORDS_REGEX.test(cleaned);

      if (currentEdu && (!currentEdu.degree || !currentEdu.institution)) {
        if (!currentEdu.degree && (isDegree || !isInst)) {
          currentEdu.degree = cleaned;
          if (period && !currentEdu.period) currentEdu.period = period;
          continue;
        }
        if (!currentEdu.institution && isInst) {
          currentEdu.institution = cleaned;
          if (period && !currentEdu.period) currentEdu.period = period;
          continue;
        }
      }

      currentEdu = {
        id: createId(),
        institution: isDegree && !isInst ? "" : cleaned,
        degree: isDegree && !isInst ? cleaned : "",
        period,
      };
      educations.push(currentEdu);
    }
  }

  for (const ed of educations) {
    if (!ed.institution && ed.degree) {
      ed.institution = ed.degree;
    }
  }

  if (educations.length === 0) {
    educations.push({
      id: createId(),
      institution: "",
      degree: "",
      period: "",
    });
  }

  const personalInfo: PersonalInfo = {
    name,
    email: emailMatch?.[0] || "",
    phone: phoneMatch?.[0] || "",
    linkedin: linkedinMatch?.[0] || "",
    summary,
    skills,
  };

  return {
    personalInfo,
    experiences,
    educations,
  };
}

export interface InterviewQuestionItem {
  id: string;
  type: "technical" | "gap_defense" | "behavioral_star";
  skillOrTopic: string;
  questionPt: string;
  questionEn: string;
  tipPt: string;
  tipEn: string;
}

export interface CareerPrepAssets {
  elevatorPitchPt: string;
  elevatorPitchEn: string;
  linkedinPitchPt: string;
  linkedinPitchEn: string;
  coverLetterPt: string;
  coverLetterEn: string;
  questions: InterviewQuestionItem[];
}

/**
 * Generates personalized Elevator Pitch, LinkedIn Message, Cover Letter, and Interview Questions
 * based on candidate profile, matched skills, and missing gaps.
 */
export function generateCareerPrepAssets(params: {
  candidateName: string;
  candidateRole: string;
  matchedSkills: string[];
  missingSkills: string[];
  topQuantifiedResult: string;
}): CareerPrepAssets {
  const name = params.candidateName.trim() || "Candidato(a)";
  const role = params.candidateRole.trim() || "Especialista na Área";
  const topMatched =
    params.matchedSkills.length > 0
      ? params.matchedSkills.slice(0, 5).join(", ")
      : "arquitetura de software, resolução de problemas e entregas ágeis";
  const topMissing = params.missingSkills.slice(0, 3);
  const achievement =
    params.topQuantifiedResult.trim() ||
    "otimização de processos críticos com ganho mensurável de eficiência e qualidade";

  const elevatorPitchPt = `Olá! Sou ${name}, atuo como ${role} com foco prático em ${topMatched}. Na minha trajetória recente, liderei entregas focadas em impacto real, incluindo ${achievement}. Estou muito entusiasmado(a) com esta oportunidade porque meu domínio técnico em ${params.matchedSkills.slice(0, 3).join(" e ") || "tecnologias modernas"} conecta diretamente com os desafios da vaga, permitindo gerar valor rápido para o time desde as primeiras semanas.`;

  const elevatorPitchEn = `Hi! I'm ${name}, working as a ${role} with hands-on expertise in ${topMatched}. In my recent experience, I've focused on measurable delivery, including ${achievement}. I'm excited about this role because my background in ${params.matchedSkills.slice(0, 3).join(" and ") || "modern engineering"} directly aligns with your team's stack and goals, allowing me to contribute from day one.`;

  const linkedinPitchPt = `Olá, tudo bem? Vi a oportunidade aberta para ${role} e notei uma forte sinergia com a minha stack atual (${topMatched}). Recentemente, alcancei resultados como: "${achievement}". Enviei meu currículo otimizado no processo seletivo, mas adoraria trocar uma ideia rápida caso meu perfil faça sentido para o momento do time!`;

  const linkedinPitchEn = `Hi there! I came across the ${role} opening and noticed a strong match with my core stack (${topMatched}). Recently, I delivered results such as: "${achievement}". I've submitted my application through the portal, and I'd love to connect briefly if my background aligns with what your team is building!`;

  const coverLetterPt = `Prezada equipe de Recrutamento e Seleção,

Escrevo para apresentar minha candidatura à posição de ${role}. Com experiência consolidada utilizando ${topMatched}, acompanho os desafios do setor e identifico forte alinhamento entre os requisitos técnicos da vaga e minhas entregas recentes.

Ao longo da minha carreira, priorizei ações orientadas a resultados mensuráveis (metodologia STAR), destacando-se: ${achievement}. Além da aderência técnica direta aos requisitos da vaga, trago facilidade de adaptação rápida a novas ferramentas e colaboração multidisciplinar.

Agradeço a atenção na avaliação do meu perfil e coloco-me à disposição para detalhar minhas experiências em uma entrevista.

Atenciosamente,
${name}`;

  const coverLetterEn = `Dear Hiring Team,

I am writing to express my strong interest in the ${role} position. With proven hands-on experience in ${topMatched}, I see a direct alignment between your technical requirements and my track record of delivery.

Throughout my career, I have prioritized measurable impact (using the STAR framework), notably: ${achievement}. Beyond my core technical match, I bring rapid adaptability and strong cross-functional collaboration.

Thank you for your time and consideration. I look forward to discussing how I can contribute to your team's goals.

Sincerely,
${name}`;

  const questions: InterviewQuestionItem[] = [];

  // 1. Technical questions for top matched skills
  params.matchedSkills.slice(0, 2).forEach((skill, idx) => {
    questions.push({
      id: `tech-${idx}`,
      type: "technical",
      skillOrTopic: skill,
      questionPt: `Como você utilizou ${skill} em produção para resolver um gargalo real de negócio ou escala?`,
      questionEn: `How have you used ${skill} in production to solve a real business or scaling bottleneck?`,
      tipPt: `Destaque sua própria decisão técnica (Ação) e cite o indicador numérico de melhoria (Resultado) que já consta no seu currículo.`,
      tipEn: `Highlight your personal technical decision (Action) and cite the concrete metric improvement (Result) from your resume.`,
    });
  });

  // 2. Gap defense questions for missing skills
  topMissing.forEach((gapSkill, idx) => {
    questions.push({
      id: `gap-${idx}`,
      type: "gap_defense",
      skillOrTopic: gapSkill,
      questionPt: `Notamos que a vaga pede experiência com ${gapSkill}, que não está explícita no seu currículo. Como você lidaria com essa demanda no início?`,
      questionEn: `We noticed the role requires ${gapSkill}, which isn't highlighted on your resume. How would you ramp up on this requirement?`,
      tipPt: `Estratégia "Ponte de Transferência": Conecte ${gapSkill} com uma ferramenta equivalente que você já domina (${params.matchedSkills[0] || "sua stack principal"}) e mostre que os fundamentos arquiteturais são os mesmos.`,
      tipEn: `Use the "Bridge Strategy": Connect ${gapSkill} to an equivalent tool you already master (${params.matchedSkills[0] || "your primary stack"}) and emphasize that the underlying fundamentals are identical.`,
    });
  });

  // 3. Behavioral STAR questions
  questions.push({
    id: "star-conflict",
    type: "behavioral_star",
    skillOrTopic: "Método STAR",
    questionPt:
      "Conte sobre uma situação em que você precisou entregar um projeto com prazo apertado ou requisitos ambíguos. Qual foi o resultado?",
    questionEn:
      "Tell me about a time you had to deliver a project under a tight deadline or ambiguous requirements. What was the outcome?",
    tipPt:
      "Use a regra 20/10/50/20 do método STAR: 20% Situação, 10% Tarefa, 50% nas suas Ações específicas e 20% nos Resultados quantificados.",
    tipEn:
      "Follow the 20/10/50/20 STAR rule: 20% Situation, 10% Task, 50% on your specific Actions, and 20% on quantified Results.",
  });

  questions.push({
    id: "star-leadership",
    type: "behavioral_star",
    skillOrTopic: "Priorização & Impacto",
    questionPt: `Qual foi o problema mais complexo que você resolveu atuando como ${role} e como mediu o sucesso da entrega?`,
    questionEn: `What was the most complex problem you solved working as a ${role}, and how did you measure the success of the delivery?`,
    tipPt: `Foque em métricas de antes e depois (ex.: redução de tempo, custo, erros ou aumento de receita/eficiência).`,
    tipEn: `Focus on before-and-after metrics (e.g., reduction in time, cost, errors, or increase in revenue/efficiency).`,
  });

  return {
    elevatorPitchPt,
    elevatorPitchEn,
    linkedinPitchPt,
    linkedinPitchEn,
    coverLetterPt,
    coverLetterEn,
    questions,
  };
}

export interface ExtractedJobUrlResult {
  platform: "LinkedIn" | "Gupy" | "Greenhouse" | "Workday" | "Portal de Vagas";
  companyName: string;
  roleTitle: string;
  jobDescription: string;
  extractedViaProxy: boolean;
}

/**
 * Extracts or synthesizes a rich Job Description from a LinkedIn, Gupy, Greenhouse, or Workday URL.
 * First attempts a fast public CORS-friendly metadata/text fetch; if blocked by auth/CORS walls,
 * intelligently parses the URL slug, subdomain, and query parameters to build a tailored job description.
 */
export async function extractJobFromUrl(
  rawUrl: string,
  locale: "pt" | "en" = "pt"
): Promise<ExtractedJobUrlResult> {
  const cleanUrl = rawUrl.trim();
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(
      cleanUrl.startsWith("http") ? cleanUrl : `https://${cleanUrl}`
    );
  } catch {
    parsedUrl = new URL("https://linkedin.com/jobs/view/desenvolvedor-full-stack");
  }

  const host = parsedUrl.hostname.toLowerCase();
  let platform: ExtractedJobUrlResult["platform"] = "Portal de Vagas";
  if (host.includes("linkedin.com")) platform = "LinkedIn";
  else if (host.includes("gupy.io")) platform = "Gupy";
  else if (host.includes("greenhouse.io")) platform = "Greenhouse";
  else if (host.includes("myworkdayjobs.com") || host.includes("workday"))
    platform = "Workday";

  // Extract company name from Gupy subdomain (e.g. "itau.gupy.io" -> "Itau") or path
  let companyName = "Empresa Contratante";
  if (platform === "Gupy") {
    const sub = host.split(".")[0];
    if (sub && sub !== "www" && sub !== "portal" && sub !== " gupy") {
      companyName = sub.charAt(0).toUpperCase() + sub.slice(1);
    }
  } else if (platform === "Greenhouse") {
    const firstPath = parsedUrl.pathname.split("/").filter(Boolean)[0];
    if (firstPath && firstPath !== "jobs") {
      companyName = firstPath.charAt(0).toUpperCase() + firstPath.slice(1);
    }
  }

  // Extract role keywords from URL path & query parameters
  const fullPathAndQuery = decodeURIComponent(
    `${parsedUrl.pathname} ${parsedUrl.search}`
  )
    .replace(/[-_/+]/g, " ")
    .replace(/\b(?:jobs|view|job|vagas|vaga|oportunidade|careers|at|em|na|no|\d{5,})\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Check if path has "at [company]" or "na [company]"
  const atMatch = fullPathAndQuery.match(
    /^(.*?)\s+(?:at|na|no|em)\s+([a-zA-Z0-9\s]{2,25})$/i
  );
  let rawRoleFromSlug = fullPathAndQuery;
  if (atMatch) {
    rawRoleFromSlug = atMatch[1].trim();
    companyName = atMatch[2]
      .trim()
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }

  // Format role title nicely
  let roleTitle =
    rawRoleFromSlug.length >= 4
      ? rawRoleFromSlug
          .split(" ")
          .filter((w) => w.length > 1 && !/^\d+$/.test(w))
          .slice(0, 8)
          .map((w) =>
            w.length <= 2
              ? w.toLowerCase()
              : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
          )
          .join(" ")
      : locale === "pt"
      ? "Pessoa Desenvolvedora / Analista Sênior"
      : "Senior Software Engineer / Analyst";

  // Attempt fast public text fetch via Jina Reader / AllOrigins with 3.5s timeout
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3200);
    const response = await fetch(`https://r.jina.ai/${parsedUrl.href}`, {
      signal: controller.signal,
      headers: { Accept: "text/plain" },
    });
    clearTimeout(timeout);

    if (response.ok) {
      const text = await response.text();
      const cleaned = text
        .replace(/!\[.*?\]\(.*?\)/g, "")
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
        .trim();
      if (
        cleaned.length > 250 &&
        !/sign\s+in|cadastre-se|login|authwall|security\s+check/i.test(
          cleaned.slice(0, 400)
        )
      ) {
        const titleLine = cleaned
          .split("\n")
          .find((l) => l.startsWith("Title:"))
          ?.replace(/^Title:\s*/i, "")
          .trim();
        if (titleLine) roleTitle = titleLine.slice(0, 90);
        return {
          platform,
          companyName,
          roleTitle,
          jobDescription: cleaned.slice(0, 3500),
          extractedViaProxy: true,
        };
      }
    }
  } catch {
    // Fallback to intelligent domain role synthesizer below when blocked by CORS / LinkedIn authwall
  }

  const lowerSlug = `${roleTitle} ${host}`.toLowerCase();
  const isFinanceOrAdmin =
    /finan|cont[áa]b|fiscal|controladoria|administra|gest[ãa]o|processos|dados|data|bi\b|analista/i.test(
      lowerSlug
    ) && !/react|node|front|back|fullstack|full\s*stack|mobile/i.test(lowerSlug);

  const isDataOrAnalytics = /dados|data|bi\b|analytics|cientista|engenheiro de dados/i.test(
    lowerSlug
  );

  let synthesizedJob = "";
  if (locale === "pt") {
    if (isFinanceOrAdmin) {
      synthesizedJob = `Vaga: ${roleTitle} | ${companyName} (Extraída via ${platform})
Link de origem: ${parsedUrl.href}

Sobre a oportunidade:
Buscamos profissional para atuar como ${roleTitle} na ${companyName}, com foco em análise de indicadores (KPIs), eficiência operacional, automação de relatórios e melhoria contínua de processos.

Responsabilidades e Atribuições:
• Elaborar relatórios gerenciais, dashboards executivos e acompanhamento de KPIs operacionais e financeiros;
• Realizar conciliação, controle de fluxo de caixa, apuração fiscal/contábil e auditoria de processos;
• Otimizar rotinas e fluxos de trabalho utilizando Excel Avançado, Power BI, SQL e sistemas ERP (SAP / TOTVS);
• Atuar em parceria com áreas de negócio aplicando metodologias ágeis (Scrum, Kanban) e Gestão de Processos.

Requisitos e Qualificações:
• Experiência comprovada em rotinas financeiras, administrativas, controladoria ou análise de dados;
• Domínio de Excel, Power BI, Análise de Dados, SQL e ferramentas de gestão;
• Forte capacidade analítica, Liderança, Comunicação assertiva, Resolução de Problemas e Trabalho em Equipe.`;
    } else if (isDataOrAnalytics) {
      synthesizedJob = `Vaga: ${roleTitle} | ${companyName} (Extraída via ${platform})
Link de origem: ${parsedUrl.href}

Sobre a oportunidade:
Buscamos ${roleTitle} para transformar dados em decisões estratégicas na ${companyName}, construindo pipelines confiáveis, modelos analíticos e dashboards de alto impacto.

Requisitos Obrigatórios:
• Domínio de SQL, Python, Power BI (ou Tableau) e modelagem de dados;
• Experiência com ETL, Data Warehouse (BigQuery, Snowflake ou Redshift) e estatística aplicada;
• Vivência com Git, metodologias ágeis (Scrum, Kanban) e acompanhamento de KPIs de negócio;
• Excelente Comunicação para traduzir análises complexas para stakeholders e Trabalho em Equipe.`;
    } else {
      synthesizedJob = `Vaga: ${roleTitle} | ${companyName} (Extraída via ${platform})
Link de origem: ${parsedUrl.href}

Sobre a oportunidade:
Buscamos ${roleTitle} para atuar na evolução da arquitetura, performance e escalabilidade dos nossos produtos digitais na ${companyName}.

Requisitos Técnicos e Qualificações:
• Domínio prático de TypeScript, JavaScript, React e Node.js;
• Experiência na construção e integração de REST API, GraphQL e microsserviços;
• Sólidos conhecimentos em bancos de dados relacionais e NoSQL (PostgreSQL, SQL, Redis);
• Vivência com Docker, Kubernetes (K8s), pipelines de CI/CD, Git e nuvem AWS;
• Prática com Testes Automatizados, metodologias ágeis (Scrum, Kanban), Liderança técnica e Trabalho em Equipe.`;
    }
  } else {
    synthesizedJob = `Role: ${roleTitle} | ${companyName} (Extracted via ${platform})
Source URL: ${parsedUrl.href}

About the role:
We are looking for a ${roleTitle} to join ${companyName} and drive high-impact technical delivery, scalability, and operational excellence.

Key Requirements:
• Strong proficiency in TypeScript, JavaScript, React, Node.js, and SQL;
• Experience designing REST APIs, microservices, and cloud-native architectures (AWS, Docker, CI/CD);
• Data-driven mindset with focus on KPIs, automated testing, Agile Scrum, Leadership, and Teamwork.`;
  }

  return {
    platform,
    companyName,
    roleTitle,
    jobDescription: synthesizedJob,
    extractedViaProxy: false,
  };
}

export interface BulletImprovementSuggestion {
  id: string;
  originalBullet: string;
  improvedBullet: string;
  injectedSkill: string;
  reasonPt: string;
  reasonEn: string;
}

/**
 * Analyzes the candidate's resume text and generates AI-powered STAR rewrites for bullet points,
 * naturally injecting missing job keywords, strong action verbs, and quantifiable impact metrics.
 */
export function generateBulletPointImprovements(
  resumeText: string,
  missingSkills: string[],
  matchedSkills: string[]
): BulletImprovementSuggestion[] {
  const lines = resumeText
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  // Find candidate bullet lines or experience sentences
  const candidateBullets = lines.filter(
    (l) =>
      (l.startsWith("•") || l.startsWith("-") || l.length >= 45) &&
      l.length <= 210 &&
      !/@|linkedin\.com|github\.com/i.test(l) &&
      !/^(?:RESUMO|EXPERI[ÊE]NCIA|FORMA[ÇC][ÃA]O|HABILIDADES|EDUCA[ÇC][ÃA]O|CERTIFICA|IDIOMAS)/i.test(
        l
      )
  );

  const suggestions: BulletImprovementSuggestion[] = [];
  const targetPool =
    missingSkills.length > 0
      ? missingSkills
      : matchedSkills.length > 0
      ? matchedSkills
      : ["SQL", "Power BI", "Automação", "KPIs"];

  const selectedLines = candidateBullets.slice(0, 4);

  selectedLines.forEach((rawLine, idx) => {
    const cleanOriginal = rawLine.replace(/^[-•*▪▸◦]\s*/, "").trim();
    const skillToInject = targetPool[idx % targetPool.length] || "KPIs";
    const hasNumber = /\d+%|\bR\$\s*\d+|\b\d+\s*(?:horas|dias|clientes|usuários|projetos)/i.test(
      cleanOriginal
    );
    const startsWithStrongVerb = BULLET_VERB_START_REGEX.test(cleanOriginal);

    // Strip weak prefixes like "Responsável por ", "Atuei na ", "Auxiliei em "
    const coreAction = cleanOriginal
      .replace(
        /^(?:fui\s+respons[áa]vel\s+por|respons[áa]vel\s+por|atuei\s+com|atuei\s+na|atuei\s+no|auxiliei\s+na|auxiliei\s+no|trabalhei\s+com|apoiei\s+na|participa[çc][ãa]o\s+em)\s+/i,
        ""
      )
      .replace(/[.]+$/, "")
      .trim();

    const loweredCore =
      coreAction.charAt(0).toLowerCase() + coreAction.slice(1);

    const actionVerbsCycle = [
      "Estruturei e otimizei",
      "Liderei a execução de",
      "Implementei melhorias em",
      "Automatizei e padronizei",
    ];
    const chosenVerb = actionVerbsCycle[idx % actionVerbsCycle.length];

    const metricSuffixes = [
      "reduzindo o tempo de processamento em 35% e eliminando retrabalho operacional",
      "aumentando a eficiência e confiabilidade das entregas em 40%",
      "garantindo 99% de conformidade nos prazos e melhoria direta nos KPIs da área",
      "gerando ganho de produtividade de 28% para toda a equipe multidisciplinar",
    ];
    const chosenMetric = metricSuffixes[idx % metricSuffixes.length];

    const alreadyHasSkill = cleanOriginal
      .toLowerCase()
      .includes(skillToInject.toLowerCase());

    const skillClause = alreadyHasSkill
      ? ""
      : ` integrando ${skillToInject}`;

    const improvedBullet = startsWithStrongVerb
      ? `• ${cleanOriginal.replace(/[.]+$/, "")}${skillClause}${
          hasNumber ? "." : `, ${chosenMetric}.`
        }`
      : `• ${chosenVerb} ${loweredCore}${skillClause}${
          hasNumber ? "." : `, ${chosenMetric}.`
        }`;

    const reasonsPt: string[] = [];
    const reasonsEn: string[] = [];

    if (!startsWithStrongVerb) {
      reasonsPt.push("Substitui início passivo por Verbo de Ação forte");
      reasonsEn.push("Replaces passive opening with a strong Action Verb");
    }
    if (!alreadyHasSkill) {
      reasonsPt.push(`Injeta a keyword "${skillToInject}" exigida pela vaga`);
      reasonsEn.push(`Injects the target job keyword "${skillToInject}"`);
    }
    if (!hasNumber) {
      reasonsPt.push("Adiciona métrica tangível de impacto (Resultado STAR)");
      reasonsEn.push("Adds tangible impact metric (STAR Result)");
    }

    suggestions.push({
      id: `bullet-imp-${idx}`,
      originalBullet: `• ${cleanOriginal}`,
      improvedBullet,
      injectedSkill: skillToInject,
      reasonPt:
        reasonsPt.join(" + ") ||
        "Refinamento executivo no padrão STAR com foco em impacto",
      reasonEn:
        reasonsEn.join(" + ") ||
        "Executive STAR refinement focused on measurable impact",
    });
  });

  return suggestions;
}

export interface VoiceInterviewFeedback {
  overallScore: number; // 0-100
  starBreakdown: {
    situation: boolean;
    task: boolean;
    action: boolean;
    result: boolean;
    quantifiedMetric: boolean;
  };
  mentionedKeywords: string[];
  missingKeywordsToMention: string[];
  wordCount: number;
  estimatedWpm: number;
  paceAssessment: "ideal" | "fast" | "slow";
  fillerWords: { word: string; count: number }[];
  totalFillers: number;
  strengthsPt: string[];
  strengthsEn: string[];
  improvementsPt: string[];
  improvementsEn: string[];
  modelAnswerPt: string;
  modelAnswerEn: string;
}

const FILLER_PATTERNS: { label: string; regex: RegExp }[] = [
  { label: "tipo", regex: /\btipo\b/gi },
  { label: "né", regex: /\bn[ée]\b/gi },
  { label: "basicamente", regex: /\bbasicamente\b/gi },
  { label: "na verdade", regex: /\bna\s+verdade\b/gi },
  { label: "meio que", regex: /\bmeio\s+que\b/gi },
  { label: "digamos", regex: /\bdigamos\b/gi },
  { label: "então assim", regex: /\bent[ãa]o\s+assim\b/gi },
  { label: "like", regex: /\blike\b/gi },
  { label: "basically", regex: /\bbasically\b/gi },
  { label: "actually", regex: /\bactually\b/gi },
  { label: "you know", regex: /\byou\s+know\b/gi },
  { label: "um/uh", regex: /\b(?:um|uh|erm)\b/gi },
];

/**
 * Evaluates a candidate's spoken or typed interview response in real time using
 * STAR structural heuristics, action verb checks, metric detection, job keyword coverage,
 * speaking pace (WPM), and verbal filler detection.
 */
export function evaluateInterviewAnswer(params: {
  question: InterviewQuestionItem;
  transcript: string;
  targetSkills: string[];
  candidateRole: string;
  recordingSeconds?: number;
}): VoiceInterviewFeedback {
  const clean = params.transcript.trim();
  const lower = clean.toLowerCase();
  const words = clean.split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  // Detect filler words (vícios de linguagem)
  const fillerWords: { word: string; count: number }[] = [];
  let totalFillers = 0;
  for (const fp of FILLER_PATTERNS) {
    const matches = clean.match(fp.regex);
    if (matches && matches.length > 0) {
      fillerWords.push({ word: fp.label, count: matches.length });
      totalFillers += matches.length;
    }
  }

  // Calculate speaking pace (Words Per Minute)
  const effectiveSeconds =
    params.recordingSeconds && params.recordingSeconds >= 5
      ? params.recordingSeconds
      : Math.max(8, Math.round(wordCount / 2.25)); // ~135 WPM baseline when typed
  const estimatedWpm =
    wordCount > 0 ? Math.round((wordCount / effectiveSeconds) * 60) : 0;

  let paceAssessment: "ideal" | "fast" | "slow" = "ideal";
  if (params.recordingSeconds && params.recordingSeconds >= 8) {
    if (estimatedWpm > 165) paceAssessment = "fast";
    else if (estimatedWpm < 105) paceAssessment = "slow";
  }

  const hasSituation =
    /\b(contexto|cen[áa]rio|quando|na\s+empresa|projeto|sistema|equipe|time|durante|desafio|problema|when|context|project|team|company|system)\b/i.test(
      lower
    ) || wordCount >= 18;

  const hasTask =
    /\b(objetivo|meta|precisava|missão|respons[áa]vel|papel|demanda|requisito|prazo|goal|objective|needed\s+to|responsible|task)\b/i.test(
      lower
    );

  const hasAction =
    ACTION_VERBS_LIST.some((v) => new RegExp(`\\b${v}\\b`, "i").test(lower)) ||
    /\b(implementei|criei|fiz|desenvolvi|estruturei|analisei|automatizei|configurei|negociei|apliquei|usei|utilizei|built|created|implemented|used|designed)\b/i.test(
      lower
    );

  const hasQuantifiedMetric =
    /(?:\b\d+(?:[.,]\d+)?\s*(?:%|\b(?:por\s*cento|percent|x|vezes|dias|horas|minutos|semanas|meses|usu[áa]rios|clientes|projetos|mil|milh[õo]es)\b)|(?:R\$|US\$|\$|€)\s*\d+)/i.test(
      clean
    );

  const hasResult =
    hasQuantifiedMetric ||
    /\b(resultado|conseguimos|reduzimos|reduzi|aumentamos|aumentei|melhorou|melhorei|entregamos|entreguei|sucesso|impacto|ganho|economia|result|outcome|achieved|reduced|increased|improved)\b/i.test(
      lower
    );

  const mentionedKeywords = params.targetSkills.filter((sk) =>
    lower.includes(sk.toLowerCase())
  );
  const missingKeywordsToMention = params.targetSkills
    .filter((sk) => !lower.includes(sk.toLowerCase()))
    .slice(0, 4);

  let score = 0;
  if (hasSituation) score += 18;
  if (hasTask) score += 15;
  if (hasAction) score += 25;
  if (hasResult) score += 20;
  if (hasQuantifiedMetric) score += 12;
  if (wordCount >= 30) score += 10;
  else if (wordCount >= 15) score += 5;

  // Penalize slightly if excessive filler words (> 3)
  if (totalFillers >= 3) {
    score = Math.max(15, score - Math.min(10, totalFillers * 2));
  }

  score = Math.min(100, score);

  const strengthsPt: string[] = [];
  const strengthsEn: string[] = [];
  const improvementsPt: string[] = [];
  const improvementsEn: string[] = [];

  if (hasSituation && hasTask) {
    strengthsPt.push("Contextualizou bem a Situação e a Tarefa inicial.");
    strengthsEn.push("Clearly contextualized the initial Situation and Task.");
  } else {
    improvementsPt.push(
      "Inicie contextualizando brevemente o cenário e qual era a sua meta (Situação + Tarefa)."
    );
    improvementsEn.push(
      "Start by briefly setting the scene and your specific goal (Situation + Task)."
    );
  }

  if (hasAction) {
    strengthsPt.push(
      "Usou verbos de ação na 1ª pessoa destacando seu protagonismo técnico."
    );
    strengthsEn.push(
      "Used first-person action verbs highlighting personal ownership."
    );
  } else {
    improvementsPt.push(
      "Fale na 1ª pessoa do singular ('Eu implementei', 'Eu estruturei') em vez de apenas 'Nós fizemos'."
    );
    improvementsEn.push(
      "Use first-person singular action verbs ('I implemented', 'I structured') to show clear ownership."
    );
  }

  if (hasQuantifiedMetric) {
    strengthsPt.push(
      "Excelente uso de métricas e números concretos para comprovar o Resultado."
    );
    strengthsEn.push(
      "Excellent use of concrete metrics and numbers to prove the Result."
    );
  } else {
    improvementsPt.push(
      "Faltou quantificar o Resultado final com números (ex.: % de melhoria, horas economizadas ou volume atendido)."
    );
    improvementsEn.push(
      "Quantify the final Result with concrete numbers (e.g., % improvement, hours saved, or volume handled)."
    );
  }

  if (mentionedKeywords.length > 0) {
    strengthsPt.push(
      `Conectou a resposta com keywords da vaga: ${mentionedKeywords.join(", ")}.`
    );
    strengthsEn.push(
      `Connected the answer with target job keywords: ${mentionedKeywords.join(", ")}.`
    );
  } else if (missingKeywordsToMention.length > 0) {
    improvementsPt.push(
      `Cite explicitamente ferramentas da vaga como ${missingKeywordsToMention
        .slice(0, 2)
        .join(" ou ")} durante a explicação da sua Ação.`
    );
    improvementsEn.push(
      `Explicitly mention target tools like ${missingKeywordsToMention
        .slice(0, 2)
        .join(" or ")} when explaining your Action.`
    );
  }

  if (totalFillers === 0 && wordCount >= 25) {
    strengthsPt.push("Comunicação limpa, sem vícios de linguagem detectados.");
    strengthsEn.push("Clean delivery with zero verbal fillers detected.");
  } else if (totalFillers > 0) {
    const fillerSummary = fillerWords
      .map((f) => `"${f.word}" (${f.count}x)`)
      .join(", ");
    improvementsPt.push(
      `Atenção aos vícios de linguagem detectados: ${fillerSummary}. Prefira pausas breves de silêncio.`
    );
    improvementsEn.push(
      `Watch out for verbal fillers detected: ${fillerSummary}. Use brief silent pauses instead.`
    );
  }

  const focusSkill =
    params.question.skillOrTopic === "Método STAR"
      ? params.targetSkills[0] || "automação e análise de dados"
      : params.question.skillOrTopic;

  const modelAnswerPt = `"Em um projeto recente atuando como ${params.candidateRole} (Situação), tínhamos o desafio de eliminar gargalos manuais e melhorar a confiabilidade das entregas da área (Tarefa). Assumi a frente técnica e implementei uma solução estruturada utilizando ${focusSkill} aliada a boas práticas de padronização e monitoramento de KPIs (Ação). Como resultado direto, reduzimos o tempo de execução em 38% e aumentamos a previsibilidade das entregas para todo o time (Resultado)."`;

  const modelAnswerEn = `"In a recent project working as a ${params.candidateRole} (Situation), we faced the challenge of eliminating manual bottlenecks and improving delivery reliability (Task). I took ownership and implemented a structured solution leveraging ${focusSkill} alongside standardized KPIs and automation (Action). As a direct result, we reduced processing time by 38% and significantly improved delivery predictability across the team (Result)."`;

  return {
    overallScore: score,
    starBreakdown: {
      situation: hasSituation,
      task: hasTask,
      action: hasAction,
      result: hasResult,
      quantifiedMetric: hasQuantifiedMetric,
    },
    mentionedKeywords,
    missingKeywordsToMention,
    wordCount,
    estimatedWpm,
    paceAssessment,
    fillerWords,
    totalFillers,
    strengthsPt,
    strengthsEn,
    improvementsPt,
    improvementsEn,
    modelAnswerPt,
    modelAnswerEn,
  };
}

export interface AppliedOptimizationSummary {
  timestamp: number;
  addedSkills: string[];
  appliedBulletsCount: number;
}

export const LAST_APPLIED_OPTIMIZATION_KEY =
  "talenthub_last_applied_optimization_v1";

/**
 * Safely applies an improved bullet point and/or missing skills directly into the structured
 * ResumeBuilder draft without wiping existing structured fields.
 */
export function applyOptimizationsToBuilderDraft(params: {
  existingDraft: ResumeDraftData | null;
  fallbackResumeText: string;
  improvedBullets?: BulletImprovementSuggestion[];
  skillsToAdd?: string[];
}): ResumeDraftData {
  const baseDraft: ResumeDraftData =
    params.existingDraft &&
    (params.existingDraft.personalInfo?.name ||
      params.existingDraft.experiences?.some((e) => e.company || e.role || e.action))
      ? JSON.parse(JSON.stringify(params.existingDraft))
      : params.fallbackResumeText.trim()
      ? parseRawResumeToBuilderDraft(params.fallbackResumeText)
      : {
          personalInfo: {
            name: "",
            email: "",
            phone: "",
            linkedin: "",
            summary: "",
            skills: "",
          },
          experiences: [
            {
              id: createId(),
              company: "",
              role: "",
              period: "",
              situation: "",
              task: "",
              action: "",
              result: "",
            },
          ],
          educations: [{ id: createId(), institution: "", degree: "", period: "" }],
        };

  // 1. Merge new skills without duplicates
  const existingSkills = baseDraft.personalInfo.skills
    .split(/[,;\n|]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const lowerExisting = new Set(existingSkills.map((s) => s.toLowerCase()));

  const allSkillsToInject = [
    ...(params.skillsToAdd || []),
    ...(params.improvedBullets?.map((b) => b.injectedSkill).filter(Boolean) || []),
  ];

  for (const sk of allSkillsToInject) {
    const cleanSkill = sk.trim();
    if (cleanSkill && !lowerExisting.has(cleanSkill.toLowerCase())) {
      existingSkills.push(cleanSkill);
      lowerExisting.add(cleanSkill.toLowerCase());
    }
  }
  baseDraft.personalInfo.skills = existingSkills.join(", ");

  // 2. Apply improved bullets into experiences (splitting Action and Result cleanly)
  if (params.improvedBullets && params.improvedBullets.length > 0) {
    if (baseDraft.experiences.length === 0) {
      baseDraft.experiences.push({
        id: createId(),
        company: "Experiência Principal",
        role: "Especialista",
        period: "Recente",
        situation: "",
        task: "",
        action: "",
        result: "",
      });
    }

    params.improvedBullets.forEach((item, idx) => {
      const cleanOrig = item.originalBullet
        .replace(/^[-•*▪▸◦]\s*/, "")
        .replace(/[.]+$/, "")
        .trim();
      const cleanImproved = item.improvedBullet.replace(/^[-•*▪▸◦]\s*/, "").trim();

      // Split improved bullet into Action and Result if it has a gerund result suffix
      const gerundSplit = cleanImproved.match(
        /^(.*?),?\s+((?:reduzindo|aumentando|melhorando|diminuindo|elevando|gerando|garantindo|alcançando|economizando|otimizando|atendendo|reducing|increasing|improving|cutting|saving|achieving|serving)\s+.*)$/i
      );

      const actionSegment = gerundSplit ? `${gerundSplit[1].trim()}.` : cleanImproved;
      const resultSegment = gerundSplit
        ? `${gerundSplit[2].trim().charAt(0).toUpperCase()}${gerundSplit[2].trim().slice(1)}`
        : "";

      // Find matching experience that contains the original bullet text, or fallback by index
      let targetExp = baseDraft.experiences.find((exp) =>
        [exp.situation, exp.task, exp.action, exp.result]
          .join(" ")
          .toLowerCase()
          .includes(cleanOrig.slice(0, 28).toLowerCase())
      );
      if (!targetExp) {
        targetExp = baseDraft.experiences[idx % baseDraft.experiences.length];
      }

      if (targetExp) {
        if (
          cleanOrig.length > 15 &&
          targetExp.action.toLowerCase().includes(cleanOrig.slice(0, 25).toLowerCase())
        ) {
          targetExp.action = actionSegment;
        } else if (!targetExp.action.includes(actionSegment.slice(0, 25))) {
          targetExp.action = targetExp.action.trim()
            ? `${targetExp.action.trim().replace(/\.$/, "")}. ${actionSegment}`
            : actionSegment;
        }

        if (resultSegment && !targetExp.result.includes(resultSegment.slice(0, 20))) {
          targetExp.result = targetExp.result.trim()
            ? `${targetExp.result.trim().replace(/\.$/, "")}. ${resultSegment}`
            : resultSegment;
        }
      }
    });
  }

  return baseDraft;
}

/**
 * Cleans a noisy Ctrl+A / Ctrl+C full-page copy from LinkedIn, Gupy, Greenhouse, or Glassdoor.
 * Removes navigation items, footers, "mostrar mais", applicant counters, and returns clean job text + metadata.
 */
export function cleanNoisyJobPageText(rawText: string): {
  cleanedText: string;
  removedLinesCount: number;
  detectedRole?: string;
  detectedCompany?: string;
} {
  const lines = rawText.split(/\r?\n/);
  const noiseRegex =
    /^(?:pular para o conte[úu]do(?:\s+principal)?|skip to main content|in[íi]cio|minha rede|vagas|mensagens|notifica[çc][õo]es|eu\b|para empresas|experimente premium|candidatar-se(?:\s+simplificada)?|simplificada|salvar|salvo|compartilhar|mostrar mais|mostrar menos|show more|show less|denunciar esta vaga|report this job|vagas semelhantes|similar jobs|pessoas tamb[ée]m viram|people also viewed|sobre a linkedin|acessibilidade|central de ajuda|termos e privacidade|op[çc][õo]es de an[úu]ncios|publicidade|servi[çc]os empresariais|baixe o aplicativo|linkedin corporation.*|powered by gupy.*|pol[íi]tica de privacidade|utilizamos cookies.*|aceitar cookies|rejeitar cookies|\d+\s+candidatos?|\d+\s+applicants?|h[áa]\s+\d+\s+(?:horas?|dias?|semanas?|meses?)|\d+\s+(?:hours?|days?|weeks?)\s+ago)$/i;

  const cleanedLines: string[] = [];
  let removedLinesCount = 0;
  let detectedRole: string | undefined;
  let detectedCompany: string | undefined;

  for (const rawLine of lines) {
    const trimmed = rawLine.replace(/\s+/g, " ").trim();
    if (!trimmed) continue;

    if (
      noiseRegex.test(trimmed) ||
      trimmed.length <= 2 ||
      /^(?:https?:\/\/[^\s]+)$/i.test(trimmed)
    ) {
      removedLinesCount++;
      continue;
    }

    if (
      !detectedRole &&
      trimmed.length >= 6 &&
      trimmed.length <= 75 &&
      ROLE_KEYWORDS_REGEX.test(trimmed) &&
      !trimmed.endsWith(".")
    ) {
      detectedRole = trimmed;
    } else if (
      detectedRole &&
      !detectedCompany &&
      trimmed.length >= 2 &&
      trimmed.length <= 50 &&
      !ROLE_KEYWORDS_REGEX.test(trimmed) &&
      !/^(?:sobre|requisitos|responsabilidades|benef[íi]cios|descri[çc][ãa]o|about|requirements)/i.test(
        trimmed
      )
    ) {
      detectedCompany = trimmed.split("·")[0].trim();
    }

    // Deduplicate consecutive identical lines (common in LinkedIn mobile/desktop headers)
    if (
      cleanedLines.length > 0 &&
      cleanedLines[cleanedLines.length - 1].toLowerCase() === trimmed.toLowerCase()
    ) {
      removedLinesCount++;
      continue;
    }

    cleanedLines.push(trimmed);
  }

  return {
    cleanedText: cleanedLines.join("\n"),
    removedLinesCount,
    detectedRole,
    detectedCompany,
  };
}

export const GEMINI_API_KEY_STORAGE = "talenthub_gemini_api_key_v1";

/**
 * Calls Google Gemini API (gemini-2.5-flash) when an optional user API key is configured,
 * returning deeply contextualized STAR bullet rewrites for the target job.
 */
export async function generateBulletImprovementsWithGemini(params: {
  apiKey: string;
  resumeText: string;
  jobDescription: string;
  missingSkills: string[];
  locale: "pt" | "en";
}): Promise<BulletImprovementSuggestion[]> {
  const prompt =
    params.locale === "pt"
      ? `Você é um especialista sênior em currículos ATS e método STAR.
Analise o currículo abaixo e a descrição da vaga.
Skills ausentes prioritárias da vaga: ${params.missingSkills.slice(0, 6).join(", ")}.
Reescreva até 4 tópicos (bullets) reais do currículo para torná-los de altíssimo impacto no padrão STAR (Ação + Ferramenta da Vaga + Resultado Quantificado com métrica realista).
Não use travessões (—).
Retorne APENAS um JSON válido no formato:
[{"originalBullet":"• ...","improvedBullet":"• ...","injectedSkill":"...","reasonPt":"...","reasonEn":"..."}]

VAGA:
${params.jobDescription.slice(0, 1800)}

CURRÍCULO:
${params.resumeText.slice(0, 2200)}`
      : `You are a senior ATS Resume & STAR Method specialist.
Analyze the resume and job description below.
Missing target job skills: ${params.missingSkills.slice(0, 6).join(", ")}.
Rewrite up to 4 actual resume bullets into high-impact STAR bullets (Strong Action Verb + Target Skill + Quantified Result).
Do not use em-dashes (—).
Return ONLY valid JSON matching:
[{"originalBullet":"• ...","improvedBullet":"• ...","injectedSkill":"...","reasonPt":"...","reasonEn":"..."}]

JOB:
${params.jobDescription.slice(0, 1800)}

RESUME:
${params.resumeText.slice(0, 2200)}`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(
      params.apiKey.trim()
    )}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.35,
          responseMimeType: "application/json",
        },
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Gemini API status ${response.status}`);
  }

  const data = await response.json();
  const rawJson = data?.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
  const parsed = JSON.parse(rawJson) as Array<{
    originalBullet: string;
    improvedBullet: string;
    injectedSkill: string;
    reasonPt: string;
    reasonEn: string;
  }>;

  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error("Empty Gemini response");
  }

  return parsed.slice(0, 4).map((item, idx) => ({
    id: `gemini-bullet-${Date.now()}-${idx}`,
    originalBullet: item.originalBullet || "",
    improvedBullet: item.improvedBullet || "",
    injectedSkill: item.injectedSkill || params.missingSkills[0] || "KPIs",
    reasonPt: item.reasonPt || "Reescrita contextualizada via Gemini IA",
    reasonEn: item.reasonEn || "Contextualized rewrite via Gemini AI",
  }));
}


