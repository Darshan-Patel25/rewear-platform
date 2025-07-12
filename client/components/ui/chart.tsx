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
} from "recharts"

import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"

// Define types for common chart props
type ChartProps = {
  data: Record<string, any>[]
  config: ChartConfig
  className?: string
}

// Line Chart Component
const CustomLineChart: React.FC<
  ChartProps & {
    lines: { dataKey: string; stroke: string; type?: "monotone" | "linear" }[]
    xAxisDataKey: string
  }
> = ({ data, config, className, lines, xAxisDataKey }) => (
  <ChartContainer config={config} className={className}>
    <LineChart accessibilityLayer data={data}>
      <CartesianGrid vertical={false} />
      <ChartTooltip content={<ChartTooltipContent />} />
      <ChartLegend content={<ChartLegendContent />} />
      {lines.map((lineProps, index) => (
        <Line key={index} dataKey={lineProps.dataKey} stroke={lineProps.stroke} type={lineProps.type || "monotone"} />
      ))}
    </LineChart>
  </ChartContainer>
)

// Bar Chart Component
const CustomBarChart: React.FC<
  ChartProps & {
    bars: { dataKey: string; fill: string }[]
    xAxisDataKey: string
  }
> = ({ data, config, className, bars, xAxisDataKey }) => (
  <ChartContainer config={config} className={className}>
    <BarChart accessibilityLayer data={data}>
      <CartesianGrid vertical={false} />
      <ChartTooltip content={<ChartTooltipContent />} />
      <ChartLegend content={<ChartLegendContent />} />
      {bars.map((barProps, index) => (
        <Bar key={index} dataKey={barProps.dataKey} fill={barProps.fill} />
      ))}
    </BarChart>
  </ChartContainer>
)

// Pie Chart Component
const CustomPieChart: React.FC<
  ChartProps & {
    pieDataKey: string
    nameKey: string
    innerRadius?: number
    outerRadius?: number
    fill?: string
  }
> = ({
  data,
  config,
  className,
  pieDataKey,
  nameKey,
  innerRadius = 80,
  outerRadius = 100,
  fill = "var(--color-primary)",
}) => (
  <ChartContainer config={config} className={className}>
    <PieChart>
      <ChartTooltip content={<ChartTooltipContent />} />
      <Pie
        data={data}
        dataKey={pieDataKey}
        nameKey={nameKey}
        innerRadius={innerRadius}
        outerRadius={outerRadius}
        fill={fill}
      />
      <ChartLegend content={<ChartLegendContent />} />
    </PieChart>
  </ChartContainer>
)

// Radial Bar Chart Component
const CustomRadialBarChart: React.FC<
  ChartProps & {
    radialDataKey: string
    innerRadius?: number
    outerRadius?: number
    barSize?: number
    fill?: string
  }
> = ({
  data,
  config,
  className,
  radialDataKey,
  innerRadius = 20,
  outerRadius = 140,
  barSize = 10,
  fill = "var(--color-primary)",
}) => (
  <ChartContainer config={config} className={className}>
    <RadialBarChart innerRadius={innerRadius} outerRadius={outerRadius} barSize={barSize} data={data}>
      <ChartTooltip content={<ChartTooltipContent />} />
      <RadialBar dataKey={radialDataKey} fill={fill} />
      <ChartLegend content={<ChartLegendContent />} />
    </RadialBarChart>
  </ChartContainer>
)

// Area Chart Component
const CustomAreaChart: React.FC<
  ChartProps & {
    areas: { dataKey: string; stroke: string; fill: string; type?: "monotone" | "linear" }[]
    xAxisDataKey: string
  }
> = ({ data, config, className, areas, xAxisDataKey }) => (
  <ChartContainer config={config} className={className}>
    <AreaChart accessibilityLayer data={data}>
      <CartesianGrid vertical={false} />
      <ChartTooltip content={<ChartTooltipContent />} />
      <ChartLegend content={<ChartLegendContent />} />
      {areas.map((areaProps, index) => (
        <Area
          key={index}
          dataKey={areaProps.dataKey}
          stroke={areaProps.stroke}
          fill={areaProps.fill}
          type={areaProps.type || "monotone"}
        />
      ))}
    </AreaChart>
  </ChartContainer>
)

export { CustomLineChart, CustomBarChart, CustomPieChart, CustomRadialBarChart, CustomAreaChart }
