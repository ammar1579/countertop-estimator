import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { formatCurrency, formatDate, StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Search, FileText, Eye } from "lucide-react";

const STATUS_FILTERS = ["All", "Draft", "Active", "Expired"] as const;

export default function Quotes() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");

  const { data: quotes, isLoading } = trpc.quotes.list.useQuery(
    {
      status: statusFilter !== "All" ? (statusFilter as any) : undefined,
      search: search || undefined,
    },

  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display">Quotes</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {quotes ? `${quotes.length} quote${quotes.length !== 1 ? "s" : ""}` : "Loading..."}
          </p>
        </div>
        <Link href="/quotes/new">
          <Button><Plus className="w-4 h-4 mr-2" /> New Quote</Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap items-center">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search quotes..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                statusFilter === s
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
        </div>
      ) : !quotes || quotes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <FileText className="w-12 h-12 text-muted-foreground/30 mb-3" />
            <p className="font-medium text-muted-foreground">No quotes found</p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              {search || statusFilter !== "All" ? "Try adjusting your filters" : "Create your first quote to get started"}
            </p>
            {!search && statusFilter === "All" && (
              <Link href="/quotes/new">
                <Button className="mt-4"><Plus className="w-4 h-4 mr-2" />New Quote</Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Quote</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Client</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Price List</th>
                  <th className="text-center px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Rev</th>
                  <th className="text-center px-4 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Total</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Date</th>
                  <th className="px-4 py-3 hidden lg:table-cell"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {quotes.map((row) => (
                  <tr key={row.quote.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/quotes/${row.quote.id}`}>
                        <div className="cursor-pointer">
                          <p className="font-medium text-foreground hover:text-primary truncate max-w-48">{row.quote.title}</p>
                          <p className="text-xs text-muted-foreground">{row.quote.quoteNumber}</p>
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      {row.client ? (
                        <Link href={`/clients/${row.client.id}`}>
                          <span className="hover:text-primary cursor-pointer">
                            {row.client.firstName} {row.client.lastName}
                          </span>
                        </Link>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">
                      {row.priceList?.name ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-center hidden lg:table-cell text-muted-foreground">
                      {row.quote.revision}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <StatusBadge status={row.quote.status} />
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">
                      {formatCurrency(row.quote.totalAmount)}
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground hidden md:table-cell">
                      {formatDate(row.quote.createdAt)}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <div className="flex items-center gap-1 justify-end">
                        {row.quote.viewCount != null && row.quote.viewCount > 0 && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Eye className="w-3 h-3" />{row.quote.viewCount}
                          </span>
                        )}
                        <Link href={`/quotes/${row.quote.id}`}>
                          <Button variant="ghost" size="sm" className="h-7 text-xs">View</Button>
                        </Link>
                      </div>
                    </td>
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
