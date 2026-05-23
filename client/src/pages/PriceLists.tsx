import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { formatCurrency } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Plus, Edit2, Trash2, Tag } from "lucide-react";

const CATEGORIES = ["material", "edge", "splash", "accessory", "fixture"] as const;
const UNITS = ["sqft", "linft", "each"] as const;

export default function PriceLists() {
  const [selectedList, setSelectedList] = useState<number | null>(null);
  const [showCreateList, setShowCreateList] = useState(false);
  const [showCreateItem, setShowCreateItem] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [newListName, setNewListName] = useState("");
  const [newListDesc, setNewListDesc] = useState("");
  const utils = trpc.useUtils();

  const { data: priceLists, isLoading } = trpc.priceLists.list.useQuery();
  const { data: items } = trpc.priceLists.getItems.useQuery(
    { priceListId: selectedList! },
    { enabled: !!selectedList }
  );

  const createListMutation = trpc.priceLists.create.useMutation({
    onSuccess: (pl) => {
      utils.priceLists.list.invalidate();
      setShowCreateList(false);
      setNewListName("");
      setNewListDesc("");
      setSelectedList(pl.id);
      toast.success("Price list created");
    },
  });

  const createItemMutation = trpc.priceLists.createItem.useMutation({
    onSuccess: () => {
      utils.priceLists.getItems.invalidate({ priceListId: selectedList! });
      setShowCreateItem(false);
      toast.success("Item added");
    },
    onError: (e) => toast.error(e.message),
  });

  const updateItemMutation = trpc.priceLists.updateItem.useMutation({
    onSuccess: () => {
      utils.priceLists.getItems.invalidate({ priceListId: selectedList! });
      setEditItem(null);
      toast.success("Item updated");
    },
  });

  const deleteItemMutation = trpc.priceLists.deleteItem.useMutation({
    onSuccess: () => {
      utils.priceLists.getItems.invalidate({ priceListId: selectedList! });
      toast.success("Item deleted");
    },
  });

  const itemsByCategory = (cat: string) => items?.filter((i) => i.category === cat) ?? [];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display">Price Lists</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Manage material and service pricing templates</p>
        </div>
        <Button onClick={() => setShowCreateList(true)}>
          <Plus className="w-4 h-4 mr-2" /> New Price List
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Price list selector */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Templates</p>
          {isLoading ? (
            <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
          ) : (
            priceLists?.map((pl) => (
              <Card
                key={pl.id}
                className={`cursor-pointer transition-all hover:shadow-sm ${selectedList === pl.id ? "border-primary bg-primary/5" : ""}`}
                onClick={() => setSelectedList(pl.id)}
              >
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <Tag className={`w-4 h-4 shrink-0 ${selectedList === pl.id ? "text-primary" : "text-muted-foreground"}`} />
                    <div>
                      <p className={`text-sm font-medium ${selectedList === pl.id ? "text-primary" : ""}`}>{pl.name}</p>
                      {pl.description && <p className="text-xs text-muted-foreground">{pl.description}</p>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Items */}
        <div className="lg:col-span-3">
          {!selectedList ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <Tag className="w-10 h-10 text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground">Select a price list to view and edit items</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="font-semibold">{priceLists?.find((pl) => pl.id === selectedList)?.name}</p>
                <Button size="sm" onClick={() => setShowCreateItem(true)}>
                  <Plus className="w-4 h-4 mr-2" /> Add Item
                </Button>
              </div>

              <Tabs defaultValue="material">
                <TabsList className="flex-wrap h-auto gap-1">
                  {CATEGORIES.map((cat) => (
                    <TabsTrigger key={cat} value={cat} className="capitalize">
                      {cat} ({itemsByCategory(cat).length})
                    </TabsTrigger>
                  ))}
                </TabsList>

                {CATEGORIES.map((cat) => (
                  <TabsContent key={cat} value={cat} className="mt-4">
                    {itemsByCategory(cat).length === 0 ? (
                      <Card>
                        <CardContent className="py-8 text-center text-sm text-muted-foreground">
                          No {cat} items yet.
                          <Button variant="link" size="sm" onClick={() => setShowCreateItem(true)}>Add one</Button>
                        </CardContent>
                      </Card>
                    ) : (
                      <Card>
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-border bg-muted/30">
                              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Name</th>
                              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden md:table-cell">Description</th>
                              <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Price</th>
                              <th className="text-center px-4 py-2.5 font-medium text-muted-foreground">Unit</th>
                              <th className="px-4 py-2.5"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {itemsByCategory(cat).map((item) => (
                              <tr key={item.id} className="hover:bg-muted/20">
                                <td className="px-4 py-2.5 font-medium">{item.name}</td>
                                <td className="px-4 py-2.5 text-muted-foreground hidden md:table-cell">{item.description}</td>
                                <td className="px-4 py-2.5 text-right font-semibold text-primary">{formatCurrency(item.pricePerUnit)}</td>
                                <td className="px-4 py-2.5 text-center text-muted-foreground">{item.unit}</td>
                                <td className="px-4 py-2.5">
                                  <div className="flex gap-1 justify-end">
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditItem(item)}>
                                      <Edit2 className="w-3 h-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 text-destructive hover:text-destructive"
                                      onClick={() => {
                                        if (confirm(`Delete "${item.name}"?`)) deleteItemMutation.mutate({ id: item.id });
                                      }}
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </Card>
                    )}
                  </TabsContent>
                ))}
              </Tabs>
            </div>
          )}
        </div>
      </div>

      {/* Create price list dialog */}
      <Dialog open={showCreateList} onOpenChange={setShowCreateList}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Price List</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Name *</Label><Input className="mt-1" value={newListName} onChange={(e) => setNewListName(e.target.value)} placeholder="e.g. Premium Quartz" /></div>
            <div><Label>Description</Label><Input className="mt-1" value={newListDesc} onChange={(e) => setNewListDesc(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateList(false)}>Cancel</Button>
            <Button onClick={() => createListMutation.mutate({ name: newListName, description: newListDesc })} disabled={!newListName}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create item dialog */}
      <Dialog open={showCreateItem} onOpenChange={setShowCreateItem}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Price List Item</DialogTitle></DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            createItemMutation.mutate({
              priceListId: selectedList!,
              name: fd.get("name") as string,
              description: fd.get("description") as string || undefined,
              category: fd.get("category") as any,
              unit: fd.get("unit") as any,
              pricePerUnit: fd.get("pricePerUnit") as string,
            });
          }} className="space-y-4">
            <div><Label>Name *</Label><Input name="name" required className="mt-1" /></div>
            <div><Label>Description</Label><Input name="description" className="mt-1" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Category</Label>
                <select name="category" className="mt-1 w-full border border-input rounded-md px-3 py-2 text-sm bg-background">
                  {CATEGORIES.map((c) => <option key={c} value={c} className="capitalize">{c}</option>)}
                </select>
              </div>
              <div>
                <Label>Unit</Label>
                <select name="unit" className="mt-1 w-full border border-input rounded-md px-3 py-2 text-sm bg-background">
                  {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            </div>
            <div><Label>Price per Unit (CAD)</Label><Input name="pricePerUnit" type="number" step="0.01" required className="mt-1" /></div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreateItem(false)}>Cancel</Button>
              <Button type="submit" disabled={createItemMutation.isPending}>Add Item</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit item dialog */}
      <Dialog open={!!editItem} onOpenChange={() => setEditItem(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Item</DialogTitle></DialogHeader>
          {editItem && (
            <form onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              updateItemMutation.mutate({
                id: editItem.id,
                name: fd.get("name") as string,
                description: fd.get("description") as string || undefined,
                pricePerUnit: fd.get("pricePerUnit") as string,
              });
            }} className="space-y-4">
              <div><Label>Name</Label><Input name="name" defaultValue={editItem.name} className="mt-1" /></div>
              <div><Label>Description</Label><Input name="description" defaultValue={editItem.description ?? ""} className="mt-1" /></div>
              <div><Label>Price per Unit (CAD)</Label><Input name="pricePerUnit" type="number" step="0.01" defaultValue={editItem.pricePerUnit} className="mt-1" /></div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditItem(null)}>Cancel</Button>
                <Button type="submit" disabled={updateItemMutation.isPending}>Save</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
