import { useState } from "react";
import { useParams, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { formatCurrency, formatDate, StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { ArrowLeft, FileText, User, Calendar, DollarSign } from "lucide-react";

const PROJECT_STATUSES = ["Pending", "In Progress", "Completed", "Invoiced"] as const;
const PAYMENT_STATUSES = ["Unpaid", "Partial", "Paid"] as const;

function getTaxLabel(priceList?: { taxRate?: string | null } | null) {
  const rate = priceList?.taxRate ? parseFloat(priceList.taxRate) : 0.13;
  return `HST (${(rate * 100).toFixed(0)}%)`;
}

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const orderId = parseInt(id);
  const utils = trpc.useUtils();

  const { data: orderData, isLoading } = trpc.orders.getById.useQuery({ id: orderId });
  const { data: lineItems } = trpc.orders.getLineItems.useQuery({ orderId });

  const updateMutation = trpc.orders.update.useMutation({
    onSuccess: () => {
      utils.orders.getById.invalidate({ id: orderId });
      toast.success("Order updated");
    },
    onError: (e) => toast.error(e.message),
  });

  if (isLoading) {
    return (
      <div className="p-6 max-w-5xl mx-auto space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (!orderData) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Order not found.</p>
        <Link href="/orders"><Button variant="outline" className="mt-4">Back to Orders</Button></Link>
      </div>
    );
  }

  const { order, client, priceList, quote } = orderData;
  const taxLabel = getTaxLabel(priceList);

  const groupedItems = lineItems?.reduce((acc, item) => {
    const key = item.areaLabel ?? "Area #1";
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {} as Record<string, typeof lineItems>) ?? {};

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/orders">
          <Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold font-display">{order.title}</h1>
            <StatusBadge status={order.projectStatus} />
            <StatusBadge status={order.paymentStatus} />
          </div>
          <p className="text-muted-foreground text-sm mt-0.5">
            {order.orderNumber} · {client?.firstName} {client?.lastName}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Line items */}
        <div className="lg:col-span-2 space-y-4">
          {/* Client & quote info */}
          <Card>
            <CardContent className="p-4 grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-2">Client</p>
                {client ? (
                  <Link href={`/clients/${client.id}`}>
                    <div className="cursor-pointer hover:text-primary">
                      <p className="font-semibold">{client.firstName} {client.lastName}</p>
                      {client.company && <p className="text-muted-foreground">{client.company}</p>}
                      {client.email && <p className="text-muted-foreground">{client.email}</p>}
                      {client.phone && <p className="text-muted-foreground">{client.phone}</p>}
                    </div>
                  </Link>
                ) : <p className="text-muted-foreground">—</p>}
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-2">Order Info</p>
                <p><span className="text-muted-foreground">Order #:</span> {order.orderNumber}</p>
                <p><span className="text-muted-foreground">Price List:</span> {priceList?.name}</p>
                <p><span className="text-muted-foreground">Sale Date:</span> {formatDate(order.saleDate)}</p>
                {quote && (
                  <p>
                    <span className="text-muted-foreground">From Quote:</span>{" "}
                    <Link href={`/quotes/${quote.id}`}>
                      <span className="text-primary hover:underline cursor-pointer">{quote.quoteNumber}</span>
                    </Link>
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Line items by area */}
          {Object.entries(groupedItems).map(([area, items]: any) => (
            <Card key={area}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">{area}</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/30 border-b border-border">
                      <th className="text-left px-4 py-2 font-medium text-muted-foreground">Description</th>
                      <th className="text-right px-4 py-2 font-medium text-muted-foreground">Qty</th>
                      <th className="text-center px-4 py-2 font-medium text-muted-foreground">Unit</th>
                      <th className="text-right px-4 py-2 font-medium text-muted-foreground">Rate</th>
                      <th className="text-right px-4 py-2 font-medium text-muted-foreground">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {items.map((item: any) => (
                      <tr key={item.id}>
                        <td className="px-4 py-2.5">{item.description}</td>
                        <td className="px-4 py-2.5 text-right">{parseFloat(item.quantity).toFixed(2)}</td>
                        <td className="px-4 py-2.5 text-center text-muted-foreground">{item.unit}</td>
                        <td className="px-4 py-2.5 text-right">{formatCurrency(item.pricePerUnit)}</td>
                        <td className="px-4 py-2.5 text-right font-medium">{formatCurrency(item.lineTotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          ))}

          {/* Totals */}
          <Card>
            <CardContent className="p-4">
              <div className="max-w-xs ml-auto space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrency(order.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{taxLabel}</span>
                  <span>{formatCurrency(order.taxAmount)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold text-base">
                  <span>Total</span>
                  <span className="text-primary">{formatCurrency(order.totalAmount)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {order.notes && (
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-2">Notes</p>
                <p className="text-sm whitespace-pre-wrap">{order.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar: status controls */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Project Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground mb-2">Project Progress</p>
                <Select
                  value={order.projectStatus}
                  onValueChange={(v) => updateMutation.mutate({ id: orderId, projectStatus: v as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROJECT_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-2">Payment Status</p>
                <Select
                  value={order.paymentStatus}
                  onValueChange={(v) => updateMutation.mutate({ id: orderId, paymentStatus: v as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground" />
                <span>{client?.firstName} {client?.lastName}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span>{formatDate(order.saleDate)}</span>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-muted-foreground" />
                <span className="font-semibold text-primary">{formatCurrency(order.totalAmount)}</span>
              </div>
              {order.totalSqft && parseFloat(order.totalSqft) > 0 && (
                <p className="text-xs text-muted-foreground">{parseFloat(order.totalSqft).toFixed(2)} sq ft</p>
              )}
              {quote && (
                <div className="pt-2 border-t border-border">
                  <Link href={`/quotes/${quote.id}`}>
                    <Button variant="outline" size="sm" className="w-full">
                      <FileText className="w-4 h-4 mr-2" /> View Original Quote
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
