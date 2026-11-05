import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";

const THEME_STORAGE_KEY = "talenthub_theme";

export function ThemeToggle() {
  const { locale } = useLanguage();
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === "dark" || saved === "light") {
      return saved === "dark";
    }
    return true;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add("dark");
      localStorage.setItem(THEME_STORAGE_KEY, "dark");
    } else {
      root.classList.remove("dark");
      localStorage.setItem(THEME_STORAGE_KEY, "light");
    }
  }, [isDark]);

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => setIsDark((prev) => !prev)}
      className="h-8 gap-1.5 px-2.5 text-xs font-medium border-border/80 bg-background/60 hover:bg-secondary/80 transition-all"
      title={
        isDark
          ? locale === "pt"
            ? "Alternar para Modo Claro"
            : "Switch to Light Mode"
          : locale === "pt"
          ? "Alternar para Modo Noturno"
          : "Switch to Dark Mode"
      }
    >
      {isDark ? (
        <>
          <Sun className="h-3.5 w-3.5 text-[#E6AF00]" />
          <span className="hidden sm:inline">
            {locale === "pt" ? "Modo Claro" : "Light"}
          </span>
        </>
      ) : (
        <>
          <Moon className="h-3.5 w-3.5 text-[#1D3ECF]" />
          <span className="hidden sm:inline">
            {locale === "pt" ? "Modo Noturno" : "Dark"}
          </span>
        </>
      )}
    </Button>
  );
}
