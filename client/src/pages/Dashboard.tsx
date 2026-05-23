import { trpc } from "@/lib/trpc";
import { formatCurrency } from "@/components/StatusBadge";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  BarChart3,
  FileText,
  ShoppingCart,
  Users,
  TrendingUp,
  Package,
  AlertTriangle,
  ArrowRight,
  DollarSign,
  Percent,
} from "lucide-react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
  href,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  color: string;
  href?: string;
}) {
  const content = (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-sm text-muted-foreground font-medium">{title}</p>
            <p className="text-2xl font-bold font-display mt-1 text-foreground">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
          </div>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (href) return <Link href={href}>{content}</Link>;
  return content;
}

export default function Dashboard() {
  const { user } = useAuth();
  const { data: summary, isLoading } = trpc.analytics.summary.useQuery();
  const { data: revenueData } = trpc.analytics.revenueByMonth.useQuery();
  const { data: salespersonData } = trpc.analytics.salespersonMetrics.useQuery();
  const { data: quotesByStatus } = trpc.analytics.quotesByStatus.useQuery();
  const { data: recentQuotes } = trpc.quotes.list.useQuery({ });
  const { data: recentOrders } = trpc.orders.list.useQuery({});

  const chartData = (revenueData ?? []).map((r) => ({
    month: r.month,
    revenue: parseFloat(r.revenue),
    orders: r.orderCount,
  }));

  const quoteStatusData = (quotesByStatus ?? []).map((q) => ({
    name: q.status,
    count: q.count,
    value: parseFloat(q.totalValue),
  }));

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display text-foreground">
            Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"},{" "}
            {user?.name?.split(" ")[0] ?? "there"}
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {new Date().toLocaleDateString("en-CA", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/quotes/new">
            <Button size="sm">
              <FileText className="w-4 h-4 mr-2" />
              New Quote
            </Button>
          </Link>
          <Link href="/clients">
            <Button variant="outline" size="sm">
              <Users className="w-4 h-4 mr-2" />
              Add Client
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Revenue"
            value={formatCurrency(summary?.totalRevenue)}
            subtitle="From completed orders"
            icon={DollarSign}
            color="bg-primary/10 text-primary"
            href="/orders"
          />
          <StatCard
            title="Pipeline Value"
            value={formatCurrency(summary?.pipelineValue)}
            subtitle="Active & draft quotes"
            icon={TrendingUp}
            color="bg-blue-100 text-blue-600"
            href="/quotes"
          />
          <StatCard
            title="Active Quotes"
            value={summary?.activeQuotes ?? 0}
            subtitle={`${summary?.draftQuotes ?? 0} drafts pending`}
            icon={FileText}
            color="bg-amber-100 text-amber-600"
            href="/quotes"
          />
          <StatCard
            title="Total Orders"
            value={summary?.totalOrders ?? 0}
            subtitle="Converted from quotes"
            icon={ShoppingCart}
            color="bg-emerald-100 text-emerald-600"
            href="/orders"
          />
          <StatCard
            title="Total Clients"
            value={summary?.totalClients ?? 0}
            subtitle="In your database"
            icon={Users}
            color="bg-purple-100 text-purple-600"
            href="/clients"
          />
          <StatCard
            title="Conversion Rate"
            value={`${summary?.conversionRate ?? "0.0"}%`}
            subtitle="Quotes to orders"
            icon={Percent}
            color="bg-indigo-100 text-indigo-600"
          />
          <StatCard
            title="Total Quotes"
            value={summary?.totalQuotes ?? 0}
            subtitle="All time"
            icon={BarChart3}
            color="bg-slate-100 text-slate-600"
            href="/quotes"
          />
          <StatCard
            title="Low Stock Items"
            value={summary?.lowStockCount ?? 0}
            subtitle="Need attention"
            icon={summary?.lowStockCount ? AlertTriangle : Package}
            color={summary?.lowStockCount ? "bg-red-100 text-red-600" : "bg-slate-100 text-slate-600"}
            href="/inventory"
          />
        </div>
      )}

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Revenue by Month</CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                No revenue data yet. Convert your first quote to an order.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
                  <YAxis tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => [formatCurrency(v), "Revenue"]} />
                  <Area type="monotone" dataKey="revenue" stroke="var(--color-primary)" fill="url(#revenueGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Quote status breakdown */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Quote Pipeline</CardTitle>
          </CardHeader>
          <CardContent>
            {quoteStatusData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">No quotes yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={quoteStatusData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" width={60} />
                  <Tooltip formatter={(v: number) => [v, "Quotes"]} />
                  <Bar dataKey="count" fill="var(--color-primary)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent quotes */}
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold">Recent Quotes</CardTitle>
            <Link href="/quotes">
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
                View all <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {!recentQuotes || recentQuotes.length === 0 ? (
              <p className="text-sm text-muted-foreground px-6 pb-4">No quotes yet.</p>
            ) : (
              <div className="divide-y divide-border">
                {recentQuotes.slice(0, 5).map((row) => (
                  <Link key={row.quote.id} href={`/quotes/${row.quote.id}`}>
                    <div className="flex items-center justify-between px-6 py-3 hover:bg-muted/50 transition-colors cursor-pointer">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{row.quote.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {row.client ? `${row.client.firstName} ${row.client.lastName}` : "—"} · {row.quote.quoteNumber}
                        </p>
                      </div>
                      <div className="text-right ml-4 shrink-0">
                        <p className="text-sm font-semibold">{formatCurrency(row.quote.totalAmount)}</p>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                          row.quote.status === "Active" ? "bg-emerald-100 text-emerald-700" :
                          row.quote.status === "Expired" ? "bg-red-100 text-red-700" :
                          "bg-amber-100 text-amber-700"
                        }`}>{row.quote.status}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent orders */}
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold">Recent Orders</CardTitle>
            <Link href="/orders">
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
                View all <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {!recentOrders || recentOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground px-6 pb-4">No orders yet. Convert a quote to get started.</p>
            ) : (
              <div className="divide-y divide-border">
                {recentOrders.slice(0, 5).map((row) => (
                  <Link key={row.order.id} href={`/orders/${row.order.id}`}>
                    <div className="flex items-center justify-between px-6 py-3 hover:bg-muted/50 transition-colors cursor-pointer">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{row.order.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {row.client ? `${row.client.firstName} ${row.client.lastName}` : "—"} · {row.order.orderNumber}
                        </p>
                      </div>
                      <div className="text-right ml-4 shrink-0">
                        <p className="text-sm font-semibold">{formatCurrency(row.order.totalAmount)}</p>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                          row.order.projectStatus === "Completed" ? "bg-emerald-100 text-emerald-700" :
                          row.order.projectStatus === "In Progress" ? "bg-blue-100 text-blue-700" :
                          row.order.projectStatus === "Invoiced" ? "bg-purple-100 text-purple-700" :
                          "bg-amber-100 text-amber-700"
                        }`}>{row.order.projectStatus}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Salesperson metrics */}
      {salespersonData && salespersonData.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Salesperson Performance</CardTitle>
          </CardHeader>
          <CardContent>
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
                  {salespersonData.map((rep, i) => (
                    <tr key={i} className="border-b border-border/50 last:border-0">
                      <td className="py-2.5 pr-4 font-medium">{rep.name ?? "Unassigned"}</td>
                      <td className="py-2.5 pr-4 text-right">{rep.totalOrders}</td>
                      <td className="py-2.5 pr-4 text-right">{parseFloat(rep.totalSqft).toFixed(1)} sq ft</td>
                      <td className="py-2.5 text-right font-semibold text-primary">{formatCurrency(rep.totalRevenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
