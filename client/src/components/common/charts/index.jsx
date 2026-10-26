import React, { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Pie,
  PieChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { HRMS_CHART_BLUE_PALETTE, HRMS_CHART_PRIMARY } from "../../../util/chartTheme";
import "./charts.css";

/**
 * Shared recharts charts for the reports. Everything sizes from its container
 * (ResponsiveContainer), long labels are truncated with the full text in the tooltip,
 * and legends wrap under the chart on narrow cards, so nothing is clipped.
 */

const AXIS_TEXT = "#787878";
const GRID = "#e8edf3";
const LABEL_TEXT = "#313131";

const truncate = (text, max) => {
  const value = String(text ?? "");
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
};


/**
 * Width of an element, kept up to date with a ResizeObserver. Charts are drawn at this
 * measured width / the given height (instead of recharts' ResponsiveContainer), so a
 * card that is sized by flex / grid can never leave a chart at 0px.
 */
const useElementWidth = () => {
  const ref = useRef(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const read = () => setWidth(Math.floor(el.getBoundingClientRect().width || el.offsetWidth || 0));
    read();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", read);
      return () => window.removeEventListener("resize", read);
    }
    const observer = new ResizeObserver(read);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    // second read after layout settles (fonts, scrollbars, grid tracks)
    const id = requestAnimationFrame(() => {
      const el = ref.current;
      if (el) setWidth(Math.floor(el.getBoundingClientRect().width || el.offsetWidth || 0));
    });
    return () => cancelAnimationFrame(id);
  }, []);
  return [ref, width];
};

const defaultFormat = (value) => Number(value).toLocaleString();

const ChartTooltip = ({ active, payload, label, valueFormatter = defaultFormat, unit }) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="pro-chart-tooltip">
      {label !== undefined && label !== null && label !== "" ? (
        <div className="pro-chart-tooltip-title">{label}</div>
      ) : null}
      {payload.map((item, index) => (
        <div className="pro-chart-tooltip-row" key={`${item.dataKey}-${index}`}>
          <i style={{ background: item.color || item.payload?.fill || HRMS_CHART_PRIMARY }} />
          <span>{item.name && item.name !== "value" ? item.name : item.payload?.name}</span>
          <b>
            {valueFormatter(item.value)}
            {unit ? ` ${unit}` : ""}
          </b>
        </div>
      ))}
    </div>
  );
};

const CategoryTick = ({ x, y, payload, anchor = "end", max = 22, rotate = 0 }) => (
  <g transform={`translate(${x},${y})`}>
    <title>{payload.value}</title>
    <text
      dy={rotate ? 6 : 4}
      textAnchor={anchor}
      fill={LABEL_TEXT}
      fontSize={12}
      transform={rotate ? `rotate(${rotate})` : undefined}
    >
      {truncate(payload.value, max)}
    </text>
  </g>
);

/**
 * Bars for [{ name, value }].
 *  horizontal: bars run left-to-right with names on the left (good for many / long names)
 *  distributed: one colour per bar from the palette
 */
export function BarChartPro({
  data = [],
  horizontal = false,
  height,
  color = HRMS_CHART_PRIMARY,
  distributed = false,
  unit = "",
  valueFormatter = defaultFormat,
  showLabels = true,
  barSize,
}) {
  const gradientId = useId().replace(/:/g, "");
  const [boxRef, boxWidth] = useElementWidth();
  const rows = useMemo(() => data.map((item) => ({ ...item, value: Number(item.value) || 0 })), [data]);
  const longest = rows.reduce((max, row) => Math.max(max, String(row.name ?? "").length), 0);
  const chartHeight =
    height || (horizontal ? Math.max(180, rows.length * 44 + 50) : 280);
  const nameWidth = Math.min(160, Math.max(64, Math.min(longest, 22) * 7 + 12));
  const rotateX = !horizontal && (rows.length > 6 || longest > 10);
  const palette = HRMS_CHART_BLUE_PALETTE;

  return (
    <div className="pro-chart" ref={boxRef} style={{ height: chartHeight }}>
      {boxWidth > 0 ? (
        <BarChart
          width={boxWidth}
          height={chartHeight}
          data={rows}
          layout={horizontal ? "vertical" : "horizontal"}
          margin={{ top: 16, right: horizontal ? 36 : 12, bottom: rotateX ? 8 : 0, left: 0 }}
          barCategoryGap="28%"
        >
          <defs>
            <linearGradient id={`${gradientId}-h`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={color} stopOpacity={0.75} />
              <stop offset="100%" stopColor={color} stopOpacity={1} />
            </linearGradient>
            <linearGradient id={`${gradientId}-v`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={1} />
              <stop offset="100%" stopColor={color} stopOpacity={0.7} />
            </linearGradient>
          </defs>
          <CartesianGrid
            stroke={GRID}
            strokeDasharray="3 3"
            horizontal={!horizontal}
            vertical={horizontal}
          />
          {horizontal ? (
            <>
              <XAxis
                type="number"
                allowDecimals={false}
                axisLine={false}
                tickLine={false}
                tick={{ fill: AXIS_TEXT, fontSize: 12 }}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={nameWidth}
                interval={0}
                axisLine={false}
                tickLine={false}
                tick={<CategoryTick />}
              />
            </>
          ) : (
            <>
              <XAxis
                dataKey="name"
                interval={0}
                height={rotateX ? 64 : 30}
                axisLine={{ stroke: GRID }}
                tickLine={false}
                tick={rotateX ? <CategoryTick anchor="end" rotate={-35} max={16} /> : <CategoryTick anchor="middle" max={14} />}
              />
              <YAxis
                allowDecimals={false}
                axisLine={false}
                tickLine={false}
                width={40}
                tick={{ fill: AXIS_TEXT, fontSize: 12 }}
              />
            </>
          )}
          <Tooltip
            cursor={{ fill: "rgba(3, 103, 174, 0.06)" }}
            content={<ChartTooltip unit={unit} valueFormatter={valueFormatter} />}
          />
          <Bar
            dataKey="value"
            name="value"
            maxBarSize={barSize || (horizontal ? 28 : 56)}
            radius={horizontal ? [0, 6, 6, 0] : [6, 6, 0, 0]}
            fill={`url(#${gradientId}-${horizontal ? "h" : "v"})`}
            isAnimationActive={false}
          >
            {distributed
              ? rows.map((row, index) => (
                <Cell key={`${row.name}-${index}`} fill={palette[index % palette.length]} />
              ))
              : null}
            {showLabels ? (
              <LabelList
                dataKey="value"
                position={horizontal ? "right" : "top"}
                formatter={valueFormatter}
                style={{ fill: LABEL_TEXT, fontSize: 12, fontWeight: 600 }}
              />
            ) : null}
          </Bar>
        </BarChart>
      ) : null}
    </div>
  );
}

/**
 * Stacked bars. rows: [{ name, <key>: number, ... }], series: [{ key, label, color }].
 * `totalKey` (optional) names a field shown at the end of each bar.
 */
export function StackedBarChartPro({
  rows = [],
  series = [],
  horizontal = true,
  height,
  totalKey,
  unit = "",
}) {
  const longest = rows.reduce((max, row) => Math.max(max, String(row.name ?? "").length), 0);
  const nameWidth = Math.min(170, Math.max(70, Math.min(longest, 24) * 7 + 12));
  const chartHeight = height || (horizontal ? Math.max(240, rows.length * 38 + 50) : 320);
  const lastKey = series[series.length - 1]?.key;
  const [boxRef, boxWidth] = useElementWidth();

  return (
    <div className="pro-chart" ref={boxRef} style={{ height: chartHeight }}>
      {boxWidth > 0 ? (
        <BarChart
          width={boxWidth}
          height={chartHeight}
          data={rows}
          layout={horizontal ? "vertical" : "horizontal"}
          margin={{ top: 8, right: horizontal ? 44 : 12, bottom: 0, left: 0 }}
          barCategoryGap="30%"
        >
          <CartesianGrid stroke={GRID} strokeDasharray="3 3" horizontal={!horizontal} vertical={horizontal} />
          {horizontal ? (
            <>
              <XAxis type="number" allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: AXIS_TEXT, fontSize: 12 }} />
              <YAxis type="category" dataKey="name" width={nameWidth} interval={0} axisLine={false} tickLine={false} tick={<CategoryTick max={24} />} />
            </>
          ) : (
            <>
              <XAxis dataKey="name" interval={0} height={64} axisLine={{ stroke: GRID }} tickLine={false} tick={<CategoryTick anchor="end" rotate={-35} max={16} />} />
              <YAxis allowDecimals={false} axisLine={false} tickLine={false} width={40} tick={{ fill: AXIS_TEXT, fontSize: 12 }} />
            </>
          )}
          <Tooltip cursor={{ fill: "rgba(3, 103, 174, 0.06)" }} content={<ChartTooltip unit={unit} />} />
          {series.map((item, index) => (
            <Bar
              key={item.key}
              dataKey={item.key}
              name={item.label}
              stackId="stack"
              fill={item.color}
              stroke="#ffffff"
              strokeWidth={1}
              maxBarSize={26}
              radius={index === series.length - 1 ? (horizontal ? [0, 6, 6, 0] : [6, 6, 0, 0]) : 0}
              isAnimationActive={false}
            >
              {totalKey && item.key === lastKey ? (
                <LabelList
                  dataKey={totalKey}
                  position={horizontal ? "right" : "top"}
                  formatter={(value) => (Number(value) > 0 ? value : "")}
                  style={{ fill: LABEL_TEXT, fontSize: 12, fontWeight: 600 }}
                />
              ) : null}
            </Bar>
          ))}
        </BarChart>
      ) : null}
    </div>
  );
}

/**
 * Donut / pie for [{ name, value }] with a wrapping legend (right on wide cards,
 * underneath on narrow ones).
 */
export function DonutChartPro({
  data = [],
  height = 260,
  donut = true,
  unit = "",
  colors = HRMS_CHART_BLUE_PALETTE,
  valueFormatter = defaultFormat,
  showLegend = true,
  centerLabel,
}) {
  const rows = useMemo(
    () => data.map((item) => ({ ...item, value: Number(item.value) || 0 })).filter((item) => item.value > 0),
    [data]
  );
  const total = rows.reduce((sum, row) => sum + row.value, 0);
  const [plotRef, plotWidth] = useElementWidth();

  return (
    <div className="pro-donut">
      <div className="pro-donut-plot" ref={plotRef} style={{ height }}>
        {plotWidth > 0 ? (
          <PieChart width={plotWidth} height={height}>
            <Tooltip content={<ChartTooltip unit={unit} valueFormatter={valueFormatter} />} />
            <Pie
              data={rows}
              dataKey="value"
              nameKey="name"
              innerRadius={donut ? "58%" : 0}
              outerRadius="92%"
              paddingAngle={rows.length > 1 ? 2 : 0}
              stroke="#ffffff"
              strokeWidth={2}
              isAnimationActive={false}
            >
              {rows.map((row, index) => (
                <Cell key={`${row.name}-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Pie>
          </PieChart>
        ) : null}
        {donut && centerLabel !== null ? (
          <div className="pro-donut-center">
            <b>{valueFormatter(total)}</b>
            <span>{centerLabel || "Total"}</span>
          </div>
        ) : null}
      </div>
      {showLegend ? (
        <ul className="pro-donut-legend">
          {rows.map((row, index) => (
            <li key={`${row.name}-${index}`} title={`${row.name}: ${valueFormatter(row.value)}`}>
              <i style={{ background: colors[index % colors.length] }} />
              <span style={{ color: colors[index % colors.length] }}>{row.name}</span>
              <b>{valueFormatter(row.value)}</b>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}


/**
 * Smooth area / line over time for [{ name, value }] (e.g. a monthly trend).
 */
export function AreaChartPro({
  data = [],
  height = 280,
  color = HRMS_CHART_PRIMARY,
  unit = "",
  valueFormatter = defaultFormat,
  axisFormatter,
}) {
  const gradientId = useId().replace(/:/g, "");
  const [boxRef, boxWidth] = useElementWidth();
  const rows = useMemo(() => data.map((item) => ({ ...item, value: Number(item.value) || 0 })), [data]);

  return (
    <div className="pro-chart" ref={boxRef} style={{ height }}>
      {boxWidth > 0 ? (
        <AreaChart
          width={boxWidth}
          height={height}
          data={rows}
          margin={{ top: 12, right: 14, bottom: 0, left: 0 }}
        >
          <defs>
            <linearGradient id={`${gradientId}-a`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.28} />
              <stop offset="100%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="name"
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
            tick={{ fill: AXIS_TEXT, fontSize: 11 }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            width={48}
            tickCount={5}
            tickFormatter={axisFormatter || valueFormatter}
            tick={{ fill: AXIS_TEXT, fontSize: 11 }}
          />
          <Tooltip content={<ChartTooltip unit={unit} valueFormatter={valueFormatter} />} />
          <Area
            type="monotone"
            dataKey="value"
            name="value"
            stroke={color}
            strokeWidth={3}
            fill={`url(#${gradientId}-a)`}
            dot={{ r: 4, strokeWidth: 0, fill: color }}
            activeDot={{ r: 6 }}
            isAnimationActive={false}
          />
        </AreaChart>
      ) : null}
    </div>
  );
}
