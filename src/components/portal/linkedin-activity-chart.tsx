"use client";

import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Bar,
  BarChart,
} from "recharts";

export interface LinkedInDayData {
  date: string; // YYYY-MM-DD
  connections: number;
  messages: number;
  views: number;
}

interface Props {
  data: LinkedInDayData[];
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00Z");
  return date.toLocaleDateString("en-GB", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

interface TooltipEntry {
  name?: string;
  value?: number;
  color?: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string | number;
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="bg-popover border border-border rounded-md shadow-md p-3 text-xs">
      <p className="font-medium text-popover-foreground mb-2">
        {formatDate(String(label ?? ""))}
      </p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2 mb-1">
          <span
            className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-muted-foreground capitalize">{entry.name}:</span>
          <span className="font-medium text-popover-foreground ml-auto pl-3">
            {entry.value}
          </span>
        </div>
      ))}
    </div>
  );
};

const colors = {
  connections: "oklch(0.546 0.245 262.881)", // blue-600
  messages: "oklch(0 0 0)",                   // black
  views: "oklch(0.7 0 0)",                    // gray
};

export function LinkedInActivityChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height="100%" className="h-[160px] md:h-[220px]">
      <BarChart
        data={data}
        margin={{ top: 4, right: 4, left: -12, bottom: 0 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="oklch(0.92 0 0)"
          vertical={false}
        />
        <XAxis
          dataKey="date"
          fontSize={11}
          tickLine={false}
          axisLine={false}
          tickFormatter={formatDate}
          tick={{ fill: "oklch(0.45 0 0)" }}
        />
        <YAxis
          fontSize={11}
          tickLine={false}
          axisLine={false}
          tick={{ fill: "oklch(0.45 0 0)" }}
          allowDecimals={false}
          width={30}
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar
          dataKey="connections"
          fill={colors.connections}
          radius={[3, 3, 0, 0]}
          barSize={14}
        />
        <Bar
          dataKey="messages"
          fill={colors.messages}
          radius={[3, 3, 0, 0]}
          barSize={14}
        />
        <Bar
          dataKey="views"
          fill={colors.views}
          radius={[3, 3, 0, 0]}
          barSize={14}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function LinkedInChartLegend() {
  const items = [
    { label: "Connections", color: colors.connections },
    { label: "Messages", color: colors.messages },
    { label: "Views", color: colors.views },
  ];

  return (
    <div className="flex items-center gap-4 text-xs text-muted-foreground">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-1.5">
          <span
            className="inline-block w-2.5 h-2.5 rounded-sm"
            style={{ backgroundColor: item.color }}
          />
          {item.label}
        </div>
      ))}
    </div>
  );
}
