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

export interface CampaignPerformanceData {
  name: string;
  sent: number;
  opened: number;
  replied: number;
}

interface Props {
  data: CampaignPerformanceData[];
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
    <div className="bg-popover border border-border rounded-md shadow-md p-3 text-xs max-w-[220px]">
      <p className="font-medium text-popover-foreground mb-2 truncate">
        {String(label ?? "")}
      </p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2 mb-1">
          <span
            className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-muted-foreground capitalize">{entry.name}:</span>
          <span className="font-medium text-popover-foreground ml-auto pl-3">
            {entry.value?.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
};

const colors = {
  sent: "oklch(0.87 0 0)",                  // light gray
  opened: "oklch(0 0 0)",                    // black
  replied: "oklch(0.85 0.12 110)",           // brand accent
};

// Shorten campaign name for chart labels
function shortenName(name: string, max = 18): string {
  if (name.length <= max) return name;
  return name.slice(0, max - 1) + "\u2026";
}

export function PortalPerformanceChart({ data }: Props) {
  const chartData = data.map((d) => ({
    ...d,
    shortName: shortenName(d.name),
  }));

  return (
    <ResponsiveContainer width="100%" height={Math.max(160, data.length * 48)}>
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 4, right: 4, left: 4, bottom: 0 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="oklch(0.92 0 0)"
          horizontal={false}
        />
        <XAxis
          type="number"
          fontSize={11}
          tickLine={false}
          axisLine={false}
          tick={{ fill: "oklch(0.45 0 0)" }}
          allowDecimals={false}
        />
        <YAxis
          type="category"
          dataKey="shortName"
          fontSize={11}
          tickLine={false}
          axisLine={false}
          tick={{ fill: "oklch(0.45 0 0)" }}
          width={100}
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar
          dataKey="sent"
          fill={colors.sent}
          radius={[0, 3, 3, 0]}
          barSize={16}
        />
        <Bar
          dataKey="opened"
          fill={colors.opened}
          radius={[0, 3, 3, 0]}
          barSize={16}
        />
        <Bar
          dataKey="replied"
          fill={colors.replied}
          radius={[0, 3, 3, 0]}
          barSize={16}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function PerformanceChartLegend() {
  const items = [
    { label: "Sent", color: colors.sent },
    { label: "Opened", color: colors.opened },
    { label: "Replied", color: colors.replied },
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
