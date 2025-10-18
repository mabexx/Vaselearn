
"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

interface ChartData {
  topic: string;
  averageScore: number;
}

interface DashboardChartsProps {
  chartData: ChartData[];
}

const chartConfig = {
  averageScore: {
    label: "Avg. Score",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

export function DashboardCharts({ chartData }: DashboardChartsProps) {
  if (!chartData || chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-[350px] text-muted-foreground">
        <p>Complete a quiz to see your progress chart.</p>
      </div>
    );
  }

  const processedData = chartData.map(item => ({
    subject: item.topic,
    averageScore: item.averageScore,
    fill: "hsl(var(--chart-1))",
  }));

  return (
    <ChartContainer config={chartConfig} className="min-h-[350px] w-full">
      <ResponsiveContainer width="100%" height={350}>
        <BarChart
          accessibilityLayer
          data={processedData}
          margin={{ top: 20, right: 20, bottom: 60, left: 20 }}
        >
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="subject"
            tickLine={false}
            tickMargin={10}
            axisLine={false}
            angle={-45}
            textAnchor="end"
            height={80} 
            interval={0}
          />
          <YAxis
            dataKey="averageScore"
            domain={[0, 100]}
            tickFormatter={(value) => `${value}%`}
            tickLine={false}
            tickMargin={10}
            axisLine={false}
          />
          <ChartTooltip
            cursor={false}
            content={<ChartTooltipContent indicator="dot" />}
          />
          <Bar dataKey="averageScore" name="Average Score" radius={8} />
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}

    