import { AppLayout } from "@/components/AppLayout";
import {
  FileSearch,
  Target,
  FileText,
  TrendingUp,
  ArrowRight,
} from "lucide-react";
import { Link } from "react-router-dom";

const features = [
  {
    icon: FileSearch,
    title: "ATS Parser",
    description: "Simule como robôs ATS leem seu currículo e identifique problemas de formatação.",
    href: "/ats-parser",
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    icon: Target,
    title: "Keyword Matcher",
    description: "Compare seu currículo com a vaga e encontre palavras-chave ausentes.",
    href: "/keyword-matcher",
    color: "text-success",
    bgColor: "bg-success/10",
  },
  {
    icon: FileText,
    title: "Resume Builder",
    description: "Construa um currículo otimizado em coluna única com método STAR.",
    href: "/resume-builder",
    color: "text-warning",
    bgColor: "bg-warning/10",
  },
];

const stats = [
  { label: "Taxa ATS média", value: "72%", trend: "+12%" },
  { label: "Palavras-chave ideais", value: "15-25", trend: "por vaga" },
  { label: "Verbos de ação recomendados", value: "8+", trend: "por seção" },
];

const Index = () => {
  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-8 animate-fade-in">
        {/* Hero */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">
            Bem-vindo ao TalentHub OS
          </h1>
          <p className="text-muted-foreground text-lg">
            Otimize seu currículo para passar nos filtros da Gupy, Solides e Indeed.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="bg-card rounded-xl p-5 shadow-card border animate-slide-up"
            >
              <p className="text-sm text-muted-foreground font-medium">{stat.label}</p>
              <div className="flex items-end gap-2 mt-1">
                <span className="text-2xl font-bold">{stat.value}</span>
                <span className="text-xs text-primary font-medium flex items-center gap-0.5 mb-1">
                  <TrendingUp className="h-3 w-3" />
                  {stat.trend}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {features.map((feature) => (
            <Link
              key={feature.title}
              to={feature.href}
              className="group bg-card rounded-xl p-6 shadow-card border hover:shadow-elevated transition-all duration-300 animate-slide-up"
            >
              <div className={`${feature.bgColor} w-10 h-10 rounded-lg flex items-center justify-center mb-4`}>
                <feature.icon className={`h-5 w-5 ${feature.color}`} />
              </div>
              <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                {feature.description}
              </p>
              <span className="text-sm font-medium text-primary flex items-center gap-1 group-hover:gap-2 transition-all">
                Acessar <ArrowRight className="h-4 w-4" />
              </span>
            </Link>
          ))}
        </div>

        {/* Tips */}
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-6">
          <h3 className="font-semibold text-sm text-primary mb-2">💡 Dica de Especialista</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Plataformas como a Gupy priorizam currículos de <strong>coluna única</strong> para evitar erros de leitura. 
            Evite gráficos, tabelas e ícones — o parser ATS não consegue interpretá-los e seu currículo pode ser descartado automaticamente.
          </p>
        </div>
      </div>
    </AppLayout>
  );
};

export default Index;
