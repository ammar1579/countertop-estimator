import { useRef, useState } from "react";
import { useParams, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { formatCurrency, formatDate, StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  ArrowLeft, Edit2, FileText, Mail, ShoppingCart, History,
  CheckCircle, Send, Eye, Printer
} from "lucide-react";

function getTaxLabel(priceList?: { taxRate?: string | null } | null) {
  const rate = priceList?.taxRate ? parseFloat(priceList.taxRate) : 0.13;
  return `HST (${(rate * 100).toFixed(0)}%)`;
}

export default function QuoteDetail() {
  const { id } = useParams<{ id: string }>();
  const quoteId = parseInt(id);
  const utils = trpc.useUtils();
  const [showConvert, setShowConvert] = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const [emailTo, setEmailTo] = useState("");
  const [showSignature, setShowSignature] = useState(false);
  const sigCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isSigning, setIsSigning] = useState(false);
  const [lastPos, setLastPos] = useState<{ x: number; y: number } | null>(null);

  const { data: quoteData, isLoading } = trpc.quotes.getById.useQuery({ id: quoteId });
  const { data: lineItems } = trpc.quotes.getLineItems.useQuery({ quoteId });
  const { data: revisions } = trpc.quotes.getRevisions.useQuery({ quoteId });
  const { data: emailLogs } = trpc.quotes.getEmailLogs.useQuery({ quoteId });

  const convertMutation = trpc.quotes.convertToOrder.useMutation({
    onSuccess: (order) => {
      toast.success("Quote converted to order!");
      setShowConvert(false);
      utils.quotes.getById.invalidate({ id: quoteId });
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.quotes.update.useMutation({
    onSuccess: () => {
      utils.quotes.getById.invalidate({ id: quoteId });
      toast.success("Quote updated");
    },
  });

  const logEmailMutation = trpc.quotes.logEmail.useMutation({
    onSuccess: () => {
      utils.quotes.getEmailLogs.invalidate({ quoteId });
      setShowEmail(false);
      setEmailTo("");
      toast.success("Email logged");
    },
  });

  const handlePrint = () => window.print();

  const startSig = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsSigning(true);
    const rect = sigCanvasRef.current!.getBoundingClientRect();
    setLastPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const drawSig = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isSigning || !lastPos || !sigCanvasRef.current) return;
    const ctx = sigCanvasRef.current.getContext("2d")!;
    const rect = sigCanvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    ctx.beginPath();
    ctx.moveTo(lastPos.x, lastPos.y);
    ctx.lineTo(x, y);
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.stroke();
    setLastPos({ x, y });
  };

  const saveSignature = () => {
    const dataUrl = sigCanvasRef.current?.toDataURL();
    if (!dataUrl) return;
    updateMutation.mutate({ id: quoteId, signatureData: dataUrl, signedAt: new Date(), status: "Active" });
    setShowSignature(false);
    toast.success("Signature captured");
  };

  const clearSig = () => {
    const ctx = sigCanvasRef.current?.getContext("2d");
    if (ctx && sigCanvasRef.current) ctx.clearRect(0, 0, sigCanvasRef.current.width, sigCanvasRef.current.height);
  };

  if (isLoading) {
    return (
      <div className="p-6 max-w-5xl mx-auto space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (!quoteData) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Quote not found.</p>
        <Link href="/quotes"><Button variant="outline" className="mt-4">Back to Quotes</Button></Link>
      </div>
    );
  }

  const { quote, client, priceList } = quoteData;
  const taxLabel = getTaxLabel(priceList);

  const groupedItems = lineItems?.reduce((acc, item) => {
    const key = item.areaLabel ?? "Area #1";
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {} as Record<string, typeof lineItems>) ?? {};

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 print:p-0">
      {/* Header */}
      <div className="flex items-center gap-4 print:hidden">
        <Link href="/quotes">
          <Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold font-display">{quote.title}</h1>
            <StatusBadge status={quote.status} />
          </div>
          <p className="text-muted-foreground text-sm mt-0.5">
            {quote.quoteNumber} · Rev {quote.revision} · {client?.firstName} {client?.lastName}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-2" /> Print / PDF
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowEmail(true)}>
            <Send className="w-4 h-4 mr-2" /> Log Email
          </Button>
          {!quote.signedAt && (
            <Button variant="outline" size="sm" onClick={() => setShowSignature(true)}>
              <CheckCircle className="w-4 h-4 mr-2" /> Capture Signature
            </Button>
          )}
          <Link href={`/quotes/${quoteId}/edit`}>
            <Button variant="outline" size="sm">
              <Edit2 className="w-4 h-4 mr-2" /> Edit
            </Button>
          </Link>
          <Button size="sm" onClick={() => setShowConvert(true)}>
            <ShoppingCart className="w-4 h-4 mr-2" /> Convert to Order
          </Button>
        </div>
      </div>

      {/* Print header */}
      <div className="hidden print:block mb-6">
        <div className="flex items-center justify-between border-b pb-4 mb-4">
          <div>
            <h1 className="text-3xl font-bold font-display text-slate-900">Quick Quartz</h1>
            <p className="text-slate-500">Countertops · Greater Toronto Area</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold">PROPOSAL</p>
            <p className="text-slate-500">{quote.quoteNumber}</p>
            <p className="text-slate-500">{formatDate(quote.createdAt)}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="proposal" className="print:hidden">
            <TabsList>
              <TabsTrigger value="proposal"><FileText className="w-4 h-4 mr-2" />Proposal</TabsTrigger>
              <TabsTrigger value="history"><History className="w-4 h-4 mr-2" />History ({revisions?.length ?? 0})</TabsTrigger>
              <TabsTrigger value="emails"><Mail className="w-4 h-4 mr-2" />Emails ({emailLogs?.length ?? 0})</TabsTrigger>
            </TabsList>

            <TabsContent value="proposal" className="mt-4">
              <ProposalContent quote={quote} client={client} priceList={priceList} groupedItems={groupedItems} lineItems={lineItems ?? []} />
            </TabsContent>

            <TabsContent value="history" className="mt-4">
              <Card>
                <CardContent className="p-4">
                  {!revisions || revisions.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">No revision history yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {revisions.map((rev) => (
                        <div key={rev.id} className="flex gap-3 items-start">
                          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-xs font-bold text-primary">
                            {rev.revision}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{rev.changeNote ?? "Quote updated"}</p>
                            <p className="text-xs text-muted-foreground">{formatDate(rev.createdAt)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="emails" className="mt-4">
              <Card>
                <CardContent className="p-4">
                  {!emailLogs || emailLogs.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">No emails logged yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {emailLogs.map((log) => (
                        <div key={log.id} className="flex gap-3 items-start border-b border-border pb-3 last:border-0">
                          <Mail className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                          <div className="flex-1">
                            <p className="text-sm font-medium">{log.sentTo}</p>
                            <p className="text-xs text-muted-foreground">{log.subject} · Sent {formatDate(log.sentAt)}</p>
                          </div>
                          {log.viewCount != null && log.viewCount > 0 && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Eye className="w-3 h-3" />{log.viewCount} view{log.viewCount !== 1 ? "s" : ""}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Print-only proposal */}
          <div className="hidden print:block">
            <ProposalContent quote={quote} client={client} priceList={priceList} groupedItems={groupedItems} lineItems={lineItems ?? []} />
          </div>
        </div>

        {/* Sidebar summary */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Quote Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Client</span>
                  <span className="font-medium">{client?.firstName} {client?.lastName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Price List</span>
                  <span className="font-medium">{priceList?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Revision</span>
                  <span className="font-medium">{quote.revision}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Payment Terms</span>
                  <span className="font-medium">{quote.paymentTerms}</span>
                </div>
                {quote.expiresAt && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Expires</span>
                    <span className="font-medium">{formatDate(quote.expiresAt)}</span>
                  </div>
                )}
              </div>
              <Separator />
              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrency(quote.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{taxLabel}</span>
                  <span>{formatCurrency(quote.taxAmount)}</span>
                </div>
                <div className="flex justify-between font-bold text-base pt-1">
                  <span>Total</span>
                  <span className="text-primary">{formatCurrency(quote.totalAmount)}</span>
                </div>
              </div>
              {quote.totalSqft && parseFloat(quote.totalSqft) > 0 && (
                <p className="text-xs text-muted-foreground text-center">{parseFloat(quote.totalSqft).toFixed(2)} sq ft total</p>
              )}
              {quote.signedAt && (
                <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 rounded-lg p-2">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  <span className="text-xs font-medium">Signed {formatDate(quote.signedAt)}</span>
                </div>
              )}
              {quote.viewCount != null && quote.viewCount > 0 && (
                <div className="flex items-center gap-2 text-muted-foreground text-xs">
                  <Eye className="w-3 h-3" />
                  Viewed {quote.viewCount} time{quote.viewCount !== 1 ? "s" : ""}
                  {quote.lastViewedAt && ` · Last ${formatDate(quote.lastViewedAt)}`}
                </div>
              )}
            </CardContent>
          </Card>

          {quote.signatureData && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Client Signature</CardTitle>
              </CardHeader>
              <CardContent>
                <img src={quote.signatureData} alt="Signature" className="w-full border border-border rounded-lg bg-white" />
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Convert to order dialog */}
      <Dialog open={showConvert} onOpenChange={setShowConvert}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convert to Order</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will create a new order from <strong>{quote.title}</strong> ({formatCurrency(quote.totalAmount)}) and mark the quote as Active.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConvert(false)}>Cancel</Button>
            <Button onClick={() => convertMutation.mutate({ quoteId })} disabled={convertMutation.isPending}>
              <ShoppingCart className="w-4 h-4 mr-2" />
              {convertMutation.isPending ? "Converting..." : "Convert to Order"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Log email dialog */}
      <Dialog open={showEmail} onOpenChange={setShowEmail}>
        <DialogContent>
          <DialogHeader><DialogTitle>Log Email Sent</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Sent To</Label>
              <Input className="mt-1" type="email" value={emailTo} onChange={(e) => setEmailTo(e.target.value)}
                placeholder={client?.email ?? "client@email.com"} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEmail(false)}>Cancel</Button>
            <Button onClick={() => logEmailMutation.mutate({
              quoteId, sentTo: emailTo || client?.email || "", revision: quote.revision,
              subject: `Quote ${quote.quoteNumber} — ${quote.title}`,
            })} disabled={logEmailMutation.isPending || !emailTo}>
              Log Email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Signature dialog */}
      <Dialog open={showSignature} onOpenChange={setShowSignature}>
        <DialogContent>
          <DialogHeader><DialogTitle>Capture Client Signature</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Have the client sign below to approve this proposal.</p>
          <div className="border-2 border-dashed border-border rounded-xl overflow-hidden">
            <canvas
              ref={sigCanvasRef}
              width={460}
              height={160}
              className="w-full cursor-crosshair bg-white"
              onMouseDown={startSig}
              onMouseMove={drawSig}
              onMouseUp={() => setIsSigning(false)}
              onMouseLeave={() => setIsSigning(false)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={clearSig}>Clear</Button>
            <Button variant="outline" onClick={() => setShowSignature(false)}>Cancel</Button>
            <Button onClick={saveSignature}><CheckCircle className="w-4 h-4 mr-2" />Save Signature</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ProposalContent({ quote, client, priceList, groupedItems, lineItems }: any) {
  const taxLabel = getTaxLabel(priceList);
  return (
    <div className="space-y-4">
      {/* Client info */}
      <Card>
        <CardContent className="p-4 grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">Prepared For</p>
            <p className="font-semibold">{client?.firstName} {client?.lastName}</p>
            {client?.company && <p className="text-muted-foreground">{client.company}</p>}
            {client?.email && <p className="text-muted-foreground">{client.email}</p>}
            {client?.phone && <p className="text-muted-foreground">{client.phone}</p>}
            {client?.city && <p className="text-muted-foreground">{client.city}, {client.province}</p>}
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">Quote Details</p>
            <p><span className="text-muted-foreground">Number:</span> {quote.quoteNumber}</p>
            <p><span className="text-muted-foreground">Price List:</span> {priceList?.name}</p>
            <p><span className="text-muted-foreground">Payment:</span> {quote.paymentTerms}</p>
            {quote.expiresAt && <p><span className="text-muted-foreground">Valid Until:</span> {formatDate(quote.expiresAt)}</p>}
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
              <span>{formatCurrency(quote.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{taxLabel}</span>
              <span>{formatCurrency(quote.taxAmount)}</span>
            </div>
            <Separator />
            <div className="flex justify-between font-bold text-base">
              <span>Total</span>
              <span className="text-primary">{formatCurrency(quote.totalAmount)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {quote.notes && (
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-2">Notes</p>
            <p className="text-sm whitespace-pre-wrap">{quote.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
