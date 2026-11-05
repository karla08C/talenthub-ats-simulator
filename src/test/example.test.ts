import { describe, it, expect } from "vitest";
import { analyzeResumeForATS, formatResumeText } from "@/lib/atsEngine";
import { analyzeKeywordCompatibility, hasTermInText } from "@/lib/keywordEngine";
import { calculateBuilderScores } from "@/pages/ResumeBuilder";
import {
  parseRawResumeToBuilderDraft,
  autoCompleteExperienceSTAR,
  generateCareerPrepAssets,
} from "@/lib/careerCopilotEngine";

describe("Pilar A: ATS Diagnostic Engine (atsEngine.ts)", () => {
  it("extracts contact info, standard headers, action verbs, and quantified metrics accurately", () => {
    const resume = `
      Maria Silva
      maria.silva@tech.com | (11) 99887-6655 | linkedin.com/in/mariasilva

      RESUMO PROFISSIONAL
      Engenheira de Software com foco em sistemas distribuídos e alta disponibilidade.

      HABILIDADES TÉCNICAS
      TypeScript, React, Node.js, PostgreSQL, Docker, AWS.

      EXPERIÊNCIA PROFISSIONAL
      Empresa X — Senior Software Engineer (Jan 2022 - Atual)
      - Liderei a arquitetura de microsserviços reduzindo custos de nuvem em 35%.
      - Otimizei pipelines de dados para processar 500 mil eventos por hora.
      - Implementei testes automatizados e aumentei a cobertura para 90%.
      - Desenvolvi e integrei APIs críticas com latência abaixo de 50ms.

      FORMAÇÃO ACADÊMICA
      UNICAMP — Ciência da Computação (2017 - 2021)
    `;

    const result = analyzeResumeForATS(resume);

    expect(result.sections.contact.email).toBe("maria.silva@tech.com");
    expect(result.sections.contact.phone).toContain("99887-6655");
    expect(result.sections.contact.linkedin).toContain("linkedin.com/in/mariasilva");
    expect(result.sections.detectedHeaders.experience).toBe(true);
    expect(result.sections.detectedHeaders.education).toBe(true);
    expect(result.sections.detectedHeaders.skills).toBe(true);
    expect(result.sections.metrics.quantifiedBulletsCount).toBeGreaterThanOrEqual(2);
    expect(result.sections.metrics.actionVerbsFound.length).toBeGreaterThanOrEqual(4);
    expect(result.overallScore).toBeGreaterThanOrEqual(75);
  });

  it("flags multi-column layout and missing sections when appropriate", () => {
    const poorlyFormattedResume = `
      João Souza
      Minha Trajetória: trabalhei em vários lugares fazendo sites.
    `;

    const result = analyzeResumeForATS(poorlyFormattedResume, {
      pageCount: 1,
      totalTextItems: 50,
      charCount: 300,
      isLikelyScannedOrImage: false,
      isMultiColumnDetected: true,
      columnMixingRiskScore: 68,
      tableOrGridDetected: true,
      weirdGlyphsCount: 4,
    });

    const findingIds = result.findings.map((f) => f.id);
    expect(findingIds).toContain("multi-column");
    expect(findingIds).toContain("tables-detected");
    expect(findingIds).toContain("icon-fonts");
    expect(findingIds).toContain("contact-missing");
    expect(findingIds).toContain("sections-missing");
    expect(result.overallScore).toBeLessThan(50);
  });

  it("reflows soft-wrapped PDF lines, fixes hyphenation, collapses letter-spaced headings, and normalizes bullets", async () => {
    const { formatResumeText } = await import("@/lib/atsEngine");

    const messyPdfRaw = `Carla Mendes
\uF0E0 carla@email.com | \uF095 (11) 98765-4321
E X P E R I Ê N C I A   P R O F I S S I O N A L
TechCorp — Engenheira Sênior (Jan 2023 - Atual)
▪ Liderei a migração de micros-
serviços em Node.js e
TypeScript, reduzindo a latência em 42%.`;

    const formatted = formatResumeText(messyPdfRaw);

    expect(formatted).not.toContain("\uF0E0");
    expect(formatted).toContain("EXPERIÊNCIA PROFISSIONAL");
    expect(formatted).toContain("microsserviços em Node.js e TypeScript, reduzindo a latência em 42%.");
    expect(formatted).toContain("• Liderei a migração");
  });
});

describe("Pilar B: Smart Keyword & Taxonomy Engine (keywordEngine.ts)", () => {
  it("preserves special characters like C#, C++, .NET, Node.js and matches synonyms", () => {
    expect(hasTermInText("experiência com c# e .net core", "c#")).toBe(true);
    expect(hasTermInText("programação em c++ avançado", "c++")).toBe(true);
    expect(hasTermInText("uso diário de k8s e js", "k8s")).toBe(true);

    const job = `
      Vaga Desenvolvedor Backend
      Requisitos: C#, .NET, Kubernetes, JavaScript, PostgreSQL, Power BI, Liderança.
      Benefícios: vale refeição, plano de saúde, trabalho remoto.
    `;

    const resume = `
      Desenvolvedor com experiência em C-Sharp, dotnet, K8s, JS e banco Postgres.
    `;

    const analysis = analyzeKeywordCompatibility(job, resume);

    const matchedCanonicals = analysis.matched.map((m) => m.canonical);
    const missingCanonicals = analysis.missing.map((m) => m.canonical);

    expect(matchedCanonicals).toContain("c#");
    expect(matchedCanonicals).toContain(".net");
    expect(matchedCanonicals).toContain("kubernetes");
    expect(matchedCanonicals).toContain("javascript");
    expect(matchedCanonicals).toContain("postgresql");

    // Power BI (compound term) and Liderança should be detected as missing
    expect(missingCanonicals).toContain("power bi");
    expect(missingCanonicals).toContain("lideranca");

    // Boilerplate job words ("benefícios", "remoto", "plano") must be filtered out
    const allTermsLower = [...analysis.matched, ...analysis.missing].map((i) =>
      i.canonical.toLowerCase()
    );
    expect(allTermsLower).not.toContain("benefícios");
    expect(allTermsLower).not.toContain("remoto");
  });
});

describe("Pilar C: Resume Builder Real Sub-score Engine", () => {
  it("calculates independent sub-scores for keywords, action verbs + metrics, and formatting", async () => {
    const { calculateBuilderScores } = await import("@/pages/ResumeBuilder");

    const scores = calculateBuilderScores(
      {
        name: "Carla Mendes",
        email: "carla@email.com",
        phone: "(11) 98765-4321",
        linkedin: "linkedin.com/in/carlamendes",
        summary:
          "Engenheira de Software Full Stack com 5 anos de experiência em arquitetura escalável e nuvem.",
        skills: "TypeScript, React, Node.js, PostgreSQL, Docker, AWS",
      },
      [
        {
          id: "1",
          company: "TechCorp",
          role: "Senior Software Engineer",
          period: "Jan 2023 - Atual",
          situation: "Sistema legado lento",
          task: "Melhorar latência",
          action: "Liderei, otimizei, implementei e automatizei microsserviços",
          result: "Reduzi a latência em 42% para 250 mil usuários",
        },
      ],
      [
        {
          id: "2",
          institution: "USP",
          degree: "Ciência da Computação",
          period: "2016 - 2020",
        },
      ]
    );

    expect(scores.keywordsScore).toBeGreaterThanOrEqual(20);
    expect(scores.actionVerbsScore).toBeGreaterThanOrEqual(20);
    expect(scores.formattingScore).toBe(40);
    expect(scores.totalScore).toBe(
      scores.keywordsScore + scores.actionVerbsScore + scores.formattingScore
    );
  }, 15000);
});

describe("Candidate Experience Copilot Engine (careerCopilotEngine.ts)", () => {
  it("auto-imports raw resume text into structured ResumeBuilder draft and generates interview & pitch assets", async () => {
    const {
      parseRawResumeToBuilderDraft,
      generateCareerPrepAssets,
    } = await import("@/lib/careerCopilotEngine");

    const sampleRaw = `Carla Mendes
carla.mendes@email.com | (11) 98765-4321 | linkedin.com/in/carlamendes

RESUMO PROFISSIONAL
Engenheira Full Stack com 5 anos de experiência.

HABILIDADES TÉCNICAS
TypeScript, React, Node.js, PostgreSQL

EXPERIÊNCIA PROFISSIONAL
TechCorp — Senior Engineer (Jan 2023 - Atual)
- Contexto de alta escala
- Liderei migração de microsserviços
- Reduzi latência em 42%

FORMAÇÃO ACADÊMICA
USP — Ciência da Computação (2016 - 2020)`;

    const draft = parseRawResumeToBuilderDraft(sampleRaw);
    expect(draft.personalInfo.name).toBe("Carla Mendes");
    expect(draft.personalInfo.email).toBe("carla.mendes@email.com");
    expect(draft.personalInfo.skills).toContain("TypeScript");
    expect(draft.experiences.length).toBeGreaterThanOrEqual(1);
    expect(draft.educations[0].institution).toContain("USP");

    const assets = generateCareerPrepAssets({
      candidateName: "Carla Mendes",
      candidateRole: "Senior Full Stack Engineer",
      matchedSkills: ["TypeScript", "React", "Node.js"],
      missingSkills: ["Kubernetes", "GraphQL"],
      topQuantifiedResult: "redução de 42% na latência",
    });

    expect(assets.elevatorPitchPt).toContain("Carla Mendes");
    expect(assets.linkedinPitchPt).toContain("TypeScript");
    expect(assets.coverLetterPt).toContain("STAR");
    expect(assets.questions.some((q) => q.type === "gap_defense")).toBe(true);
  });

  it("classifies bullets semantically into S-T-A-R, splits gerund result clauses, disambiguates role vs company, and extracts fallback skills", async () => {
    const { parseRawResumeToBuilderDraft } = await import(
      "@/lib/careerCopilotEngine"
    );

    const messyPdfResume = `Lucas Oliveira
lucas.dev@email.com | (21) 99888-7766 | linkedin.com/in/lucasoliveira
Desenvolvedor Backend trabalhando com TypeScript, Node.js, PostgreSQL, Docker e AWS em sistemas financeiros.

EXPERIÊNCIA PROFISSIONAL
Engenheiro de Software Sênior | Nubank
Jan 2022 - Atual
• Atuei no contexto de alta volumetria do sistema de pagamentos instantâneos.
• Responsável por garantir a resiliência e baixa latência das transações.
• Reestruturei os microsserviços em Node.js e implementei cache Redis, reduzindo a latência em 48% e economizando R$ 120 mil/ano.

EDUCAÇÃO
Bacharelado em Engenharia de Computação — UFRJ (2016 - 2020)`;

    const draft = parseRawResumeToBuilderDraft(messyPdfResume);

    expect(draft.personalInfo.name).toBe("Lucas Oliveira");
    // Fallback skill extraction from body text even without a dedicated HABILIDADES header
    expect(draft.personalInfo.skills).toContain("TypeScript");
    expect(draft.personalInfo.skills).toContain("PostgreSQL");

    // Role vs Company disambiguation ("Engenheiro de Software Sênior | Nubank")
    expect(draft.experiences[0].role).toContain("Engenheiro de Software");
    expect(draft.experiences[0].company).toBe("Nubank");
    expect(draft.experiences[0].period).toContain("Jan 2022");

    // Semantic S-T-A-R classification + gerund clause split
    expect(draft.experiences[0].situation).toContain("alta volumetria");
    expect(draft.experiences[0].task).toContain("Responsável por garantir");
    expect(draft.experiences[0].action).toContain("Reestruturei os microsserviços");
    expect(draft.experiences[0].result).toContain("48%");

    // Education institution vs degree disambiguation
    expect(draft.educations[0].institution).toContain("UFRJ");
    expect(draft.educations[0].degree).toContain("Bacharelado");
  });

  it("parses 3-line LinkedIn/Word PDF job headers, merges multi-line education blocks, isolates Idiomas/Certificações, and auto-completes missing STAR fields", async () => {
    const {
      parseRawResumeToBuilderDraft,
      autoCompleteExperienceSTAR,
    } = await import("@/lib/careerCopilotEngine");

    const multiLinePdfResume = `Fernanda Costa
fernanda@email.com | (11) 91234-5678

EXPERIÊNCIA
Desenvolvedora Full Stack Sênior
Mercado Livre · Tempo integral
jan de 2022 - o momento · 2 anos
São Paulo, Brasil · Remoto
• Desenvolvi microsserviços escaláveis com Node.js e TypeScript.

FORMAÇÃO ACADÊMICA
Universidade Estadual de Campinas (UNICAMP)
Bacharelado em Ciência da Computação
2015 - 2019

IDIOMAS
Inglês Avançado
Espanhol Fluente

CERTIFICAÇÕES
AWS Certified Developer Associate`;

    const draft = parseRawResumeToBuilderDraft(multiLinePdfResume);

    expect(draft.experiences.length).toBe(1);
    expect(draft.experiences[0].role).toBe("Desenvolvedora Full Stack Sênior");
    expect(draft.experiences[0].company).toBe("Mercado Livre");
    expect(draft.experiences[0].period).toContain("jan de 2022 - o momento");

    // Multi-line education should be merged into 1 single Education card, and IDIOMAS/CERTIFICAÇÕES must NOT pollute educations
    expect(draft.educations.length).toBe(1);
    expect(draft.educations[0].institution).toContain("UNICAMP");
    expect(draft.educations[0].degree).toContain("Bacharelado em Ciência da Computação");
    expect(draft.educations[0].period).toBe("2015 - 2019");

    // Auto-complete missing STAR fields
    const completedExp = autoCompleteExperienceSTAR(
      draft.experiences[0],
      draft.personalInfo.skills,
      "pt"
    );
    expect(completedExp.situation.length).toBeGreaterThan(15);
    expect(completedExp.task.length).toBeGreaterThan(15);
    expect(completedExp.action.length).toBeGreaterThan(15);
    expect(completedExp.result.length).toBeGreaterThan(15);
  });

  it("preserves accented words, ligatures (ﬁ -> fi), and right-aligned dates on the same line without slicing lines vertically", async () => {
    const {
      clusterItemsIntoVisualLines,
      joinLineItemsSmartly,
      formatResumeText,
    } = await import("@/lib/atsEngine");

    // Simulate PDF items where:
    // 1. A job header has a right-aligned date ("Mai/2025 – Atual")
    // 2. Words are split at accented glyphs across slightly jittered Y baselines (501.9 vs 502.1) and contain "ﬁ" ligature (\uFB01)
    // 3. Education lines have right-aligned status ("Concluído (2024)", "(Previsão de conclusão: 2029)")
    const simulatedItems = [
      // Line 1 (Y ~ 700): Job title on left, right-aligned date at X=430
      { str: "Analista Fiscal — Empresa X", transform: [10, 0, 0, 10, 50, 700], width: 150, height: 10 },
      { str: "Mai/2025 – Atual", transform: [10, 0, 0, 10, 430, 700.2], width: 85, height: 10 },
      // Line 2 (Y ~ 502, straddling 501.9 and 502.1 which used to break Math.round(y/4)*4):
      { str: "• Elaboração de relatórios peri", transform: [10, 0, 0, 10, 50, 501.9], width: 145, height: 10 },
      { str: "ódicos de documentos \uFB01scais e contábeis.", transform: [10, 0, 0, 10, 195.5, 502.1], width: 195, height: 10 },
      // Line 3 (Y ~ 450): Education with split "Farm" + "ácia" and right-aligned "Concluído (2024)"
      { str: "Bacharelado em Farm", transform: [10, 0, 0, 10, 50, 450], width: 100, height: 10 },
      { str: "ácia", transform: [10, 0, 0, 10, 150.5, 449.8], width: 22, height: 10 },
      { str: "Concluído (2024)", transform: [10, 0, 0, 10, 430, 450], width: 85, height: 10 },
      // Line 4 (Y ~ 420): Course with "(Previsão de conclusão: 2029)"
      { str: "Ciências Contábeis (Previs", transform: [10, 0, 0, 10, 50, 420.1], width: 130, height: 10 },
      { str: "ão de conclus", transform: [10, 0, 0, 10, 180.4, 419.9], width: 65, height: 10 },
      { str: "ão: 2029)", transform: [10, 0, 0, 10, 245.6, 420.0], width: 50, height: 10 },
    ];

    const clusteredLines = clusterItemsIntoVisualLines(simulatedItems, 3.5);
    expect(clusteredLines.length).toBe(4);

    const rawPageText = clusteredLines
      .map((line) => joinLineItemsSmartly(line, 600))
      .join("\n");
    const formatted = formatResumeText(rawPageText);

    expect(formatted).toContain("Analista Fiscal — Empresa X — Mai/2025 – Atual");
    expect(formatted).toContain("periódicos de documentos fiscais e contábeis.");
    expect(formatted).toContain("Bacharelado em Farmácia — Concluído (2024)");
    expect(formatted).toContain("Ciências Contábeis (Previsão de conclusão: 2029)");
  });

  it("preserves 'Graduação em ...' without stripping 'Graduação' and isolates 'CERTIFICAÇÕES & CURSOS' from FORMAÇÃO ACADÊMICA", async () => {
    const { parseRawResumeToBuilderDraft } = await import(
      "@/lib/careerCopilotEngine"
    );

    const resumeSample = `Candidato Exemplo
candidato@email.com | (85) 99999-0000

FORMAÇÃO ACADÊMICA
Graduação em Gestão da Tecnologia da Informação — Universidade de Fortaleza (UNIFOR) 1º Semestre (Previsão de conclusão: 2029)
Pós-Graduação em Controladoria e Finanças — UniAteneu — Concluído (2024)
Graduação em Gestão Financeira — Faculdade Cearense — Concluído (2019)

CERTIFICAÇÕES & CURSOS
• Bootcamp de Liderança e Gestão Ágil (Atlântico Avanti) — Mar/2026
• Análise de Dados — Gestão de Processos (2024) — Ago/2024
• Geração Tech — Full Stack e Qualidade (Instituto iRede / Instituto Atlântico) — Out/2022
• Gestão Financeira e Liderança (2021)`;

    const draft = parseRawResumeToBuilderDraft(resumeSample);

    expect(draft.educations.length).toBe(3);
    expect(draft.educations[0].degree).toBe(
      "Graduação em Gestão da Tecnologia da Informação"
    );
    expect(draft.educations[0].institution).toBe(
      "Universidade de Fortaleza (UNIFOR)"
    );
    expect(draft.educations[0].period).toContain("Previsão de conclusão: 2029");

    expect(draft.educations[1].degree).toBe(
      "Pós-Graduação em Controladoria e Finanças"
    );
    expect(draft.educations[1].institution).toBe("UniAteneu");
    expect(draft.educations[1].period).toContain("2024");

    expect(draft.educations[2].degree).toBe("Graduação em Gestão Financeira");
    expect(draft.educations[2].institution).toBe("Faculdade Cearense");
    expect(draft.educations[2].period).toContain("2019");
  });

  it("extracts job metadata from LinkedIn/Gupy URLs, generates AI STAR bullet improvements, and evaluates Voice Interview answers in real time", async () => {
    const {
      extractJobFromUrl,
      generateBulletPointImprovements,
      evaluateInterviewAnswer,
    } = await import("@/lib/careerCopilotEngine");

    const gupyJob = await extractJobFromUrl(
      "https://itau.gupy.io/jobs/analista-financeiro-e-dados-senior",
      "pt"
    );
    expect(gupyJob.platform).toBe("Gupy");
    expect(gupyJob.companyName.toLowerCase()).toContain("itau");
    expect(gupyJob.jobDescription.length).toBeGreaterThan(100);

    const bullets = generateBulletPointImprovements(
      "• Responsável por elaborar relatórios financeiros e planilhas de controle mensal.",
      ["Power BI", "SQL"],
      ["Excel"]
    );
    expect(bullets.length).toBeGreaterThanOrEqual(1);
    expect(bullets[0].improvedBullet).toContain("Power BI");
    expect(bullets[0].improvedBullet).toMatch(/\d+%/);

    const evaluation = evaluateInterviewAnswer({
      question: {
        id: "q1",
        type: "technical",
        skillOrTopic: "Power BI",
        questionPt: "Como você utilizou Power BI em produção?",
        questionEn: "How have you used Power BI in production?",
        tipPt: "Cite métricas",
        tipEn: "Cite metrics",
      },
      transcript:
        "No meu projeto recente na empresa, tínhamos o objetivo de automatizar os relatórios da diretoria. Eu implementei dashboards integrados com Power BI e SQL, e como resultado reduzimos o tempo de fechamento em 40%.",
      targetSkills: ["Power BI", "SQL", "Excel"],
      candidateRole: "Analista Financeiro Sênior",
    });

    expect(evaluation.overallScore).toBeGreaterThanOrEqual(80);
    expect(evaluation.starBreakdown.situation).toBe(true);
    expect(evaluation.starBreakdown.task).toBe(true);
    expect(evaluation.starBreakdown.action).toBe(true);
    expect(evaluation.starBreakdown.result).toBe(true);
    expect(evaluation.starBreakdown.quantifiedMetric).toBe(true);
    expect(evaluation.mentionedKeywords).toContain("Power BI");
    expect(evaluation.estimatedWpm).toBeGreaterThan(0);
    expect(evaluation.totalFillers).toBe(0);
  });

  it("cleans noisy Ctrl+A LinkedIn/Gupy text, detects verbal fillers & WPM, and applies 1-click optimizations into Builder draft", async () => {
    const {
      cleanNoisyJobPageText,
      applyOptimizationsToBuilderDraft,
      evaluateInterviewAnswer,
    } = await import("@/lib/careerCopilotEngine");

    const noisyPaste = `Pular para o conteúdo principal
Início
Minha rede
Vagas
Notificações
Engenheiro de Software Full Stack Sênior
Nubank · São Paulo, SP
Candidatar-se
Salvar
Sobre a vaga
Requisitos: TypeScript, React, Node.js, Kubernetes e GraphQL.
Mostrar mais
Denunciar esta vaga
LinkedIn Corporation`;

    const cleaned = cleanNoisyJobPageText(noisyPaste);
    expect(cleaned.removedLinesCount).toBeGreaterThanOrEqual(6);
    expect(cleaned.cleanedText).not.toContain("Pular para o conteúdo");
    expect(cleaned.cleanedText).toContain("Kubernetes");
    expect(cleaned.detectedRole).toContain("Engenheiro de Software");

    const fillerEval = evaluateInterviewAnswer({
      question: {
        id: "q2",
        type: "behavioral_star",
        skillOrTopic: "Método STAR",
        questionPt: "Conte sobre um desafio",
        questionEn: "Tell me about a challenge",
        tipPt: "Use STAR",
        tipEn: "Use STAR",
      },
      transcript:
        "Então, tipo, no projeto passado nós tínhamos um problema, né, e basicamente tipo eu implementei um cache Redis reduzindo a latência em 35%.",
      targetSkills: ["Redis", "Node.js"],
      candidateRole: "Desenvolvedor Backend",
      recordingSeconds: 12,
    });

    expect(fillerEval.totalFillers).toBeGreaterThanOrEqual(3);
    expect(fillerEval.estimatedWpm).toBeGreaterThan(60);

    const updatedDraft = applyOptimizationsToBuilderDraft({
      existingDraft: null,
      fallbackResumeText: `Carla Mendes\ncarla@email.com\nHABILIDADES\nTypeScript, React\nEXPERIÊNCIA\nTechCorp — Engenheira (2022 - Atual)\n• Desenvolvi APIs em Node.js.`,
      improvedBullets: [
        {
          id: "b1",
          originalBullet: "• Desenvolvi APIs em Node.js.",
          improvedBullet:
            "• Estruturei e otimizei APIs em Node.js integrando GraphQL, reduzindo o tempo de processamento em 35%.",
          injectedSkill: "GraphQL",
          reasonPt: "Teste",
          reasonEn: "Test",
        },
      ],
      skillsToAdd: ["Kubernetes"],
    });

    expect(updatedDraft.personalInfo.skills).toContain("GraphQL");
    expect(updatedDraft.personalInfo.skills).toContain("Kubernetes");
    expect(updatedDraft.experiences[0].action).toContain("GraphQL");
    expect(updatedDraft.experiences[0].result).toContain("35%");
  });
});



