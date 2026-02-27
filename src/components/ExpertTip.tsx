import { ReactNode } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { HelpCircle } from "lucide-react";

interface ExpertTipProps {
  children: ReactNode;
  tip: string;
}

export function ExpertTip({ children, tip }: ExpertTipProps) {
  return (
    <div className="inline-flex items-center gap-1.5">
      {children}
      <Tooltip>
        <TooltipTrigger asChild>
          <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
        </TooltipTrigger>
        <TooltipContent className="max-w-xs text-xs leading-relaxed" side="top">
          <p>{tip}</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
