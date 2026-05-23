import { trpc } from "@/lib/trpc";
import { formatCurrency } from "@/components/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";

const COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

export default function Analytics() {
  const { data: summary, isLoading } = trpc.analytics.summary.useQuery();
  const { data: revenueData } = trpc.analytics.revenueByMonth.useQuery();
  const { data: salespersonData } = trpc.analytics.salespersonMetrics.useQuery();
  const { data: quotesByStatus } = trpc.analytics.quotesByStatus.useQuery();
  const { data: ordersByStatus } = trpc.analytics.ordersByStatus.useQuery();

  const revenueChartData = (revenueData ?? []).map((r) => ({
    month: r.month,
    revenue: parseFloat(r.revenue),
    orders: r.orderCount,
  }));

  const quoteStatusData = (quotesByStatus ?? []).map((q) => ({
    name: q.status,
    value: q.count,
    amount: parseFloat(q.totalValue),
  }));

  const orderStatusData = (ordersByStatus ?? []).map((o) => ({
    name: o.projectStatus,
    count: o.count,
    value: parseFloat(o.totalValue),
  }));

  const salesData = (salespersonData ?? []).map((s) => ({
    name: s.name ?? "Unassigned",
    revenue: parseFloat(s.totalRevenue),
    orders: s.totalOrders,
    sqft: parseFloat(s.totalSqft),
  }));

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display">Analytics</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Business performance overview</p>
      </div>

      {/* KPI summary */}
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Revenue", value: formatCurrency(summary?.totalRevenue), sub: "From completed orders" },
            { label: "Pipeline Value", value: formatCurrency(summary?.pipelineValue), sub: "Active & draft quotes" },
            { label: "Conversion Rate", value: `${summary?.conversionRate ?? "0.0"}%`, sub: "Quotes → Orders" },
            { label: "Avg Order Value", value: formatCurrency(
              summary?.totalOrders && summary?.totalRevenue && parseFloat(String(summary.totalRevenue)) > 0
                ? parseFloat(String(summary.totalRevenue)) / Number(summary.totalOrders)
                : 0
            ), sub: "Per completed order" },
          ].map((kpi) => (
            <Card key={kpi.label}>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">{kpi.label}</p>
                <p className="text-2xl font-bold font-display mt-1">{kpi.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{kpi.sub}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Revenue chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Monthly Revenue & Order Volume</CardTitle>
        </CardHeader>
        <CardContent>
          {revenueChartData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
              No revenue data yet. Convert quotes to orders to see trends.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={revenueChartData}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="left" tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number, name: string) => [
                  name === "revenue" ? formatCurrency(v) : v,
                  name === "revenue" ? "Revenue" : "Orders"
                ]} />
                <Legend />
                <Area yAxisId="left" type="monotone" dataKey="revenue" stroke="#6366f1" fill="url(#revGrad)" strokeWidth={2} name="revenue" />
                <Bar yAxisId="right" dataKey="orders" fill="#e0e7ff" name="orders" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Status breakdowns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Quote Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {quoteStatusData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">No quotes yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={quoteStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`}>
                    {quoteStatusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number, name: string, props: any) => [
                    `${v} quotes (${formatCurrency(props.payload.amount)})`, name
                  ]} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Order Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {orderStatusData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">No orders yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={orderStatusData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
                  <Tooltip formatter={(v: number, name: string, props: any) => [
                    `${v} orders (${formatCurrency(props.payload.value)})`, "Orders"
                  ]} />
                  <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Salesperson performance */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Salesperson Performance</CardTitle>
        </CardHeader>
        <CardContent>
          {salesData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">No sales data yet</div>
          ) : (
            <div className="space-y-4">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={salesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => [formatCurrency(v), "Revenue"]} />
                  <Bar dataKey="revenue" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Salesperson</th>
                      <th className="text-right py-2 pr-4 font-medium text-muted-foreground">Orders</th>
                      <th className="text-right py-2 pr-4 font-medium text-muted-foreground">Total Sq Ft</th>
                      <th className="text-right py-2 font-medium text-muted-foreground">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salesData.map((rep, i) => (
                      <tr key={i} className="border-b border-border/50 last:border-0">
                        <td className="py-2.5 pr-4 font-medium">{rep.name}</td>
                        <td className="py-2.5 pr-4 text-right">{rep.orders}</td>
                        <td className="py-2.5 pr-4 text-right">{rep.sqft.toFixed(1)} sq ft</td>
                        <td className="py-2.5 text-right font-semibold text-primary">{formatCurrency(rep.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
