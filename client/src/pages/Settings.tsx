import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { formatDate } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Shield, User, Calendar, Settings as SettingsIcon } from "lucide-react";

export default function Settings() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const isAdmin = user?.role === "admin";

  const { data: users, isLoading } = trpc.admin.listUsers.useQuery(undefined, { enabled: isAdmin });
  const { data: priceLists } = trpc.priceLists.list.useQuery();

  const updateRoleMutation = trpc.admin.updateUserRole.useMutation({
    onSuccess: () => {
      utils.admin.listUsers.invalidate();
      toast.success("User role updated");
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display">Settings</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Application configuration and user management</p>
      </div>

      {/* Current user */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="w-4 h-4" /> My Account
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-primary font-bold">{user?.name?.[0] ?? "U"}</span>
            </div>
            <div>
              <p className="font-semibold">{user?.name}</p>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
              <div className="flex items-center gap-2 mt-1">
                <Shield className="w-3 h-3 text-muted-foreground" />
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  user?.role === "admin" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                }`}>
                  {user?.role === "admin" ? "Administrator" : "Sales Rep"}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tax configuration */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <SettingsIcon className="w-4 h-4" /> Tax Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div>
              <p className="font-medium text-sm">Tax rates</p>
              <p className="text-xs text-muted-foreground">Configured per active price list</p>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold text-primary">
                {priceLists?.[0]?.taxRate
                  ? `${(parseFloat(priceLists[0].taxRate) * 100).toFixed(0)}%`
                  : "13%"}
              </p>
              <p className="text-xs text-muted-foreground">Default display rate</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Quote tax is calculated from the selected price list and recomputed on the server when line items are saved.
          </p>
        </CardContent>
      </Card>

      {/* User management (admin only) */}
      {isAdmin && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="w-4 h-4" /> User Management
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}</div>
            ) : (
              <div className="space-y-2">
                {users?.map((u) => (
                  <div key={u.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-primary text-xs font-bold">{u.name?.[0] ?? "U"}</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium">{u.name}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> Joined {formatDate(u.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                        u.role === "admin" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                      }`}>
                        {u.role === "admin" ? "Admin" : "Sales Rep"}
                      </span>
                      {u.id !== user?.id && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs h-7"
                          onClick={() => updateRoleMutation.mutate({
                            userId: u.id,
                            role: u.role === "admin" ? "user" : "admin",
                          })}
                          disabled={updateRoleMutation.isPending}
                        >
                          {u.role === "admin" ? "Demote" : "Promote to Admin"}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* App info */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <span className="text-white font-bold text-sm">QQ</span>
            </div>
            <div>
              <p className="font-semibold">Quick Quartz</p>
              <p className="text-xs text-muted-foreground">Countertops Management Platform · Greater Toronto Area</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
