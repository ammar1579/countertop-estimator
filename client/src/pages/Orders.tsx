import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { formatCurrency, formatDate, StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ShoppingCart } from "lucide-react";

const PROJECT_STATUSES = ["All", "Pending", "In Progress", "Completed", "Invoiced"] as const;
const PAYMENT_STATUSES = ["All", "Unpaid", "Partial", "Paid"] as const;

export default function Orders() {
  const [projectFilter, setProjectFilter] = useState("All");
  const [paymentFilter, setPaymentFilter] = useState("All");

  const { data: orders, isLoading } = trpc.orders.list.useQuery(
    {
      projectStatus: projectFilter !== "All" ? (projectFilter as any) : undefined,
      paymentStatus: paymentFilter !== "All" ? (paymentFilter as any) : undefined,
    }
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display">Orders</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {orders ? `${orders.length} order${orders.length !== 1 ? "s" : ""}` : "Loading..."}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap items-center">
        <div>
          <p className="text-xs text-muted-foreground mb-1 font-medium">Project Status</p>
          <div className="flex gap-1 bg-muted rounded-lg p-1">
            {PROJECT_STATUSES.map((s) => (
              <button key={s} onClick={() => setProjectFilter(s)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  projectFilter === s ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}>{s}</button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1 font-medium">Payment Status</p>
          <div className="flex gap-1 bg-muted rounded-lg p-1">
            {PAYMENT_STATUSES.map((s) => (
              <button key={s} onClick={() => setPaymentFilter(s)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  paymentFilter === s ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}>{s}</button>
            ))}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
      ) : !orders || orders.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <ShoppingCart className="w-12 h-12 text-muted-foreground/30 mb-3" />
            <p className="font-medium text-muted-foreground">No orders found</p>
            <p className="text-sm text-muted-foreground/70 mt-1">Convert a quote to create your first order</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Order</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Client</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Sq Ft</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Price List</th>
                  <th className="text-center px-4 py-3 font-medium text-muted-foreground">Project</th>
                  <th className="text-center px-4 py-3 font-medium text-muted-foreground">Payment</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Total</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Sale Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {orders.map((row) => (
                  <tr key={row.order.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/orders/${row.order.id}`}>
                        <div className="cursor-pointer">
                          <p className="font-medium hover:text-primary truncate max-w-48">{row.order.title}</p>
                          <p className="text-xs text-muted-foreground">{row.order.orderNumber}</p>
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      {row.client ? (
                        <Link href={`/clients/${row.client.id}`}>
                          <span className="hover:text-primary cursor-pointer">{row.client.firstName} {row.client.lastName}</span>
                        </Link>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right hidden md:table-cell text-muted-foreground">
                      {parseFloat(row.order.totalSqft ?? "0").toFixed(1)}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground">{row.priceList?.name ?? "—"}</td>
                    <td className="px-4 py-3 text-center"><StatusBadge status={row.order.projectStatus} /></td>
                    <td className="px-4 py-3 text-center"><StatusBadge status={row.order.paymentStatus} /></td>
                    <td className="px-4 py-3 text-right font-semibold">{formatCurrency(row.order.totalAmount)}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground hidden md:table-cell">{formatDate(row.order.saleDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
