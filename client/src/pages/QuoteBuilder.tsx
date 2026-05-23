import { useState, useRef, useEffect, useCallback } from "react";
import { useParams, useLocation, useSearch } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2, RotateCcw, Square, Minus } from "lucide-react";
import { Link } from "wouter";
import { formatCurrency } from "@/components/StatusBadge";

// ─── Canvas Types ─────────────────────────────────────────────────────────────
type Point = { x: number; y: number };
type ShapeType = "rectangle" | "l-shape" | "u-shape" | "polygon";
type Cutout = { x: number; y: number; w: number; h: number; label: string };

interface CanvasShape {
  id: string;
  type: ShapeType;
  points: Point[];
  label: string;
  cutouts: Cutout[];
}

interface CanvasState {
  shapes: CanvasShape[];
  gridSize: number;
  scale: number; // pixels per inch
}

// ─── Pricing Types ────────────────────────────────────────────────────────────
interface LineItem {
  id: string;
  areaLabel: string;
  priceListItemId?: number;
  category: "material" | "edge" | "splash" | "accessory" | "fixture";
  description: string;
  quantity: number;
  unit: "sqft" | "linft" | "each";
  pricePerUnit: number;
  lineTotal: number;
}

const PIXELS_PER_INCH = 4; // 4px = 1 inch on canvas
const INCHES_PER_FOOT = 12;

function calcSqft(points: Point[]): number {
  // Shoelace formula
  let area = 0;
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += points[i].x * points[j].y;
    area -= points[j].x * points[i].y;
  }
  const areaInSqInches = Math.abs(area) / 2;
  const areaInSqFeet = areaInSqInches / (PIXELS_PER_INCH * PIXELS_PER_INCH * INCHES_PER_FOOT * INCHES_PER_FOOT);
  return Math.round(areaInSqFeet * 100) / 100;
}

function calcPerimeter(points: Point[]): number {
  let perimeter = 0;
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const dx = points[j].x - points[i].x;
    const dy = points[j].y - points[i].y;
    perimeter += Math.sqrt(dx * dx + dy * dy);
  }
  const perimeterInFeet = perimeter / (PIXELS_PER_INCH * INCHES_PER_FOOT);
  return Math.round(perimeterInFeet * 100) / 100;
}

function snapToGrid(val: number, gridSize: number): number {
  return Math.round(val / gridSize) * gridSize;
}

// ─── Canvas Component ─────────────────────────────────────────────────────────
function CountertopCanvas({
  canvasState,
  onUpdate,
}: {
  canvasState: CanvasState;
  onUpdate: (state: CanvasState) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const [selectedShape, setSelectedShape] = useState<string | null>(null);
  const [tool, setTool] = useState<"select" | "rectangle" | "polygon">("rectangle");

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw grid
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 0.5;
    const gs = canvasState.gridSize;
    for (let x = 0; x <= canvas.width; x += gs) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for (let y = 0; y <= canvas.height; y += gs) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }

    // Draw shapes
    canvasState.shapes.forEach((shape) => {
      if (shape.points.length < 2) return;
      const isSelected = shape.id === selectedShape;
      ctx.beginPath();
      ctx.moveTo(shape.points[0].x, shape.points[0].y);
      shape.points.forEach((p) => ctx.lineTo(p.x, p.y));
      ctx.closePath();
      ctx.fillStyle = isSelected ? "rgba(99,102,241,0.12)" : "rgba(148,163,184,0.15)";
      ctx.fill();
      ctx.strokeStyle = isSelected ? "#6366f1" : "#94a3b8";
      ctx.lineWidth = isSelected ? 2 : 1.5;
      ctx.stroke();

      // Label
      const cx = shape.points.reduce((s, p) => s + p.x, 0) / shape.points.length;
      const cy = shape.points.reduce((s, p) => s + p.y, 0) / shape.points.length;
      const sqft = calcSqft(shape.points);
      ctx.fillStyle = "#334155";
      ctx.font = "bold 11px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(shape.label, cx, cy - 6);
      ctx.font = "10px Inter, sans-serif";
      ctx.fillStyle = "#64748b";
      ctx.fillText(`${sqft} sq ft`, cx, cy + 8);

      // Cutouts
      shape.cutouts.forEach((cut) => {
        ctx.fillStyle = "rgba(239,68,68,0.15)";
        ctx.fillRect(cut.x, cut.y, cut.w, cut.h);
        ctx.strokeStyle = "#ef4444";
        ctx.lineWidth = 1;
        ctx.strokeRect(cut.x, cut.y, cut.w, cut.h);
        ctx.fillStyle = "#ef4444";
        ctx.font = "9px Inter, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(cut.label, cut.x + cut.w / 2, cut.y + cut.h / 2 + 3);
      });
    });

    // Draw current polygon in progress
    if (currentPoints.length > 0) {
      ctx.beginPath();
      ctx.moveTo(currentPoints[0].x, currentPoints[0].y);
      currentPoints.forEach((p) => ctx.lineTo(p.x, p.y));
      ctx.strokeStyle = "#6366f1";
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 3]);
      ctx.stroke();
      ctx.setLineDash([]);
      currentPoints.forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = "#6366f1";
        ctx.fill();
      });
    }
  }, [canvasState, currentPoints, selectedShape]);

  useEffect(() => { drawCanvas(); }, [drawCanvas]);

  const getCanvasPoint = (e: React.MouseEvent<HTMLCanvasElement>): Point => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = snapToGrid(e.clientX - rect.left, canvasState.gridSize);
    const y = snapToGrid(e.clientY - rect.top, canvasState.gridSize);
    return { x, y };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pt = getCanvasPoint(e);

    if (tool === "rectangle") {
      setDrawing(true);
      setCurrentPoints([pt]);
    } else if (tool === "polygon") {
      setCurrentPoints((prev) => [...prev, pt]);
    } else if (tool === "select") {
      // Find clicked shape
      const clicked = canvasState.shapes.find((shape) => {
        if (shape.points.length < 3) return false;
        const canvas = canvasRef.current!;
        const ctx = canvas.getContext("2d")!;
        ctx.beginPath();
        ctx.moveTo(shape.points[0].x, shape.points[0].y);
        shape.points.forEach((p) => ctx.lineTo(p.x, p.y));
        ctx.closePath();
        return ctx.isPointInPath(pt.x, pt.y);
      });
      setSelectedShape(clicked?.id ?? null);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drawing || tool !== "rectangle" || currentPoints.length === 0) return;
    const pt = getCanvasPoint(e);
    setCurrentPoints([currentPoints[0], pt]);
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drawing || tool !== "rectangle") return;
    setDrawing(false);
    const pt = getCanvasPoint(e);
    const start = currentPoints[0];
    if (Math.abs(pt.x - start.x) < 8 || Math.abs(pt.y - start.y) < 8) {
      setCurrentPoints([]);
      return;
    }
    const rect: Point[] = [
      { x: start.x, y: start.y },
      { x: pt.x, y: start.y },
      { x: pt.x, y: pt.y },
      { x: start.x, y: pt.y },
    ];
    const newShape: CanvasShape = {
      id: `shape-${Date.now()}`,
      type: "rectangle",
      points: rect,
      label: `Area ${canvasState.shapes.length + 1}`,
      cutouts: [],
    };
    onUpdate({ ...canvasState, shapes: [...canvasState.shapes, newShape] });
    setCurrentPoints([]);
  };

  const finishPolygon = () => {
    if (currentPoints.length < 3) return;
    const newShape: CanvasShape = {
      id: `shape-${Date.now()}`,
      type: "polygon",
      points: currentPoints,
      label: `Area ${canvasState.shapes.length + 1}`,
      cutouts: [],
    };
    onUpdate({ ...canvasState, shapes: [...canvasState.shapes, newShape] });
    setCurrentPoints([]);
  };

  const deleteSelected = () => {
    if (!selectedShape) return;
    onUpdate({ ...canvasState, shapes: canvasState.shapes.filter((s) => s.id !== selectedShape) });
    setSelectedShape(null);
  };

  const addPreset = (type: "l-shape" | "u-shape") => {
    const gs = canvasState.gridSize;
    const ox = 20, oy = 20;
    let points: Point[];
    if (type === "l-shape") {
      points = [
        { x: ox, y: oy }, { x: ox + gs * 10, y: oy }, { x: ox + gs * 10, y: oy + gs * 4 },
        { x: ox + gs * 4, y: oy + gs * 4 }, { x: ox + gs * 4, y: oy + gs * 8 }, { x: ox, y: oy + gs * 8 },
      ];
    } else {
      points = [
        { x: ox, y: oy }, { x: ox + gs * 3, y: oy }, { x: ox + gs * 3, y: oy + gs * 8 },
        { x: ox + gs * 7, y: oy + gs * 8 }, { x: ox + gs * 7, y: oy }, { x: ox + gs * 10, y: oy },
        { x: ox + gs * 10, y: oy + gs * 12 }, { x: ox, y: oy + gs * 12 },
      ];
    }
    const newShape: CanvasShape = {
      id: `shape-${Date.now()}`,
      type,
      points,
      label: `Area ${canvasState.shapes.length + 1}`,
      cutouts: [],
    };
    onUpdate({ ...canvasState, shapes: [...canvasState.shapes, newShape] });
  };

  const totalSqft = canvasState.shapes.reduce((sum, s) => sum + calcSqft(s.points), 0);
  const totalLinft = canvasState.shapes.reduce((sum, s) => sum + calcPerimeter(s.points), 0);

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          {(["select", "rectangle", "polygon"] as const).map((t) => (
            <button
              key={t}
              onClick={() => { setTool(t); setCurrentPoints([]); }}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all capitalize ${
                tool === t ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <Button variant="outline" size="sm" onClick={() => addPreset("l-shape")}>
          <Square className="w-3 h-3 mr-1" /> L-Shape
        </Button>
        <Button variant="outline" size="sm" onClick={() => addPreset("u-shape")}>
          <Square className="w-3 h-3 mr-1" /> U-Shape
        </Button>
        {tool === "polygon" && currentPoints.length >= 3 && (
          <Button size="sm" onClick={finishPolygon}>Finish Polygon</Button>
        )}
        {selectedShape && (
          <Button variant="destructive" size="sm" onClick={deleteSelected}>
            <Trash2 className="w-3 h-3 mr-1" /> Delete Shape
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={() => onUpdate({ ...canvasState, shapes: [] })}>
          <RotateCcw className="w-3 h-3 mr-1" /> Clear
        </Button>
        <div className="ml-auto flex gap-4 text-sm font-medium">
          <span className="text-muted-foreground">Total: <span className="text-foreground">{totalSqft.toFixed(2)} sq ft</span></span>
          <span className="text-muted-foreground">Perimeter: <span className="text-foreground">{totalLinft.toFixed(2)} lin ft</span></span>
        </div>
      </div>

      {/* Canvas */}
      <div className="border border-border rounded-xl overflow-hidden bg-slate-50 canvas-container">
        <canvas
          ref={canvasRef}
          width={700}
          height={400}
          className="w-full cursor-crosshair"
          style={{ maxHeight: 400 }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        {tool === "rectangle" && "Click and drag to draw a rectangular countertop area."}
        {tool === "polygon" && "Click to place vertices. Click 'Finish Polygon' when done."}
        {tool === "select" && "Click a shape to select it, then delete or inspect."}
      </p>
    </div>
  );
}

// ─── Main QuoteBuilder ────────────────────────────────────────────────────────
export default function QuoteBuilder() {
  const { id } = useParams<{ id: string }>();
  const searchStr = useSearch();
  const params = new URLSearchParams(searchStr);
  const preselectedClientId = params.get("clientId") ? parseInt(params.get("clientId")!) : undefined;
  const isEditing = !!id;
  const quoteId = id ? parseInt(id) : undefined;
  const [, navigate] = useLocation();

  const [clientId, setClientId] = useState<number | undefined>(preselectedClientId);
  const [priceListId, setPriceListId] = useState<number | undefined>();
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("No Deposit");
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [canvasState, setCanvasState] = useState<CanvasState>({
    shapes: [],
    gridSize: 20,
    scale: PIXELS_PER_INCH,
  });

  const { data: clients } = trpc.clients.list.useQuery({});
  const { data: priceLists } = trpc.priceLists.list.useQuery();
  const selectedPriceList = priceLists?.find((pl) => pl.id === priceListId);
  const taxRate = selectedPriceList?.taxRate ? parseFloat(selectedPriceList.taxRate) : 0.13;
  const taxLabel = `HST (${(taxRate * 100).toFixed(0)}%)`;
  const { data: priceListItems } = trpc.priceLists.getItems.useQuery(
    { priceListId: priceListId! },
    { enabled: !!priceListId }
  );
  const { data: existingQuote } = trpc.quotes.getById.useQuery(
    { id: quoteId! },
    { enabled: isEditing && !!quoteId }
  );
  const { data: existingLineItems } = trpc.quotes.getLineItems.useQuery(
    { quoteId: quoteId! },
    { enabled: isEditing && !!quoteId }
  );

  // Load existing quote data
  useEffect(() => {
    if (existingQuote) {
      setClientId(existingQuote.quote.clientId);
      setPriceListId(existingQuote.quote.priceListId);
      setTitle(existingQuote.quote.title);
      setNotes(existingQuote.quote.notes ?? "");
      setPaymentTerms(existingQuote.quote.paymentTerms ?? "No Deposit");
      if (existingQuote.quote.canvasData) {
        setCanvasState(existingQuote.quote.canvasData as CanvasState);
      }
    }
  }, [existingQuote]);

  useEffect(() => {
    if (existingLineItems) {
      setLineItems(
        existingLineItems.map((item) => ({
          id: `item-${item.id}`,
          areaLabel: item.areaLabel ?? "Area #1",
          priceListItemId: item.priceListItemId ?? undefined,
          category: item.category,
          description: item.description,
          quantity: parseFloat(item.quantity),
          unit: item.unit,
          pricePerUnit: parseFloat(item.pricePerUnit),
          lineTotal: parseFloat(item.lineTotal),
        }))
      );
    }
  }, [existingLineItems]);

  const createMutation = trpc.quotes.create.useMutation({
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.quotes.update.useMutation({
    onError: (e) => toast.error(e.message),
  });

  const saveLineItemsMutation = trpc.quotes.saveLineItems.useMutation();

  const subtotal = lineItems.reduce((sum, item) => sum + item.lineTotal, 0);
  const taxAmount = subtotal * taxRate;
  const totalAmount = subtotal + taxAmount;
  const totalSqft = lineItems
    .filter((i) => i.unit === "sqft" && i.category === "material")
    .reduce((sum, i) => sum + i.quantity, 0);

  const addLineItem = (itemId: number) => {
    const item = priceListItems?.find((i) => i.id === itemId);
    if (!item) return;
    const newItem: LineItem = {
      id: `li-${Date.now()}`,
      areaLabel: "Area #1",
      priceListItemId: item.id,
      category: item.category,
      description: item.name,
      quantity: 1,
      unit: item.unit,
      pricePerUnit: parseFloat(item.pricePerUnit),
      lineTotal: parseFloat(item.pricePerUnit),
    };
    setLineItems((prev) => [...prev, newItem]);
  };

  const updateLineItem = (id: string, field: keyof LineItem, value: unknown) => {
    setLineItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: value };
        if (field === "quantity" || field === "pricePerUnit") {
          updated.lineTotal = updated.quantity * updated.pricePerUnit;
        }
        return updated;
      })
    );
  };

  const removeLineItem = (id: string) => setLineItems((prev) => prev.filter((i) => i.id !== id));

  const autoPopulateFromCanvas = () => {
    if (!priceListItems || canvasState.shapes.length === 0) {
      toast.error("Draw countertop shapes and select a price list first");
      return;
    }
    const materialItem = priceListItems.find((i) => i.category === "material");
    const edgeItem = priceListItems.find((i) => i.category === "edge");
    const newItems: LineItem[] = [];
    canvasState.shapes.forEach((shape) => {
      const sqft = calcSqft(shape.points);
      const linft = calcPerimeter(shape.points);
      if (materialItem && sqft > 0) {
        newItems.push({
          id: `li-${Date.now()}-${shape.id}-mat`,
          areaLabel: shape.label,
          priceListItemId: materialItem.id,
          category: "material",
          description: materialItem.name,
          quantity: sqft,
          unit: "sqft",
          pricePerUnit: parseFloat(materialItem.pricePerUnit),
          lineTotal: sqft * parseFloat(materialItem.pricePerUnit),
        });
      }
      if (edgeItem && linft > 0) {
        newItems.push({
          id: `li-${Date.now()}-${shape.id}-edge`,
          areaLabel: shape.label,
          priceListItemId: edgeItem.id,
          category: "edge",
          description: edgeItem.name,
          quantity: linft,
          unit: "linft",
          pricePerUnit: parseFloat(edgeItem.pricePerUnit),
          lineTotal: linft * parseFloat(edgeItem.pricePerUnit),
        });
      }
    });
    setLineItems((prev) => [...prev, ...newItems]);
    toast.success(`Added ${newItems.length} line items from canvas`);
  };

  const handleSave = async (status: "Draft" | "Active") => {
    if (!clientId) { toast.error("Please select a client"); return; }
    if (!priceListId) { toast.error("Please select a price list"); return; }
    if (!title.trim()) { toast.error("Please enter a quote title"); return; }

    const quoteData = {
      clientId,
      priceListId,
      title,
      notes,
      paymentTerms,
      canvasData: canvasState,
      subtotal: subtotal.toFixed(2),
      taxAmount: taxAmount.toFixed(2),
      totalAmount: totalAmount.toFixed(2),
      totalSqft: totalSqft.toFixed(2),
    };

    if (isEditing && quoteId) {
      await updateMutation.mutateAsync({ id: quoteId, ...quoteData, status });
      await saveLineItemsMutation.mutateAsync({
        quoteId,
        items: lineItems.map((item, i) => ({
          ...item,
          quantity: item.quantity.toFixed(2),
          pricePerUnit: item.pricePerUnit.toFixed(2),
          lineTotal: item.lineTotal.toFixed(2),
          sortOrder: i,
        })),
      });
      navigate(`/quotes/${quoteId}`);
    } else {
      const quote = await createMutation.mutateAsync({ ...quoteData, status });
      if (quote) {
        await saveLineItemsMutation.mutateAsync({
          quoteId: quote.id,
          items: lineItems.map((item, i) => ({
            ...item,
            quantity: item.quantity.toFixed(2),
            pricePerUnit: item.pricePerUnit.toFixed(2),
            lineTotal: item.lineTotal.toFixed(2),
            sortOrder: i,
          })),
        });
        navigate(`/quotes/${quote.id}`);
      }
    }
    toast.success(`Quote ${status === "Draft" ? "saved as draft" : "activated"}`);
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  const itemsByCategory = (cat: string) => priceListItems?.filter((i) => i.category === cat) ?? [];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/quotes">
          <Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold font-display">{isEditing ? "Edit Quote" : "New Quote"}</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => handleSave("Draft")} disabled={isSaving}>
            Save Draft
          </Button>
          <Button onClick={() => handleSave("Active")} disabled={isSaving}>
            {isSaving ? "Saving..." : "Activate Quote"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left: Quote details + canvas */}
        <div className="xl:col-span-2 space-y-6">
          {/* Quote info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Quote Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Quote Title *</Label>
                <Input
                  className="mt-1"
                  placeholder="e.g. Kitchen Renovation — Caesarstone White Night"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Client *</Label>
                  <Select value={clientId?.toString()} onValueChange={(v) => setClientId(parseInt(v))}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select client..." />
                    </SelectTrigger>
                    <SelectContent>
                      {clients?.map((c) => (
                        <SelectItem key={c.id} value={c.id.toString()}>
                          {c.firstName} {c.lastName} {c.company ? `(${c.company})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Price List *</Label>
                  <Select value={priceListId?.toString()} onValueChange={(v) => setPriceListId(parseInt(v))}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select price list..." />
                    </SelectTrigger>
                    <SelectContent>
                      {priceLists?.map((pl) => (
                        <SelectItem key={pl.id} value={pl.id.toString()}>{pl.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Payment Terms</Label>
                  <Input className="mt-1" value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} />
                </div>
              </div>
              <div>
                <Label>Client Notes</Label>
                <textarea
                  rows={2}
                  className="mt-1 w-full border border-input rounded-md px-3 py-2 text-sm bg-background resize-none"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Notes visible to client on proposal..."
                />
              </div>
            </CardContent>
          </Card>

          {/* Canvas */}
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base">Countertop Drawing</CardTitle>
              <Button variant="outline" size="sm" onClick={autoPopulateFromCanvas} disabled={!priceListId}>
                <Plus className="w-3 h-3 mr-1" /> Auto-populate from Canvas
              </Button>
            </CardHeader>
            <CardContent>
              <CountertopCanvas canvasState={canvasState} onUpdate={setCanvasState} />
            </CardContent>
          </Card>

          {/* Line items */}
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base">Line Items</CardTitle>
              {priceListId && (
                <div className="flex gap-2 flex-wrap">
                  {["material", "edge", "splash", "accessory", "fixture"].map((cat) => (
                    itemsByCategory(cat).length > 0 && (
                      <Select key={cat} onValueChange={(v) => addLineItem(parseInt(v))}>
                        <SelectTrigger className="h-8 text-xs w-36">
                          <SelectValue placeholder={`+ ${cat}`} />
                        </SelectTrigger>
                        <SelectContent>
                          {itemsByCategory(cat).map((item) => (
                            <SelectItem key={item.id} value={item.id.toString()}>
                              {item.name} — {formatCurrency(item.pricePerUnit)}/{item.unit}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )
                  ))}
                </div>
              )}
            </CardHeader>
            <CardContent>
              {lineItems.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No line items yet. Draw shapes and use "Auto-populate from Canvas" or add items manually above.
                </p>
              ) : (
                <div className="space-y-1">
                  <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground px-2 pb-1">
                    <div className="col-span-4">Description</div>
                    <div className="col-span-2">Area</div>
                    <div className="col-span-1 text-right">Qty</div>
                    <div className="col-span-1 text-center">Unit</div>
                    <div className="col-span-2 text-right">Price/Unit</div>
                    <div className="col-span-1 text-right">Total</div>
                    <div className="col-span-1"></div>
                  </div>
                  {lineItems.map((item) => (
                    <div key={item.id} className="grid grid-cols-12 gap-2 items-center bg-muted/30 rounded-lg px-2 py-1.5">
                      <div className="col-span-4">
                        <Input
                          className="h-7 text-xs"
                          value={item.description}
                          onChange={(e) => updateLineItem(item.id, "description", e.target.value)}
                        />
                      </div>
                      <div className="col-span-2">
                        <Input
                          className="h-7 text-xs"
                          value={item.areaLabel}
                          onChange={(e) => updateLineItem(item.id, "areaLabel", e.target.value)}
                        />
                      </div>
                      <div className="col-span-1">
                        <Input
                          className="h-7 text-xs text-right"
                          type="number"
                          step="0.01"
                          value={item.quantity}
                          onChange={(e) => updateLineItem(item.id, "quantity", parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div className="col-span-1 text-center text-xs text-muted-foreground">{item.unit}</div>
                      <div className="col-span-2">
                        <Input
                          className="h-7 text-xs text-right"
                          type="number"
                          step="0.01"
                          value={item.pricePerUnit}
                          onChange={(e) => updateLineItem(item.id, "pricePerUnit", parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div className="col-span-1 text-right text-xs font-medium">{formatCurrency(item.lineTotal)}</div>
                      <div className="col-span-1 flex justify-end">
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeLineItem(item.id)}>
                          <Minus className="w-3 h-3 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Pricing summary */}
        <div className="space-y-4">
          <Card className="sticky top-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Pricing Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2 text-sm">
                {["material", "edge", "splash", "accessory", "fixture"].map((cat) => {
                  const catItems = lineItems.filter((i) => i.category === cat);
                  if (catItems.length === 0) return null;
                  const catTotal = catItems.reduce((s, i) => s + i.lineTotal, 0);
                  return (
                    <div key={cat} className="flex justify-between">
                      <span className="text-muted-foreground capitalize">{cat}</span>
                      <span className="font-medium">{formatCurrency(catTotal)}</span>
                    </div>
                  );
                })}
              </div>

              <Separator />

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{taxLabel}</span>
                  <span className="font-medium">{formatCurrency(taxAmount)}</span>
                </div>
              </div>

              <Separator />

              <div className="flex justify-between text-base font-bold">
                <span>Total</span>
                <span className="text-primary">{formatCurrency(totalAmount)}</span>
              </div>

              {totalSqft > 0 && (
                <div className="text-xs text-muted-foreground text-center pt-1">
                  {totalSqft.toFixed(2)} sq ft · {formatCurrency(subtotal / totalSqft)}/sq ft avg
                </div>
              )}

              <Separator />

              <div className="space-y-2">
                <Button className="w-full" onClick={() => handleSave("Active")} disabled={isSaving}>
                  {isSaving ? "Saving..." : "Save & Activate"}
                </Button>
                <Button variant="outline" className="w-full" onClick={() => handleSave("Draft")} disabled={isSaving}>
                  Save as Draft
                </Button>
              </div>

              <div className="text-xs text-muted-foreground space-y-1 pt-1">
                <p>• Tax uses the selected price list rate</p>
                <p>• Prices in CAD</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
