import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "-";
  return new Intl.DateTimeFormat("nl-NL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

export function getStatusLabel(status: string | null): string {
  const labels: Record<string, string> = {
    new_lead: "Nieuwe Lead",
    lead_submitted: "Lead Ontvangen",
    quote_sent: "Verstuurd",
    viewed: "Bekeken",
    approved: "Geaccepteerd",
    rejected: "Afgewezen",
    invoiced: "Gefactureerd",
    invoice_sent: "Factuur Verstuurd",
    paid: "Betaald",
  };
  return labels[status || "new_lead"] || status || "Onbekend";
}

export function getStatusVariant(status: string | null): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "approved":
    case "paid":
      return "default";
    case "rejected":
      return "destructive";
    case "new_lead":
      return "outline";
    default:
      return "secondary";
  }
}

export function getStatusColor(status: string | null): string {
  switch (status) {
    case "new_lead":
      return "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-400 dark:border-orange-800";
    case "quote_sent":
      return "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800";
    case "viewed":
      return "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-800";
    case "approved":
      return "bg-green-100 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-400 dark:border-green-800";
    case "rejected":
      return "bg-red-100 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800";
    case "invoiced":
    case "invoice_sent":
      return "bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-800";
    case "paid":
      return "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800";
    default:
      return "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-950/40 dark:text-gray-400 dark:border-gray-800";
  }
}
