export type KeywordCategory = "hard_skill" | "soft_skill" | "domain";

export interface ExtractedKeywordItem {
  term: string;
  canonical: string;
  category: KeywordCategory;
  weight: number; // 3 for Hard Skills, 2 for Domain/Tools, 1.5 for Soft Skills
  frequencyInJob: number;
  matchedInResume: boolean;
  matchedViaSynonym?: string;
}

export interface KeywordMatchAnalysis {
  overallWeightedScore: number;
  exactMatchCount: number;
  totalKeywordsCount: number;
  hardSkillsScore: number;
  domainScore: number;
  softSkillsScore: number;
  matched: ExtractedKeywordItem[];
  missing: ExtractedKeywordItem[];
}

// Canonical skill/term -> list of synonyms/aliases (all lowercase)
export const SKILL_SYNONYMS: Record<string, { display: string; category: KeywordCategory; aliases: string[] }> = {
  javascript: { display: "JavaScript", category: "hard_skill", aliases: ["javascript", "js", "ecmascript", "es6"] },
  typescript: { display: "TypeScript", category: "hard_skill", aliases: ["typescript", "ts"] },
  react: { display: "React", category: "hard_skill", aliases: ["react", "reactjs", "react.js"] },
  "react native": { display: "React Native", category: "hard_skill", aliases: ["react native", "react-native"] },
  "node.js": { display: "Node.js", category: "hard_skill", aliases: ["node.js", "nodejs", "node js"] },
  "next.js": { display: "Next.js", category: "hard_skill", aliases: ["next.js", "nextjs", "next js"] },
  vue: { display: "Vue.js", category: "hard_skill", aliases: ["vue", "vuejs", "vue.js"] },
  angular: { display: "Angular", category: "hard_skill", aliases: ["angular", "angularjs"] },
  python: { display: "Python", category: "hard_skill", aliases: ["python", "py"] },
  java: { display: "Java", category: "hard_skill", aliases: ["java", "jvm", "j2ee"] },
  "c#": { display: "C#", category: "hard_skill", aliases: ["c#", "csharp", "c-sharp"] },
  "c++": { display: "C++", category: "hard_skill", aliases: ["c++", "cpp"] },
  ".net": { display: ".NET", category: "hard_skill", aliases: [".net", "dotnet", "asp.net"] },
  golang: { display: "Go", category: "hard_skill", aliases: ["golang", "go lang"] },
  rust: { display: "Rust", category: "hard_skill", aliases: ["rust"] },
  php: { display: "PHP", category: "hard_skill", aliases: ["php", "laravel", "symfony"] },
  ruby: { display: "Ruby", category: "hard_skill", aliases: ["ruby", "ruby on rails", "rails"] },
  sql: { display: "SQL", category: "hard_skill", aliases: ["sql", "tsql", "pl/sql", "plsql", "queries sql"] },
  postgresql: { display: "PostgreSQL", category: "hard_skill", aliases: ["postgresql", "postgres"] },
  mysql: { display: "MySQL", category: "hard_skill", aliases: ["mysql"] },
  mongodb: { display: "MongoDB", category: "hard_skill", aliases: ["mongodb", "mongo", "nosql"] },
  redis: { display: "Redis", category: "hard_skill", aliases: ["redis"] },
  graphql: { display: "GraphQL", category: "hard_skill", aliases: ["graphql"] },
  "rest api": { display: "REST API", category: "hard_skill", aliases: ["rest api", "restful", "api rest", "apis rest", "rest"] },
  docker: { display: "Docker", category: "hard_skill", aliases: ["docker", "containers", "containerização"] },
  kubernetes: { display: "Kubernetes", category: "hard_skill", aliases: ["kubernetes", "k8s"] },
  aws: { display: "AWS", category: "hard_skill", aliases: ["aws", "amazon web services", "ec2", "s3", "lambda"] },
  azure: { display: "Azure", category: "hard_skill", aliases: ["azure", "microsoft azure"] },
  gcp: { display: "GCP", category: "hard_skill", aliases: ["gcp", "google cloud", "google cloud platform", "bigquery"] },
  "ci/cd": { display: "CI/CD", category: "hard_skill", aliases: ["ci/cd", "cicd", "integração contínua", "continuous integration", "github actions", "gitlab ci", "jenkins"] },
  git: { display: "Git", category: "hard_skill", aliases: ["git", "github", "gitlab", "versionamento"] },
  linux: { display: "Linux", category: "hard_skill", aliases: ["linux", "unix", "bash"] },
  terraform: { display: "Terraform", category: "hard_skill", aliases: ["terraform", "iac", "infrastructure as code"] },
  html: { display: "HTML5", category: "hard_skill", aliases: ["html", "html5"] },
  css: { display: "CSS3", category: "hard_skill", aliases: ["css", "css3", "sass", "scss"] },
  tailwind: { display: "Tailwind CSS", category: "hard_skill", aliases: ["tailwind", "tailwindcss", "tailwind css"] },
  figma: { display: "Figma", category: "hard_skill", aliases: ["figma", "ui/ux", "ux/ui", "design system"] },
  "power bi": { display: "Power BI", category: "hard_skill", aliases: ["power bi", "powerbi", "dax"] },
  excel: { display: "Excel", category: "hard_skill", aliases: ["excel", "vba", "planilhas avançadas"] },
  tableau: { display: "Tableau", category: "hard_skill", aliases: ["tableau"] },
  "machine learning": { display: "Machine Learning", category: "hard_skill", aliases: ["machine learning", "ml", "aprendizado de máquina", "deep learning"] },
  "data science": { display: "Data Science", category: "hard_skill", aliases: ["data science", "ciência de dados", "analytics", "análise de dados", "data analytics"] },
  etl: { display: "ETL / Pipelines", category: "hard_skill", aliases: ["etl", "elt", "data pipeline", "pipelines de dados", "airflow", "spark", "pyspark"] },
  testes: { display: "Testes Automatizados", category: "hard_skill", aliases: ["testes unitários", "unit testing", "unit tests", "jest", "vitest", "cypress", "playwright", "tdd", "qa"] },
  microsservicos: { display: "Microsserviços", category: "hard_skill", aliases: ["microsserviços", "microservices", "micro-serviços", "arquitetura distribuída"] },
  scrum: { display: "Scrum / Agile", category: "domain", aliases: ["scrum", "agile", "metodologias ágeis", "métodos ágeis", "kanban", "jira"] },
  "gestao de projetos": { display: "Gestão de Projetos", category: "domain", aliases: ["gestão de projetos", "project management", "pmp", "pmbok", "roadmap", "okrs", "kpi", "kpis"] },
  "engenharia de software": { display: "Engenharia de Software", category: "domain", aliases: ["engenharia de software", "software engineering", "clean code", "solid", "design patterns", "arquitetura de software"] },
  seguranca: { display: "Segurança / LGPD", category: "domain", aliases: ["lgpd", "gdpr", "cybersecurity", "segurança da informação", "owasp", "oauth", "jwt"] },
  lideranca: { display: "Liderança", category: "soft_skill", aliases: ["liderança", "leadership", "mentoria", "mentoring", "gestão de pessoas", "team lead", "tech lead"] },
  comunicacao: { display: "Comunicação", category: "soft_skill", aliases: ["comunicação", "communication", "apresentação", "stakeholders", "negociação"] },
  "resolucao de problemas": { display: "Resolução de Problemas", category: "soft_skill", aliases: ["resolução de problemas", "problem solving", "pensamento crítico", "proatividade", "autonomia"] },
  "trabalho em equipe": { display: "Trabalho em Equipe", category: "soft_skill", aliases: ["trabalho em equipe", "teamwork", "colaboração", "collaborative", "cross-functional", "multidisciplinar"] },
};

// Stopwords + HR Job Posting Boilerplate Noise (PT & EN)
export const JOB_NOISE_STOPWORDS = new Set([
  // Standard PT stopwords
  "e", "o", "a", "os", "as", "de", "do", "da", "dos", "das", "em", "no", "na",
  "nos", "nas", "um", "uma", "uns", "umas", "para", "com", "por", "que", "se",
  "ou", "ao", "aos", "à", "às", "seu", "sua", "seus", "suas", "ter", "ser",
  "estar", "como", "mais", "muito", "já", "também", "entre", "sobre", "até",
  "isso", "isto", "esse", "essa", "este", "esta", "pelo", "pela", "pelos", "pelas",
  "não", "sim", "mas", "nem", "quando", "onde", "quem", "qual", "quais", "todo",
  "toda", "todos", "todas", "outro", "outra", "outros", "outras", "mesmo", "mesma",
  "após", "antes", "durante", "sem", "sob", "trás", "dentro", "fora", "além",
  // Standard EN stopwords
  "the", "and", "or", "in", "of", "to", "for", "with", "on", "at", "is", "are",
  "was", "were", "be", "been", "being", "have", "has", "had", "do", "does", "did",
  "will", "would", "could", "should", "may", "can", "this", "that", "these", "those",
  "from", "not", "but", "all", "any", "each", "every", "into", "through", "during",
  "before", "after", "above", "below", "between", "under", "again", "further",
  "then", "once", "here", "there", "when", "where", "why", "how", "both", "few",
  "more", "most", "other", "some", "such", "only", "own", "same", "so", "than",
  "too", "very", "just", "about", "our", "your", "their", "we", "you", "they",
  // HR / Job Posting Noise PT
  "vaga", "vagas", "empresa", "empresas", "oportunidade", "candidato", "candidatos",
  "pessoa", "pessoas", "profissional", "profissionais", "time", "equipe", "área",
  "requisitos", "requisito", "qualificações", "diferenciais", "diferencial",
  "benefícios", "benefício", "salário", "remuneração", "contratação", "clt", "pj",
  "híbrido", "remoto", "presencial", "local", "horário", "segunda", "sexta",
  "vale", "refeição", "alimentação", "transporte", "plano", "saúde", "odontológico",
  "gympass", "wellhub", "totalpass", "férias", "auxílio", "home", "office",
  "anos", "ano", "mês", "meses", "dia", "dias", "buscamos", "procuramos",
  "responsabilidades", "atribuições", "atividades", "desejável", "obrigatório",
  "conhecimento", "conhecimentos", "experiência", "atuar", "atuação", "trabalho",
  "trabalhar", "fazer", "parte", "nosso", "nossa", "nossos", "nossas", "você",
  "enviar", "currículo", "processo", "seletivo", "etapas", "etapa", "nível",
  "júnior", "pleno", "sênior", "jr", "pl", "sr", "superior", "completo", "cursando",
  "formação", "graduação", "ambiente", "cultura", "diversidade", "inclusão",
  // HR / Job Posting Noise EN
  "job", "role", "position", "company", "team", "candidate", "candidates", "looking",
  "seeking", "requirements", "qualifications", "responsibilities", "benefits",
  "salary", "compensation", "remote", "hybrid", "onsite", "office", "work", "working",
  "experience", "years", "year", "month", "months", "day", "days", "preferred",
  "required", "plus", "bonus", "nice", "must", "strong", "ability", "skills",
  "knowledge", "understanding", "join", "opportunity", "equal", "employer", "apply",
  "resume", "degree", "bachelor", "master", "related", "field", "equivalent",
]);

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Checks if a term or phrase occurs in text with proper boundaries (supporting C#, C++, .NET, Node.js).
 */
export function hasTermInText(textLower: string, termLower: string): boolean {
  const escaped = escapeRegExp(termLower);
  // Use custom non-word lookarounds so terms starting/ending with ., +, # work properly
  const regex = new RegExp(`(?<![a-zA-Z0-9_áàãâéêíóôõúç])${escaped}(?![a-zA-Z0-9_áàãâéêíóôõúç])`, "i");
  return regex.test(textLower);
}

export function countTermOccurrences(textLower: string, termLower: string): number {
  const escaped = escapeRegExp(termLower);
  const regex = new RegExp(`(?<![a-zA-Z0-9_áàãâéêíóôõúç])${escaped}(?![a-zA-Z0-9_áàãâéêíóôõúç])`, "gi");
  return (textLower.match(regex) || []).length;
}

/**
 * Performs HRTech-grade keyword extraction and comparison between Job Description and Resume.
 */
export function analyzeKeywordCompatibility(
  jobDescription: string,
  resumeText: string
): KeywordMatchAnalysis {
  const jobLower = jobDescription.toLowerCase();
  const resumeLower = resumeText.toLowerCase();

  const extractedMap = new Map<string, ExtractedKeywordItem>();
  const consumedWords = new Set<string>();

  // 1. Scan known taxonomy (Hard Skills, Domain & Soft Skills with Synonyms/N-grams)
  for (const [canonicalKey, config] of Object.entries(SKILL_SYNONYMS)) {
    let jobCount = 0;
    let matchedInJobAlias = "";

    for (const alias of config.aliases) {
      const count = countTermOccurrences(jobLower, alias);
      if (count > 0) {
        jobCount += count;
        if (!matchedInJobAlias) matchedInJobAlias = alias;
      }
    }

    if (jobCount > 0) {
      // Check if ANY alias of this canonical skill appears in the resume
      let matchedInResume = false;
      let matchedViaSynonym: string | undefined = undefined;

      for (const alias of config.aliases) {
        if (hasTermInText(resumeLower, alias)) {
          matchedInResume = true;
          if (alias !== matchedInJobAlias) {
            matchedViaSynonym = alias;
          }
          break;
        }
      }

      const weight =
        config.category === "hard_skill" ? 3 : config.category === "domain" ? 2 : 1.5;

      extractedMap.set(canonicalKey, {
        term: config.display,
        canonical: canonicalKey,
        category: config.category,
        weight,
        frequencyInJob: jobCount,
        matchedInResume,
        matchedViaSynonym,
      });

      config.aliases.forEach((a) => {
        a.split(/\s+/).forEach((part) => consumedWords.add(part));
      });
    }
  }

  // 2. Extract remaining high-signal domain terms & tokens from the Job Description
  const tokens = jobLower
    .replace(/[^\w\sáàãâéêíóôõúç+#.-]/g, " ")
    .split(/\s+/)
    .map((t) => t.replace(/^[.-]+|[.-]+$/g, ""))
    .filter(
      (w) =>
        w.length > 2 &&
        !/^\d+$/.test(w) &&
        !JOB_NOISE_STOPWORDS.has(w) &&
        !consumedWords.has(w)
    );

  const tokenFreq = new Map<string, number>();
  for (const token of tokens) {
    tokenFreq.set(token, (tokenFreq.get(token) || 0) + 1);
  }

  const remainingSlots = Math.max(5, 28 - extractedMap.size);
  const topCustomTokens = [...tokenFreq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, remainingSlots);

  for (const [token, freq] of topCustomTokens) {
    const matchedInResume = hasTermInText(resumeLower, token);
    // Capitalize display nicely
    const display =
      token.length <= 3 && /^[a-z]+$/.test(token)
        ? token.toUpperCase()
        : token.charAt(0).toUpperCase() + token.slice(1);

    extractedMap.set(token, {
      term: display,
      canonical: token,
      category: "domain",
      weight: 2,
      frequencyInJob: freq,
      matchedInResume,
    });
  }

  const allItems = [...extractedMap.values()].sort((a, b) => {
    if (b.weight !== a.weight) return b.weight - a.weight;
    return b.frequencyInJob - a.frequencyInJob;
  });

  const matched = allItems.filter((i) => i.matchedInResume);
  const missing = allItems.filter((i) => !i.matchedInResume);

  const totalWeight = allItems.reduce((acc, item) => acc + item.weight, 0);
  const matchedWeight = matched.reduce((acc, item) => acc + item.weight, 0);
  const overallWeightedScore =
    totalWeight > 0 ? Math.round((matchedWeight / totalWeight) * 100) : 0;

  const calcCategoryScore = (cat: KeywordCategory) => {
    const catItems = allItems.filter((i) => i.category === cat);
    if (catItems.length === 0) return 100;
    const catMatched = catItems.filter((i) => i.matchedInResume);
    return Math.round((catMatched.length / catItems.length) * 100);
  };

  return {
    overallWeightedScore,
    exactMatchCount: matched.length,
    totalKeywordsCount: allItems.length,
    hardSkillsScore: calcCategoryScore("hard_skill"),
    domainScore: calcCategoryScore("domain"),
    softSkillsScore: calcCategoryScore("soft_skill"),
    matched,
    missing,
  };
}
