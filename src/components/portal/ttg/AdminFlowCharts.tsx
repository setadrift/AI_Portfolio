"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Row = Record<string, string | number>;
type Series = { key: string; label: string; color: string; type?: "area" | "line"; dashed?: boolean };

const Link = (props: React.ComponentProps<"a">) => <a {...props} />;
const compact = new Intl.NumberFormat("en-CA", { notation: "compact", maximumFractionDigits: 1 });
const money = new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 });
const tooltipStyle = { border: "1px solid #dfe5e3", borderRadius: 8, boxShadow: "0 12px 30px rgba(26, 42, 40, .12)", fontSize: 12 };

function ChartSurface({ href, children }: { href?: string; children: React.ReactNode }) {
  return href
    ? <Link aria-label="Open the source data for this chart" className="ttg-chart-link" href={href}>{children}</Link>
    : children;
}

export function InteractiveTrendChart({ data, series, currency = false, href }: { data: Row[]; series: Series[]; currency?: boolean; href?: string }) {
  if (!data.length) return <EmptyChart />;
  return (
    <ChartSurface href={href}><div className="ttg-rechart">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 12, right: 12, left: currency ? 8 : -14, bottom: 0 }}>
          <defs>{series.map((item) => <linearGradient id={`fill-${item.key}`} key={item.key} x1="0" x2="0" y1="0" y2="1"><stop offset="5%" stopColor={item.color} stopOpacity={0.22} /><stop offset="95%" stopColor={item.color} stopOpacity={0.01} /></linearGradient>)}</defs>
          <CartesianGrid stroke="#edf1ef" vertical={false} />
          <XAxis axisLine={false} dataKey="label" fontSize={10} tickLine={false} tickMargin={10} />
          <YAxis axisLine={false} fontSize={10} tickFormatter={(value) => currency ? `$${compact.format(value)}` : compact.format(value)} tickLine={false} width={currency ? 54 : 38} />
          <Tooltip contentStyle={tooltipStyle} formatter={(value) => currency ? money.format(Number(value)) : Number(value).toLocaleString("en-CA")} />
          <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 11, paddingTop: 12 }} />
          {series.map((item) => item.type === "line"
            ? <Line dataKey={item.key} dot={false} key={item.key} name={item.label} stroke={item.color} strokeDasharray={item.dashed ? "5 5" : undefined} strokeWidth={2.5} type="monotone" />
            : <Area dataKey={item.key} fill={`url(#fill-${item.key})`} key={item.key} name={item.label} stroke={item.color} strokeWidth={2.5} type="monotone" />)}
        </AreaChart>
      </ResponsiveContainer>
    </div></ChartSurface>
  );
}

export function InteractiveBarChart({ data, valueKey = "value", currency = false, color = "#3b9fd7", horizontal = false, href }: { data: Row[]; valueKey?: string; currency?: boolean; color?: string; horizontal?: boolean; href?: string }) {
  if (!data.length) return <EmptyChart />;
  if (horizontal) {
    const maximum = Math.max(...data.map((row) => Number(row[valueKey]) || 0), 1);
    const formattedValue = (value: number) => currency
      ? money.format(value)
      : value.toLocaleString("en-CA", { maximumFractionDigits: 1 });
    return (
      <ChartSurface href={href}>
        <div className="ttg-horizontal-bars" role="img" aria-label={data.map((row) => `${row.label}: ${formattedValue(Number(row[valueKey]) || 0)}`).join(". ")}>
          {data.map((row) => {
            const value = Number(row[valueKey]) || 0;
            return (
              <div className="ttg-horizontal-bar-row" key={String(row.label)}>
                <span className="ttg-horizontal-bar-label">{row.label}</span>
                <span className="ttg-horizontal-bar-track" aria-hidden="true">
                  <i style={{ background: color, width: `${Math.max(value > 0 ? 2 : 0, value / maximum * 100)}%` }} />
                </span>
                <strong>{formattedValue(value)}</strong>
              </div>
            );
          })}
        </div>
      </ChartSurface>
    );
  }
  return (
    <ChartSurface href={href}><div className="ttg-rechart">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 8, left: currency ? 8 : -12, bottom: 4 }}>
          <CartesianGrid stroke="#edf1ef" vertical={false} />
          <XAxis axisLine={false} dataKey="label" fontSize={10} tickLine={false} tickMargin={9} />
          <YAxis axisLine={false} fontSize={10} tickFormatter={(value) => currency ? `$${compact.format(value)}` : compact.format(value)} tickLine={false} width={currency ? 54 : 38} />
          <Tooltip contentStyle={tooltipStyle} formatter={(value) => currency ? money.format(Number(value)) : Number(value).toLocaleString("en-CA")} />
          <Bar dataKey={valueKey} fill={color} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div></ChartSurface>
  );
}

export function InteractiveStackedChart({ data, series, href }: { data: Row[]; series: Array<{ key: string; label: string; color: string }>; href?: string }) {
  if (!data.length) return <EmptyChart />;
  return (
    <ChartSurface href={href}><div className="ttg-rechart">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 8, left: -12, bottom: 4 }}>
          <CartesianGrid stroke="#edf1ef" vertical={false} />
          <XAxis axisLine={false} dataKey="label" fontSize={10} tickLine={false} tickMargin={9} />
          <YAxis axisLine={false} fontSize={10} tickLine={false} width={38} />
          <Tooltip contentStyle={tooltipStyle} />
          <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 11, paddingTop: 12 }} />
          {series.map((item, index) => <Bar dataKey={item.key} fill={item.color} key={item.key} name={item.label} radius={index === series.length - 1 ? [4, 4, 0, 0] : 0} stackId="appointments" />)}
        </BarChart>
      </ResponsiveContainer>
    </div></ChartSurface>
  );
}

const PIE_COLORS = ["#3b9fd7", "#55b88b", "#efaa59", "#df6d76", "#866fc6", "#8aa2ae", "#d7c56c"];

export function InteractiveDonut({ data, currency = false, href }: { data: Array<{ label: string; value: number }>; currency?: boolean; href?: string }) {
  if (!data.length) return <EmptyChart />;
  return (
    <ChartSurface href={href}><div className="ttg-donut-layout">
      <div className="ttg-donut-chart">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie cx="50%" cy="50%" data={data} dataKey="value" innerRadius="58%" nameKey="label" outerRadius="84%" paddingAngle={1.5}>
              {data.map((item, index) => <Cell fill={PIE_COLORS[index % PIE_COLORS.length]} key={item.label} />)}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} formatter={(value) => currency ? money.format(Number(value)) : Number(value).toLocaleString("en-CA")} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="ttg-donut-legend">{data.slice(0, 7).map((item, index) => <div key={item.label}><i style={{ background: PIE_COLORS[index % PIE_COLORS.length] }} /><span>{item.label}</span><strong>{currency ? money.format(item.value) : item.value.toLocaleString("en-CA")}</strong></div>)}</div>
    </div></ChartSurface>
  );
}

export function InteractiveLineChart({ data, series, currency = false, href }: { data: Row[]; series: Series[]; currency?: boolean; href?: string }) {
  if (!data.length) return <EmptyChart />;
  return (
    <ChartSurface href={href}><div className="ttg-rechart">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 12, left: currency ? 8 : -14, bottom: 0 }}>
          <CartesianGrid stroke="#edf1ef" vertical={false} />
          <XAxis axisLine={false} dataKey="label" fontSize={10} tickLine={false} tickMargin={10} />
          <YAxis axisLine={false} fontSize={10} tickFormatter={(value) => currency ? `$${compact.format(value)}` : compact.format(value)} tickLine={false} width={currency ? 54 : 38} />
          <Tooltip contentStyle={tooltipStyle} formatter={(value) => currency ? money.format(Number(value)) : Number(value).toLocaleString("en-CA")} />
          <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 11, paddingTop: 12 }} />
          {series.map((item) => <Line dataKey={item.key} dot={false} key={item.key} name={item.label} stroke={item.color} strokeDasharray={item.dashed ? "5 5" : undefined} strokeWidth={2.5} type="monotone" />)}
        </LineChart>
      </ResponsiveContainer>
    </div></ChartSurface>
  );
}

function EmptyChart() {
  return <div className="ttg-chart-empty"><strong>No activity in this range</strong><span>Choose another reporting period or refresh the matching Jane history.</span></div>;
}
