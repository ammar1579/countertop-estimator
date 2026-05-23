import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { formatCurrency } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Plus, AlertTriangle, Package, Edit2, Search } from "lucide-react";
import { useForm } from "react-hook-form";

type SlabForm = {
  colorName: string;
  brand: string;
  thickness: string;
  finish: string;
  slabWidth: string;
  slabHeight: string;
  quantity: string;
  lowStockThreshold: string;
  costPerSqft: string;
  location: string;
  notes: string;
};

export default function Inventory() {
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const utils = trpc.useUtils();

  const { data: inventory, isLoading } = trpc.inventory.list.useQuery(
    { search: search || undefined }
  );

  const createMutation = trpc.inventory.create.useMutation({
    onSuccess: () => { utils.inventory.list.invalidate(); setShowCreate(false); reset(); toast.success("Slab added"); },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.inventory.update.useMutation({
    onSuccess: () => { utils.inventory.list.invalidate(); setEditItem(null); toast.success("Inventory updated"); },
    onError: (e) => toast.error(e.message),
  });

  const { register, handleSubmit, reset, setValue } = useForm<SlabForm>({
    defaultValues: { thickness: "3cm", finish: "Polished", quantity: "0", lowStockThreshold: "2" },
  });

  const lowStockItems = inventory?.filter((i) => (i.quantity ?? 0) <= (i.lowStockThreshold ?? 2)) ?? [];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display">Inventory</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Quartz slab stock management</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4 mr-2" /> Add Slab
        </Button>
      </div>

      {/* Low stock alert */}
      {lowStockItems.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-amber-800">Low Stock Alert</p>
              <p className="text-sm text-amber-700 mt-0.5">
                {lowStockItems.length} item{lowStockItems.length !== 1 ? "s are" : " is"} at or below threshold:{" "}
                {lowStockItems.map((i) => i.colorName).join(", ")}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by color, brand..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Inventory grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
        </div>
      ) : !inventory || inventory.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Package className="w-12 h-12 text-muted-foreground/30 mb-3" />
            <p className="font-medium text-muted-foreground">No inventory items</p>
            <p className="text-sm text-muted-foreground/70 mt-1">Add your first quartz slab to track stock</p>
            <Button className="mt-4" onClick={() => setShowCreate(true)}>
              <Plus className="w-4 h-4 mr-2" /> Add Slab
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {inventory.map((item) => {
            const isLow = (item.quantity ?? 0) <= (item.lowStockThreshold ?? 2);
            return (
              <Card key={item.id} className={`hover:shadow-md transition-shadow ${isLow ? "border-amber-200" : ""}`}>
                <CardHeader className="pb-2 flex flex-row items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{item.colorName}</CardTitle>
                    {item.brand && <p className="text-sm text-muted-foreground">{item.brand}</p>}
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditItem(item)}>
                    <Edit2 className="w-4 h-4" />
                  </Button>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Thickness</p>
                      <p className="font-medium">{item.thickness}</p>
                    </div>
                    {item.finish && (
                      <div>
                        <p className="text-xs text-muted-foreground">Finish</p>
                        <p className="font-medium">{item.finish}</p>
                      </div>
                    )}
                    {item.slabWidth && item.slabHeight && (
                      <div>
                        <p className="text-xs text-muted-foreground">Slab Size</p>
                        <p className="font-medium">{item.slabWidth}" × {item.slabHeight}"</p>
                      </div>
                    )}
                    {item.location && (
                      <div>
                        <p className="text-xs text-muted-foreground">Location</p>
                        <p className="font-medium">{item.location}</p>
                      </div>
                    )}
                  </div>

                  <div className={`flex items-center justify-between p-2 rounded-lg ${
                    isLow ? "bg-amber-50 border border-amber-200" : "bg-muted/50"
                  }`}>
                    <div>
                      <p className="text-xs text-muted-foreground">In Stock</p>
                      <p className={`text-xl font-bold ${isLow ? "text-amber-700" : "text-foreground"}`}>
                        {item.quantity}
                        {isLow && <AlertTriangle className="w-4 h-4 inline ml-1 text-amber-500" />}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Threshold</p>
                      <p className="text-sm font-medium">{item.lowStockThreshold}</p>
                    </div>
                    {item.costPerSqft && (
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Cost/sq ft</p>
                        <p className="text-sm font-medium">{formatCurrency(item.costPerSqft)}</p>
                      </div>
                    )}
                  </div>

                  {item.notes && (
                    <p className="text-xs text-muted-foreground">{item.notes}</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Add Slab to Inventory</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit((data) =>             createMutation.mutate({
            colorName: data.colorName,
            brand: data.brand || undefined,
            thickness: data.thickness || undefined,
            finish: data.finish || undefined,
            quantity: parseInt(data.quantity) || 0,
            lowStockThreshold: parseInt(data.lowStockThreshold) || 2,
            slabWidth: data.slabWidth ? data.slabWidth : undefined,
            slabHeight: data.slabHeight ? data.slabHeight : undefined,
            costPerSqft: data.costPerSqft || undefined,
            location: data.location || undefined,
            notes: data.notes || undefined,
          }))} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Color Name *</Label><Input {...register("colorName", { required: true })} className="mt-1" /></div>
              <div><Label>Brand</Label><Input {...register("brand")} className="mt-1" placeholder="Caesarstone, Silestone..." /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Thickness</Label>
                <select {...register("thickness")} className="mt-1 w-full border border-input rounded-md px-3 py-2 text-sm bg-background">
                  <option>2cm</option><option>3cm</option>
                </select>
              </div>
              <div>
                <Label>Finish</Label>
                <select {...register("finish")} className="mt-1 w-full border border-input rounded-md px-3 py-2 text-sm bg-background">
                  <option>Polished</option><option>Honed</option><option>Suede</option><option>Concrete</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Slab Width (inches)</Label><Input type="number" {...register("slabWidth")} className="mt-1" /></div>
              <div><Label>Slab Height (inches)</Label><Input type="number" {...register("slabHeight")} className="mt-1" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Quantity on Hand</Label><Input type="number" {...register("quantity")} className="mt-1" /></div>
              <div><Label>Low Stock Threshold</Label><Input type="number" {...register("lowStockThreshold")} className="mt-1" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Cost per Sq Ft</Label><Input type="number" step="0.01" {...register("costPerSqft")} className="mt-1" /></div>
              <div><Label>Storage Location</Label><Input {...register("location")} className="mt-1" placeholder="Rack A-3" /></div>
            </div>
            <div><Label>Notes</Label><textarea {...register("notes")} rows={2} className="mt-1 w-full border border-input rounded-md px-3 py-2 text-sm bg-background resize-none" /></div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending}>Add to Inventory</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editItem} onOpenChange={() => setEditItem(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Inventory Item</DialogTitle></DialogHeader>
          {editItem && (
            <form onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              updateMutation.mutate({
                id: editItem.id,
                colorName: fd.get("colorName") as string,
                brand: fd.get("brand") as string || undefined,
                quantity: parseInt(fd.get("quantity") as string),
                lowStockThreshold: parseInt(fd.get("lowStockThreshold") as string),
                costPerSqft: fd.get("costPerSqft") as string || undefined,
                location: fd.get("location") as string || undefined,
                notes: fd.get("notes") as string || undefined,
              });
            }} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Color Name</Label><Input name="colorName" defaultValue={editItem.colorName} className="mt-1" /></div>
                <div><Label>Brand</Label><Input name="brand" defaultValue={editItem.brand ?? ""} className="mt-1" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Quantity on Hand</Label><Input type="number" name="quantity" defaultValue={editItem.quantity} className="mt-1" /></div>
                <div><Label>Low Stock Threshold</Label><Input type="number" name="lowStockThreshold" defaultValue={editItem.lowStockThreshold} className="mt-1" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Cost per Sq Ft</Label><Input type="number" step="0.01" name="costPerSqft" defaultValue={editItem.costPerSqft ?? ""} className="mt-1" /></div>
                <div><Label>Location</Label><Input name="location" defaultValue={editItem.location ?? ""} className="mt-1" /></div>
              </div>
              <div><Label>Notes</Label><textarea name="notes" rows={2} defaultValue={editItem.notes ?? ""} className="mt-1 w-full border border-input rounded-md px-3 py-2 text-sm bg-background resize-none" /></div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditItem(null)}>Cancel</Button>
                <Button type="submit" disabled={updateMutation.isPending}>Save Changes</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
