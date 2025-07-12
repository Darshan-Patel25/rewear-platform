"use client"

import type * as React from "react"
import {
  CartesianGrid,
  Line,
  LineChart,
  Bar,
  BarChart,
  Pie,
  PieChart,
  RadialBar,
  RadialBarChart,
  Area,
  AreaChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart-lib"

// Define a type for common chart props
type CommonChartProps = {
  data: Record<string, any>[]
  chartConfig: ChartConfig
  className?: string
}

// Line Chart Component
interface LineChartProps extends CommonChartProps {
  category: string
  index: string
}

const LineChartComponent: React.FC<LineChartProps> = ({ data, chartConfig, category, index, className }) => (
  <ChartContainer config={chartConfig} className={className}>
    <LineChart accessibilityLayer data={data}>
      <CartesianGrid vertical={false} />
      <XAxis
        dataKey={index}
        tickLine={false}
        tickMargin={10}
        axisLine={false}
        tickFormatter={(value) => value.slice(0, 3)}
      />
      <YAxis />
      <Tooltip content={<ChartTooltipContent />} />
      <Legend content={<ChartLegendContent />} />
      {Object.entries(chartConfig).map(([key, { color, label }]) => {
        if (key !== category && key !== index) {
          return <Line key={key} dataKey={key} type="monotone" stroke={`hsl(${color})`} name={label} />
        }
        return null
      })}
    </LineChart>
  </ChartContainer>
)

// Bar Chart Component
interface BarChartProps extends CommonChartProps {
  category: string
  index: string
}

const BarChartComponent: React.FC<BarChartProps> = ({ data, chartConfig, category, index, className }) => (
  <ChartContainer config={chartConfig} className={className}>
    <BarChart accessibilityLayer data={data}>
      <CartesianGrid vertical={false} />
      <XAxis
        dataKey={index}
        tickLine={false}
        tickMargin={10}
        axisLine={false}
        tickFormatter={(value) => value.slice(0, 3)}
      />
      <YAxis />
      <Tooltip content={<ChartTooltipContent />} />
      <Legend content={<ChartLegendContent />} />
      {Object.entries(chartConfig).map(([key, { color, label }]) => {
        if (key !== category && key !== index) {
          return <Bar key={key} dataKey={key} fill={`hsl(${color})`} name={label} />
        }
        return null
      })}
    </BarChart>
  </ChartContainer>
)

// Area Chart Component
interface AreaChartProps extends CommonChartProps {
  category: string
  index: string
}

const AreaChartComponent: React.FC<AreaChartProps> = ({ data, chartConfig, category, index, className }) => (
  <ChartContainer config={chartConfig} className={className}>
    <AreaChart accessibilityLayer data={data}>
      <CartesianGrid vertical={false} />
      <XAxis
        dataKey={index}
        tickLine={false}
        tickMargin={10}
        axisLine={false}
        tickFormatter={(value) => value.slice(0, 3)}
      />
      <YAxis />
      <Tooltip content={<ChartTooltipContent />} />
      <Legend content={<ChartLegendContent />} />
      {Object.entries(chartConfig).map(([key, { color, label }]) => {
        if (key !== category && key !== index) {
          return (
            <Area
              key={key}
              dataKey={key}
              type="monotone"
              fill={`hsl(${color})`}
              stroke={`hsl(${color})`}
              name={label}
            />
          )
        }
        return null
      })}
    </AreaChart>
  </ChartContainer>
)

// Pie Chart Component
interface PieChartProps extends CommonChartProps {
  category: string
  nameKey?: string
}

const PieChartComponent: React.FC<PieChartProps> = ({ data, chartConfig, category, nameKey = "name", className }) => (
  <ChartContainer config={chartConfig} className={className}>
    <PieChart>
      <Tooltip content={<ChartTooltipContent />} />
      <Legend content={<ChartLegendContent />} />
      <Pie data={data} dataKey={category} nameKey={nameKey} />
    </PieChart>
  </ChartContainer>
)

// Radial Bar Chart Component
interface RadialBarChartProps extends CommonChartProps {
  category: string
  nameKey?: string
}

const RadialBarChartComponent: React.FC<RadialBarChartProps> = ({
  data,
  chartConfig,
  category,
  nameKey = "name",
  className,
}) => (
  <ChartContainer config={chartConfig} className={className}>
    <RadialBarChart innerRadius={20} outerRadius={140} barSize={10} data={data}>
      <Tooltip content={<ChartTooltipContent />} />
      <Legend content={<ChartLegendContent />} />
      <RadialBar dataKey={category} />
    </RadialBarChart>
  </ChartContainer>
)

export {
  LineChartComponent,
  BarChartComponent,
  AreaChartComponent,
  PieChartComponent,
  RadialBarChartComponent,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  ResponsiveContainer,
}
