interface ScoreGaugeProps {
  score: number;
  size?: number;
}

export function ScoreGauge({ score, size = 160 }: ScoreGaugeProps) {
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const getColor = () => {
    if (score >= 80) return "text-success";
    if (score >= 50) return "text-warning";
    return "text-destructive";
  };

  const getLabel = () => {
    if (score >= 80) return "Excelente";
    if (score >= 50) return "Bom";
    if (score >= 30) return "Regular";
    return "Fraco";
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={size} height={size} viewBox="0 0 100 100" className="transform -rotate-90">
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth="8"
        />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={`${getColor()} animate-score-fill transition-all duration-700`}
          style={{ "--score-offset": offset } as React.CSSProperties}
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center" style={{ width: size, height: size }}>
        <span className={`text-3xl font-bold ${getColor()}`}>{score}</span>
        <span className="text-xs text-muted-foreground font-medium">{getLabel()}</span>
      </div>
    </div>
  );
}
