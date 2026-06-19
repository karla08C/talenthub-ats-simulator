# TalentHub 

O **TalentHub** é um **Simulador de Leitura de ATS** (Analisador e Otimizador de Currículos) focado na experiência do candidato. Ele foi desenvolvido para ajudar profissionais a testarem se os seus currículos em formato PDF estão prontos para passar sem barreiras pelos robôs e sistemas automáticos de triagem de vagas das empresas (como Gupy, indeed, Workday, etc.).

---

##  Principais Funcionalidades

* **Extração Nativa de PDF (`pdfjsLib`):** Faz a varredura completa do documento simulando o comportamento exato dos robôs das empresas.
* **Diagnóstico de Leitura:** Avalia a legibilidade do arquivo para garantir que as informações cruciais não fiquem ocultas por falhas de design ou formatação complexa.
* **Keyword Match ():**  valida a compatibilidade de palavras-chave do currículo contra os requisitos específicos da vaga.

---

## Tecnologias Utilizadas

Este projeto foi construído utilizando uma stack moderna de engenharia de software voltada para performance e componentização:

* **React** + **TypeScript**
* **Vite** (Build Tool e Empacotador ultrarrápido)
* **Tailwind CSS** (Estilização Utilitária)
* **shadcn/ui** (Biblioteca de Componentes Acessíveis)
* **PDF.js (pdfjs-dist)** (Biblioteca de Parsing e processamento de arquivos PDF)

---

##  Como Executar o Projeto Localmente

Se você deseja rodar ou clonar este ecossistema na sua máquina local, certifique-se de ter o **Node.js** e o **npm** instalados.

1. **Clone o repositório:**
```bash
   git clone [https://github.com/SEU_USUARIO/job-jam-boost.git](https://github.com/SEU_USUARIO/job-jam-boost.git)