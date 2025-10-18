
"use client";

import { Bar, BarChart, Area, AreaChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { format } from 'date-fns';

// --- Consistency Chart ---
interface ConsistencyChartProps {
  data: { date: string; questions: number }[];
}

const consistencyChartConfig = {
  questions: {
    label: "Questions",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig;

export function ConsistencyChart({ data }: ConsistencyChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[250px] text-muted-foreground">
        <p>No activity recorded in the last 30 days.</p>
      </div>
    );
  }

  return (
    <ChartContainer config={consistencyChartConfig} className="min-h-[250px] w-full">
      <ResponsiveContainer width="100%" height={250}>
        <AreaChart
          accessibilityLayer
          data={data}
          margin={{ top: 10, right: 10, left: -20, bottom: 40 }}
        >
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={false}
            tickMargin={10}
            tickFormatter={(value) => format(new Date(value), 'MMM d')}
             angle={-45}
             textAnchor="end"
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tickMargin={10}
            allowDecimals={false}
          />
          <ChartTooltip content={<ChartTooltipContent hideIndicator />} />
           <defs>
            <linearGradient id="fillQuestions" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="5%"
                stopColor="var(--color-questions)"
                stopOpacity={0.8}
              />
              <stop
                offset="95%"
                stopColor="var(--color-questions)"
                stopOpacity={0.1}
              />
            </linearGradient>
          </defs>
          <Area
            dataKey="questions"
            type="natural"
            fill="url(#fillQuestions)"
            stroke="var(--color-questions)"
            stackId="a"
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}


// --- Performance by Time Chart ---

interface PerformanceByTimeChartProps {
  data: { time: string; averageScore: number }[];
}

const performanceByTimeChartConfig = {
  averageScore: {
    label: "Avg. Score",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

export function PerformanceByTimeChart({ data }: PerformanceByTimeChartProps) {
    if (!data || data.every(d => d.averageScore === 0)) {
        return (
            <div className="flex items-center justify-center h-[250px] text-muted-foreground">
            <p>Not enough data to analyze performance by time.</p>
            </div>
        );
    }
    
  return (
    <ChartContainer config={performanceByTimeChartConfig} className="min-h-[250px] w-full">
      <ResponsiveContainer width="100%" height={250}>
        <BarChart
            accessibilityLayer
            data={data}
            layout="vertical"
            margin={{ top: 10, right: 10, left: 20, bottom: 10 }}
        >
            <CartesianGrid horizontal={false} />
            <YAxis
                dataKey="time"
                type="category"
                tickLine={false}
                tickMargin={10}
                axisLine={false}
                width={100}
            />
            <XAxis dataKey="averageScore" type="number" domain={[0, 100]} hide />
            <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
            <Bar dataKey="averageScore" name="Average Score" radius={5} />
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
