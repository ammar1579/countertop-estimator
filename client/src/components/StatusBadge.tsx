import { cn } from "@/lib/utils";

type Status =
  | "Draft" | "Active" | "Expired"
  | "Pending" | "In Progress" | "Completed" | "Invoiced"
  | "Unpaid" | "Partial" | "Paid";

const statusStyles: Record<Status, string> = {
  Draft: "bg-amber-100 text-amber-800 border-amber-200",
  Active: "bg-emerald-100 text-emerald-800 border-emerald-200",
  Expired: "bg-red-100 text-red-800 border-red-200",
  Pending: "bg-amber-100 text-amber-800 border-amber-200",
  "In Progress": "bg-blue-100 text-blue-800 border-blue-200",
  Completed: "bg-emerald-100 text-emerald-800 border-emerald-200",
  Invoiced: "bg-purple-100 text-purple-800 border-purple-200",
  Unpaid: "bg-red-100 text-red-800 border-red-200",
  Partial: "bg-amber-100 text-amber-800 border-amber-200",
  Paid: "bg-emerald-100 text-emerald-800 border-emerald-200",
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const style = statusStyles[status as Status] ?? "bg-slate-100 text-slate-700 border-slate-200";
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border", style, className)}>
      {status}
    </span>
  );
}

export function formatCurrency(amount: string | number | null | undefined): string {
  const num = typeof amount === "string" ? parseFloat(amount) : (amount ?? 0);
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(num);
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" });
}
