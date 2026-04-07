import { useLanguage } from "@/i18n/LanguageContext";
import { Languages } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LanguageSwitcher() {
  const { locale, setLocale } = useLanguage();

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setLocale(locale === "pt" ? "en" : "pt")}
      className="gap-1.5 text-xs font-medium"
    >
      <Languages className="h-4 w-4" />
      {locale === "pt" ? "EN" : "PT"}
    </Button>
  );
}
