import { useState } from "react";
import { useParams, useLocation, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { formatCurrency, formatDate, StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { ArrowLeft, Edit2, Mail, Phone, MapPin, Building2, FileText, ShoppingCart, Plus } from "lucide-react";
import { useForm } from "react-hook-form";

const LEAD_SOURCES = ["Website", "Phone", "Referral", "Walk-in", "Other"] as const;

export default function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const clientId = parseInt(id);
  const [, navigate] = useLocation();
  const [editing, setEditing] = useState(false);
  const utils = trpc.useUtils();

  const { data: client, isLoading } = trpc.clients.getById.useQuery({ id: clientId });
  const { data: quotes } = trpc.clients.getQuotes.useQuery({ clientId });
  const { data: orders } = trpc.clients.getOrders.useQuery({ clientId });

  const updateMutation = trpc.clients.update.useMutation({
    onSuccess: () => {
      utils.clients.getById.invalidate({ id: clientId });
      setEditing(false);
      toast.success("Client updated");
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.clients.delete.useMutation({
    onSuccess: () => {
      navigate("/clients");
      toast.success("Client deleted");
    },
  });

  const { register, handleSubmit } = useForm<{
    firstName?: string; lastName?: string; email?: string; phone?: string;
    address?: string; city?: string; province?: string; postalCode?: string;
    company?: string; leadSource?: string; notes?: string;
  }>({ values: client ? {
    firstName: client.firstName ?? undefined,
    lastName: client.lastName ?? undefined,
    email: client.email ?? undefined,
    phone: client.phone ?? undefined,
    address: client.address ?? undefined,
    city: client.city ?? undefined,
    province: client.province ?? undefined,
    postalCode: client.postalCode ?? undefined,
    company: client.company ?? undefined,
    leadSource: client.leadSource ?? undefined,
    notes: client.notes ?? undefined,
  } : undefined });

  if (isLoading) {
    return (
      <div className="p-6 max-w-5xl mx-auto space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Client not found.</p>
        <Link href="/clients"><Button variant="outline" className="mt-4">Back to Clients</Button></Link>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/clients">
          <Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold font-display">{client.firstName} {client.lastName}</h1>
          {client.company && <p className="text-muted-foreground text-sm">{client.company}</p>}
        </div>
        <div className="flex gap-2">
          <Link href={`/quotes/new?clientId=${clientId}`}>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" /> New Quote
            </Button>
          </Link>
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            <Edit2 className="w-4 h-4 mr-2" /> Edit
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Contact info */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {client.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                <a href={`mailto:${client.email}`} className="text-primary hover:underline truncate">{client.email}</a>
              </div>
            )}
            {client.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
                <a href={`tel:${client.phone}`} className="hover:underline">{client.phone}</a>
              </div>
            )}
            {client.company && (
              <div className="flex items-center gap-2 text-sm">
                <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
                <span>{client.company}</span>
              </div>
            )}
            {(client.address || client.city) && (
              <div className="flex items-start gap-2 text-sm">
                <MapPin className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  {client.address && <p>{client.address}</p>}
                  {client.city && <p>{client.city}, {client.province} {client.postalCode}</p>}
                </div>
              </div>
            )}
            {client.leadSource && (
              <div className="pt-2 border-t border-border">
                <p className="text-xs text-muted-foreground mb-1">Lead Source</p>
                <span className="text-xs px-2 py-1 rounded-full bg-secondary border border-border font-medium">
                  {client.leadSource}
                </span>
              </div>
            )}
            {client.notes && (
              <div className="pt-2 border-t border-border">
                <p className="text-xs text-muted-foreground mb-1">Notes</p>
                <p className="text-sm text-foreground/80 whitespace-pre-wrap">{client.notes}</p>
              </div>
            )}
            <div className="pt-2 border-t border-border text-xs text-muted-foreground">
              <p>Added {formatDate(client.createdAt)}</p>
            </div>
          </CardContent>
        </Card>

        {/* Project history */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="quotes">
            <TabsList className="mb-4">
              <TabsTrigger value="quotes">
                <FileText className="w-4 h-4 mr-2" />
                Quotes ({quotes?.length ?? 0})
              </TabsTrigger>
              <TabsTrigger value="orders">
                <ShoppingCart className="w-4 h-4 mr-2" />
                Orders ({orders?.length ?? 0})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="quotes">
              {!quotes || quotes.length === 0 ? (
                <Card>
                  <CardContent className="py-10 text-center">
                    <FileText className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No quotes yet</p>
                    <Link href={`/quotes/new?clientId=${clientId}`}>
                      <Button size="sm" className="mt-3"><Plus className="w-4 h-4 mr-2" />Create Quote</Button>
                    </Link>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  {quotes.map((row) => (
                    <Link key={row.quote.id} href={`/quotes/${row.quote.id}`}>
                      <Card className="hover:shadow-sm transition-shadow cursor-pointer hover:border-primary/30">
                        <CardContent className="p-4 flex items-center justify-between">
                          <div>
                            <p className="font-medium text-sm">{row.quote.title}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {row.quote.quoteNumber} · Rev {row.quote.revision} · {row.priceList?.name}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-sm">{formatCurrency(row.quote.totalAmount)}</p>
                            <StatusBadge status={row.quote.status} className="mt-1" />
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="orders">
              {!orders || orders.length === 0 ? (
                <Card>
                  <CardContent className="py-10 text-center">
                    <ShoppingCart className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No orders yet</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  {orders.map((row) => (
                    <Link key={row.order.id} href={`/orders/${row.order.id}`}>
                      <Card className="hover:shadow-sm transition-shadow cursor-pointer hover:border-primary/30">
                        <CardContent className="p-4 flex items-center justify-between">
                          <div>
                            <p className="font-medium text-sm">{row.order.title}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {row.order.orderNumber} · {formatDate(row.order.saleDate)}
                            </p>
                          </div>
                          <div className="text-right space-y-1">
                            <p className="font-semibold text-sm">{formatCurrency(row.order.totalAmount)}</p>
                            <div className="flex gap-1 justify-end">
                              <StatusBadge status={row.order.projectStatus} />
                              <StatusBadge status={row.order.paymentStatus} />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Edit dialog */}
      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Client</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit((data) => updateMutation.mutate({ id: clientId, ...data, leadSource: data.leadSource as any }))} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>First Name</Label><Input {...register("firstName")} className="mt-1" /></div>
              <div><Label>Last Name</Label><Input {...register("lastName")} className="mt-1" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Email</Label><Input type="email" {...register("email")} className="mt-1" /></div>
              <div><Label>Phone</Label><Input {...register("phone")} className="mt-1" /></div>
            </div>
            <div><Label>Company</Label><Input {...register("company")} className="mt-1" /></div>
            <div><Label>Address</Label><Input {...register("address")} className="mt-1" /></div>
            <div className="grid grid-cols-3 gap-4">
              <div><Label>City</Label><Input {...register("city")} className="mt-1" /></div>
              <div><Label>Province</Label><Input {...register("province")} className="mt-1" /></div>
              <div><Label>Postal Code</Label><Input {...register("postalCode")} className="mt-1" /></div>
            </div>
            <div>
              <Label>Lead Source</Label>
              <select {...register("leadSource")} className="mt-1 w-full border border-input rounded-md px-3 py-2 text-sm bg-background">
                {LEAD_SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <Label>Notes</Label>
              <textarea {...register("notes")} rows={3} className="mt-1 w-full border border-input rounded-md px-3 py-2 text-sm bg-background resize-none" />
            </div>
            <DialogFooter className="flex justify-between">
              <Button type="button" variant="destructive" size="sm"
                onClick={() => { if (confirm("Delete this client?")) deleteMutation.mutate({ id: clientId }); }}>
                Delete Client
              </Button>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
                <Button type="submit" disabled={updateMutation.isPending}>Save Changes</Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
