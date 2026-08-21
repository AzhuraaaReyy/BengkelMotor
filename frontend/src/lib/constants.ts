import type {
  PaymentMethod,
  Role,
  SaleStatus,
  ServiceOrderStatus,
  StockMovementType,
} from "@/types";

// Centralized role/status constants (Rules.md §4 — no hard-coded strings scattered).

export const ROLES: Record<Role, Role> = {
  ADMIN: "ADMIN",
  CASHIER: "CASHIER",
};

export const SALE_STATUS: Record<SaleStatus, SaleStatus> = {
  DRAFT: "DRAFT",
  PENDING: "PENDING",
  PAID: "PAID",
  EXPIRED: "EXPIRED",
  VOID: "VOID",
};

export const SERVICE_ORDER_STATUS: Record<
  ServiceOrderStatus,
  ServiceOrderStatus
> = {
  OPEN: "OPEN",
  IN_PROGRESS: "IN_PROGRESS",
  DONE: "DONE",
  CANCELLED: "CANCELLED",
};

export const PAYMENT_METHODS: Record<PaymentMethod, PaymentMethod> = {
  CASH: "CASH",
  QRIS: "QRIS",
  VA: "VA",
  GOPAY: "GOPAY",
};

export const STOCK_MOVEMENT_TYPES: Record<
  StockMovementType,
  StockMovementType
> = {
  OPENING: "OPENING",
  PURCHASE: "PURCHASE",
  SALE: "SALE",
  ADJUSTMENT: "ADJUSTMENT",
  VOID_RETURN: "VOID_RETURN",
};

// Bahasa Indonesia labels (UI text in Indonesian per Rules.md §4)
export const SALE_STATUS_LABEL: Record<SaleStatus, string> = {
  DRAFT: "Draft",
  PENDING: "Menunggu Bayar",
  PAID: "Lunas",
  EXPIRED: "Kedaluwarsa",
  VOID: "Dibatalkan",
};

export const SERVICE_STATUS_LABEL: Record<ServiceOrderStatus, string> = {
  OPEN: "Baru",
  IN_PROGRESS: "Dikerjakan",
  DONE: "Selesai",
  CANCELLED: "Dibatalkan",
};

export const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  CASH: "Tunai",
  QRIS: "QRIS",
  VA: "Virtual Account",
  GOPAY: "GoPay",
};

export const STOCK_MOVEMENT_LABEL: Record<StockMovementType, string> = {
  OPENING: "Stok Awal",
  PURCHASE: "Pembelian",
  SALE: "Penjualan",
  ADJUSTMENT: "Penyesuaian",
  VOID_RETURN: "Pengembalian Void",
};

export const ROLE_LABEL: Record<Role, string> = {
  ADMIN: "Admin",
  CASHIER: "Kasir",
};

// Expense categories (MVP — string-based per Schema §15)
export const EXPENSE_CATEGORIES = [
  "Listrik & Air",
  "Internet",
  "Operasional",
  "Peralatan",
  "Konsumsi",
  "Gaji",
  "Perawatan Bengkel",
  "Lainnya",
] as const;
