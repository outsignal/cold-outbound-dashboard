"use client";

import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const healthTooltips: Record<string, string> = {
  healthy: "Sender is active and operating normally",
  warning: "Sender has reduced activity — may need attention",
  paused: "Sender has been temporarily paused",
  blocked: "LinkedIn has restricted this account — our team is working on it",
  session_expired: "Session needs to be refreshed — our team has been notified",
};

interface HealthStatusBadgeProps {
  status: string;
  className?: string;
}

export function HealthStatusBadge({ status, className }: HealthStatusBadgeProps) {
  const tooltip = healthTooltips[status] ?? status;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge className={`text-xs cursor-help ${className ?? ""}`}>
            {status}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[220px]">
          {tooltip}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
