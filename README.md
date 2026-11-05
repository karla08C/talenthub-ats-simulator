# TalentHub AI: Simulador ATS e Copiloto de Carreira

O **TalentHub AI** é uma plataforma web de inteligência de carreira e simulação de **ATS (Applicant Tracking Systems)** como Gupy, Greenhouse, Lever e Workday.

O projeto permite que pessoas candidatas façam o raio-X técnico do currículo em PDF ou TXT, extraiam requisitos de vagas por link ou texto copiado, apliquem reescritas de *bullet points* no padrão **STAR / Google XYZ** com 1 clique, editem o currículo com **Preview A4 em tempo real** e treinem em um **Simulador de Entrevista por Voz** com feedback instantâneo de estrutura, ritmo de fala (WPM) e vícios de linguagem.

---

## Jornada Completa em 4 Etapas

### Etapa 01: Simulador de Leitura ATS (`/ats-parser`)
* **Extração espacial de PDF (`pdfjs-dist`)**: reconstrução fiel de linhas visuais a partir das coordenadas `(X, Y)` do documento, preservando acentuação, ligaduras tipográficas (`ﬁ`, `ﬂ`) e datas alinhadas à direita.
* **Detecção de riscos estruturais**: identifica layouts multi-coluna, tabelas/grades, PDFs escaneados sem camada de texto e glifos privados de fontes de ícones que quebram robôs de recrutamento.
* **Diagnóstico acionável**: pontuação de 0 a 100 com filtros por severidade (Crítico, Alerta, Aprovado), auditoria de seções, verbos de ação e métricas quantificadas (`%`, `R$`, escala e KPIs).

### Etapa 02: Raio-X de Vaga e Match Semântico (`/keyword-matcher`)
* **Importação de vaga por URL**: extrai ou sintetiza descrições de vagas a partir de links do LinkedIn, Gupy, Greenhouse e Workday.
* **Limpador inteligente de `Ctrl+A`**: remove cabeçalhos, menus, avisos de cookies e rodapés de páginas inteiras copiadas do LinkedIn ou Gupy, detectando cargo e empresa automaticamente.
* **Motor de taxonomia e sinônimos**: preserva termos técnicos especiais (`C#`, `C++`, `.NET`, `Node.js`, `CI/CD`, `Power BI`) e reconhece equivalências (`Postgres` <-> `PostgreSQL`, `K8s` <-> `Kubernetes`, `JS` <-> `JavaScript`), calculando score ponderado entre Hard Skills (60%), Domínio/Ferramentas (25%) e Soft Skills (15%).
* **Reescrita de Bullet Points via IA (Local ou Gemini 2.5)**: sugere melhorias comparando o tópico original (*Antes*) e a versão otimizada no padrão STAR (*Depois*), com botão para injetar tudo diretamente no Construtor A4 com 1 clique.

### Etapa 03: Gerador de Currículo STAR e Preview A4 (`/resume-builder`)
* **Importação automática com classificação semântica STAR**: converte qualquer currículo bruto em blocos estruturados de Dados Pessoais, Resumo, Habilidades, Experiências divididas nos 4 quadrantes **STAR (Situação, Tarefa, Ação e Resultado)** e Formação Acadêmica.
* **Editor + Folha A4 lado a lado em tempo real**: visualização instantânea do currículo diagramado enquanto os campos são preenchidos.
* **3 Templates ATS-Safe**: alternância imediata entre os layouts **Clássico Harvard**, **Tech Minimalista** e **Executivo**, refletidos na exportação em PDF e TXT.
* **Medidor de densidade de 1 página A4**: monitora a quantidade de palavras e o percentual de ocupação da página em tempo real.

### Etapa 04: Copiloto de Carreira e Simulador de Voz (`/career-copilot`)
* **Simulador de Entrevista por Voz (Web Speech API)**:
  * Leitura das perguntas em voz alta via síntese de voz nativa (`speechSynthesis`).
  * Transcrição em tempo real da resposta falada no microfone (`SpeechRecognition`).
  * Avaliação ao vivo dos 4 pilares STAR, cobertura de *keywords* da vaga, **ritmo de fala em palavras por minuto (WPM)** e **detector de vícios de linguagem** (*"tipo"*, *"né"*, *"basicamente"*, *"na verdade"*).
  * **Relatório Consolidado de Prontidão (Mock Interview)** ao final da rodada de perguntas.
* **Pitch e Carta de Apresentação**: geração automática de *Elevator Pitch*, mensagem curta de conexão para recrutadores no LinkedIn e *Cover Letter* estruturada.
* **Kanban de Versões de Currículo**: salvamento de snapshots do currículo adaptados para cada empresa, com filtros por etapa do funil (*Salva, Aplicada, Entrevista, Proposta*) e comparativo de evolução do score ATS.

---

## Identidade Visual e Experiência de Uso (UX/UI)

* **Modo Noturno e Claro persistente**: alternância instantânea no cabeçalho com suporte completo a variáveis semânticas CSS.
* **Paleta de Cores Editorial Tech**:
  * Cobalt (`#1D3ECF`)
  * Orchid (`#B04EB8`)
  * Amber (`#E6AF00`)
  * Mint (`#D7F7E1`)
  * Blush (`#FFEBE8`)
* **Tipografia**: `Plus Jakarta Sans` para títulos e destaques, `Inter` para leitura corrida e `JetBrains Mono` para telemetria, scores e métricas.
* **Internacionalização (i18n)**: interface disponível em Português (`PT-BR`) e Inglês (`EN`).
* **Portal de Login (`/login`)**: autenticação local rápida com modo de demonstração em 1 clique.

---

## Tecnologias Utilizadas

* **Frontend**: React 18, TypeScript, Vite
* **Estilização e Componentes**: Tailwind CSS, shadcn/ui, Radix UI, Lucide Icons
* **Processamento de Documentos e Voz**: PDF.js (`pdfjs-dist`), Web Speech API (`SpeechRecognition` e `speechSynthesis`)
* **IA Opcional**: Integração REST com Google Gemini API (`gemini-2.5-flash`)
* **Testes Automatizados**: Vitest e Testing Library

---

## Estrutura Principal do Projeto

```text
src/
├── components/
│   ├── AppLayout.tsx        # Cabeçalho, Stepper de 4 etapas, Tema, Idioma e Sessão
│   ├── AppSidebar.tsx       # Navegação lateral colapsável
│   ├── ScoreGauge.tsx       # Medidor circular SVG com gradiente dinâmico
│   └── ThemeToggle.tsx      # Alternador de Modo Noturno / Claro
├── lib/
│   ├── atsEngine.ts         # Extração espacial de PDF e motor de diagnóstico ATS
│   ├── keywordEngine.ts     # Taxonomia de skills, sinônimos e cálculo ponderado
│   └── careerCopilotEngine.ts # Parser STAR, extrator de vagas, limpador Ctrl+A e avaliador de voz
├── pages/
│   ├── Index.tsx            # Painel principal e telemetria da sessão
│   ├── ATSParser.tsx        # Etapa 01: Simulador ATS e Raio-X do texto extraído
│   ├── KeywordMatcher.tsx   # Etapa 02: Match de vaga por link/texto e reescrita de bullets
│   ├── ResumeBuilder.tsx    # Etapa 03: Construtor STAR com Preview A4 lado a lado
│   ├── CareerCopilot.tsx    # Etapa 04: Simulador de entrevista por voz, Pitches e Kanban
│   └── Login.tsx            # Tela de login e cadastro com acesso rápido demo
└── test/
    └── example.test.ts      # Suíte de testes unitários dos motores ATS, Matcher e Copilot
```

---

## Como Executar Localmente

```bash
# 1. Clone o repositório
git clone https://github.com/karla08C/talenthub-ats-simulator.git

# 2. Acesse a pasta do projeto
cd talenthub-ats-simulator

# 3. Instale as dependências
npm install

# 4. Inicie o servidor de desenvolvimento
npm run dev
```

### Executando os Testes e Verificação de Tipos

```bash
# Executar suíte de testes unitários (Vitest)
npm test

# Verificar tipagem TypeScript
npx tsc --noEmit
```
