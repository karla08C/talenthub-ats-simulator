import { useId } from "react";
import { useLanguage } from "@/i18n/LanguageContext";

interface ScoreGaugeProps {
  score: number;
  size?: number;
}

export function ScoreGauge({ score, size = 160 }: ScoreGaugeProps) {
  const { t } = useLanguage();
  const gradientId = useId();
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const clampedScore = Math.max(0, Math.min(100, score));
  const offset = circumference - (clampedScore / 100) * circumference;

  const getGradientStops = () => {
    if (clampedScore >= 80) {
      return { start: "#1D3ECF", mid: "#B04EB8", end: "#10B981" };
    }
    if (clampedScore >= 50) {
      return { start: "#1D3ECF", mid: "#B04EB8", end: "#E6AF00" };
    }
    return { start: "#B04EB8", mid: "#E6AF00", end: "#EF4444" };
  };

  const getBadgeStyle = () => {
    if (clampedScore >= 80) {
      return "palette-pill-mint border border-emerald-500/30";
    }
    if (clampedScore >= 50) {
      return "bg-[#E6AF00]/15 text-[#B88A00] dark:text-[#FFD24C] border border-[#E6AF00]/30";
    }
    return "palette-pill-blush border border-rose-500/30";
  };

  const getLabel = () => {
    if (clampedScore >= 80) return t("score.excellent");
    if (clampedScore >= 50) return t("score.good");
    if (clampedScore >= 30) return t("score.fair");
    return t("score.weak");
  };

  const stops = getGradientStops();

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        className="transform -rotate-90"
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={stops.start} />
            <stop offset="55%" stopColor={stops.mid} />
            <stop offset="100%" stopColor={stops.end} />
          </linearGradient>
        </defs>
        {/* Subtle inner track */}
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="hsl(var(--secondary))"
          strokeWidth="7.5"
        />
        {/* Animated gradient progress arc */}
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth="7.5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="animate-score-fill transition-all duration-700"
          style={{ "--score-offset": offset } as React.CSSProperties}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-3xl font-display font-extrabold tracking-tight text-foreground">
          {clampedScore}
        </span>
        <span
          className={`mt-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold uppercase tracking-wider ${getBadgeStyle()}`}
        >
          {getLabel()}
        </span>
      </div>
    </div>
  );
}
