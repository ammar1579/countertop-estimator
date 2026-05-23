import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { formatDate } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Plus, Search, User, Phone, Mail, Building2, ArrowRight } from "lucide-react";
import { useForm } from "react-hook-form";

const LEAD_SOURCES = ["Website", "Phone", "Referral", "Walk-in", "Other"] as const;

type ClientForm = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
  company: string;
  leadSource: typeof LEAD_SOURCES[number];
  notes: string;
};

export default function Clients() {
  const [search, setSearch] = useState("");
  const [leadFilter, setLeadFilter] = useState<string>("all");
  const [showCreate, setShowCreate] = useState(false);
  const utils = trpc.useUtils();

  const { data: clients, isLoading } = trpc.clients.list.useQuery(
    { search: search || undefined, leadSource: leadFilter !== "all" ? leadFilter : undefined }
  );

  const createMutation = trpc.clients.create.useMutation({
    onSuccess: () => {
      utils.clients.list.invalidate();
      setShowCreate(false);
      reset();
      toast.success("Client created successfully");
    },
    onError: (e) => toast.error(e.message),
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ClientForm>({
    defaultValues: { province: "Ontario", leadSource: "Other" },
  });

  const onSubmit = (data: ClientForm) => createMutation.mutate(data);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display">Clients</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {clients ? `${clients.length} client${clients.length !== 1 ? "s" : ""}` : "Loading..."}
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4 mr-2" /> Add Client
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, phone..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={leadFilter} onValueChange={setLeadFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All lead sources" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sources</SelectItem>
            {LEAD_SOURCES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Client list */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      ) : !clients || clients.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <User className="w-12 h-12 text-muted-foreground/30 mb-3" />
            <p className="font-medium text-muted-foreground">No clients found</p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              {search || leadFilter ? "Try adjusting your filters" : "Add your first client to get started"}
            </p>
            {!search && !leadFilter && (
              <Button className="mt-4" onClick={() => setShowCreate(true)}>
                <Plus className="w-4 h-4 mr-2" /> Add Client
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {clients.map((client) => (
            <Link key={client.id} href={`/clients/${client.id}`}>
              <Card className="hover:shadow-md transition-all cursor-pointer hover:border-primary/30">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-primary font-semibold text-sm">
                        {client.firstName[0]}{client.lastName[0]}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-foreground">
                          {client.firstName} {client.lastName}
                        </p>
                        {client.company && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Building2 className="w-3 h-3" />{client.company}
                          </span>
                        )}
                        {client.leadSource && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground border border-border">
                            {client.leadSource}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-1 flex-wrap">
                        {client.email && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Mail className="w-3 h-3" />{client.email}
                          </span>
                        )}
                        {client.phone && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Phone className="w-3 h-3" />{client.phone}
                          </span>
                        )}
                        {client.city && (
                          <span className="text-xs text-muted-foreground">{client.city}, {client.province}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0 hidden sm:block">
                      <p className="text-xs text-muted-foreground">Added {formatDate(client.createdAt)}</p>
                      <ArrowRight className="w-4 h-4 text-muted-foreground/40 ml-auto mt-1" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Create client dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Client</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>First Name *</Label>
                <Input {...register("firstName", { required: true })} className="mt-1" />
                {errors.firstName && <p className="text-xs text-destructive mt-1">Required</p>}
              </div>
              <div>
                <Label>Last Name *</Label>
                <Input {...register("lastName", { required: true })} className="mt-1" />
                {errors.lastName && <p className="text-xs text-destructive mt-1">Required</p>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Email</Label>
                <Input type="email" {...register("email")} className="mt-1" />
              </div>
              <div>
                <Label>Phone</Label>
                <Input {...register("phone")} className="mt-1" placeholder="416-555-0100" />
              </div>
            </div>
            <div>
              <Label>Company</Label>
              <Input {...register("company")} className="mt-1" />
            </div>
            <div>
              <Label>Address</Label>
              <Input {...register("address")} className="mt-1" />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>City</Label>
                <Input {...register("city")} className="mt-1" />
              </div>
              <div>
                <Label>Province</Label>
                <Input {...register("province")} className="mt-1" defaultValue="Ontario" />
              </div>
              <div>
                <Label>Postal Code</Label>
                <Input {...register("postalCode")} className="mt-1" />
              </div>
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
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Creating..." : "Create Client"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
