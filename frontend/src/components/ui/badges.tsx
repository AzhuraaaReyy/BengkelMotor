import { Badge } from "./Badge";
import { SALE_STATUS_LABEL, SERVICE_STATUS_LABEL } from "@/lib/constants";
import type { SaleStatus, ServiceOrderStatus } from "@/types";

// Status selalu punya text label, bukan hanya warna (Design.md §19, Rules.md §11).

export function SaleStatusBadge({ status }: { status: SaleStatus }) {
  const tone =
    status === "PAID"
      ? "success"
      : status === "VOID"
        ? "danger"
        : status === "EXPIRED"
          ? "neutral"
          : "warning";
  return <Badge tone={tone}>{SALE_STATUS_LABEL[status]}</Badge>;
}

export function ServiceStatusBadge({ status }: { status: ServiceOrderStatus }) {
  const tone =
    status === "DONE"
      ? "success"
      : status === "CANCELLED"
        ? "danger"
        : status === "IN_PROGRESS"
          ? "primary"
          : "neutral";
  return <Badge tone={tone}>{SERVICE_STATUS_LABEL[status]}</Badge>;
}

export function StockBadge({ current, min }: { current: number; min: number }) {
  const low = current <= min;
  if (low) {
    return (
      <Badge tone="danger">
        Stok Rendah · {current} / {min}
      </Badge>
    );
  }
  return <Badge tone="success">{current}</Badge>;
}
