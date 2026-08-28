import { useState, useMemo } from "react";
import { useDebouncedValue } from "@/lib/useDebouncedValue";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Pagination } from "@/components/ui/Pagination";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import { useNotifications } from "@/lib/useNotifications";
import { useAuth } from "@/app/auth/AuthContext";
import { useProducts, useProductMovements } from "@/lib/useProducts";
import type { ProductPayload } from "@/lib/api/products";
import { formatRupiah, formatQuantity, formatDateTime } from "@/lib/formatters";
import { STOCK_MOVEMENT_LABEL } from "@/lib/constants";
import { PlusIcon, EditIcon } from "@/components/shared/icons";
import { resizeImage } from "@/lib/imageUtils";
import type { Product, StockMovement } from "@/types";
import {
  Search,
  LayoutGrid,
  List,
  Package,
  History,
  AlertTriangle,
  ArrowUpCircle,
  ArrowDownCircle,
  Info,
  Download,
  Clock,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface FormState {
  id?: number;
  sku: string;
  name: string;
  category: string;
  brand: string;
  unit: string;
  purchase_price: string;
  sale_price: string;
  min_stock: string;
  is_active: boolean;
  image: File | null;
  imagePreview: string | null;
}

interface ProductWithRowIndex extends Product {
  rowIndex: number;
}

const emptyForm: FormState = {
  sku: "",
  name: "",
  category: "",
  brand: "",
  unit: "pcs",
  purchase_price: "0",
  sale_price: "0",
  min_stock: "0",
  is_active: true,
  image: null,
  imagePreview: null,
};

const CATEGORY_FILTERS = [
  { id: "ALL", label: "Semua" },
  { id: "Oli", label: "Oli" },
  { id: "Rem", label: "Rem" },
  { id: "Pengapian", label: "Pengapian" },
  { id: "Transmisi", label: "Transmisi" },
  { id: "Rantai", label: "Rantai" },
];

// =========================================================================
// 1. Sub-Komponen Reusable: Stock Adjustment Modal
// =========================================================================
function StockAdjustmentModal({
  product,
  onClose,
  onSave,
  saving,
}: {
  product: Product | null;
  onClose: () => void;
  onSave: (
    type: "PURCHASE" | "ADJUSTMENT",
    quantity: string,
    note: string,
  ) => void;
  saving: boolean;
}) {
  const [adjustType, setAdjustType] = useState<"PURCHASE" | "ADJUSTMENT">(
    "PURCHASE",
  );
  const [quantity, setQuantity] = useState("");
  const [note, setNote] = useState("");

  if (!product) return null;

  const handleSave = () => {
    onSave(adjustType, quantity, note);
  };

  return (
    <Modal open={!!product} onClose={onClose} title="Atur Stok" size="md">
      <div className="space-y-4 font-sans text-slate-800">
        {/* Card Ringkasan Produk Top */}
        <div className="flex items-center gap-3.5 p-3.5 bg-slate-50 border border-slate-100 rounded-2xl">
          <div className="h-12 w-12 rounded-xl bg-white border border-slate-200/80 flex items-center justify-center shrink-0 overflow-hidden shadow-2xs">
            {product.image ? (
              <img
                src={product.image}
                alt={product.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <Package className="h-6 w-6 text-slate-300" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <h4 className="font-bold text-sm text-slate-900 leading-tight">
                {product.name}
              </h4>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                  product.is_active
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-slate-200 text-slate-600"
                }`}
              >
                {product.is_active ? "Aktif" : "Nonaktif"}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium mt-1">
              SKU:{" "}
              <span className="font-mono text-slate-600">{product.sku}</span> •{" "}
              Kategori: {product.category || "General"}
            </p>
            <p className="text-xs text-slate-600 font-medium mt-1">
              Stok saat ini:{" "}
              <span className="font-bold text-blue-600">
                {formatQuantity(product.current_stock)} {product.unit}
              </span>
            </p>
          </div>
        </div>

        {/* Pilihan Jenis Penyesuaian */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 block">
            Jenis Penyesuaian
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => setAdjustType("PURCHASE")}
              className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
                adjustType === "PURCHASE"
                  ? "border-blue-500 bg-blue-50/50 ring-2 ring-blue-500/20"
                  : "border-slate-200 hover:border-slate-300 bg-white"
              }`}
            >
              <div
                className={`p-2 rounded-lg shrink-0 ${
                  adjustType === "PURCHASE"
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                <ArrowUpCircle className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-800">
                  Penambahan Stok
                </p>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5 leading-snug">
                  Menambah jumlah stok barang
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setAdjustType("ADJUSTMENT")}
              className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
                adjustType === "ADJUSTMENT"
                  ? "border-red-500 bg-red-50/50 ring-2 ring-red-500/20"
                  : "border-slate-200 hover:border-slate-300 bg-white"
              }`}
            >
              <div
                className={`p-2 rounded-lg shrink-0 ${
                  adjustType === "ADJUSTMENT"
                    ? "bg-red-600 text-white"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                <ArrowDownCircle className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-800">
                  Pengurangan Stok
                </p>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5 leading-snug">
                  Mengurangi jumlah stok barang
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* Input Jumlah */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-700 block">
            {adjustType === "PURCHASE"
              ? "Jumlah yang Ditambahkan"
              : "Jumlah yang Dikurangi"}
          </label>
          <p className="text-[11px] text-slate-400">
            {adjustType === "PURCHASE"
              ? "Masukkan berapa banyak stok yang mau ditambahkan ke gudang"
              : "Masukkan berapa banyak stok yang mau dikurangi dari gudang"}
          </p>
          <div className="relative flex items-center">
            <input
              type="number"
              step={1}
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="Contoh: 5"
              className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-3.5 pr-12 text-xs font-semibold text-slate-800 shadow-2xs placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <span className="absolute right-3.5 text-xs font-bold text-slate-400 pointer-events-none">
              {product.unit}
            </span>
          </div>
        </div>

        {/* Input Catatan */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700">
              Catatan (Wajib)
            </label>
            <span className="text-[10px] font-semibold text-slate-400">
              {note.length}/100
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            Catatan ini akan membantu kamu ingat kenapa stoknya berubah
          </p>
          <textarea
            rows={2}
            maxLength={100}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Contoh: Beli dari toko Sejahtera, atau Barang rusak/hilang"
            className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-medium text-slate-800 shadow-2xs placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
          />
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-blue-600 bg-blue-50 px-3 py-1.5 rounded-xl text-[11px] font-medium w-full sm:w-auto">
            <Info className="h-4 w-4 shrink-0" />
            <span>
              Semua perubahan stok akan tersimpan otomatis di riwayat.
            </span>
          </div>

          <div className="flex items-center justify-end gap-2 w-full sm:w-auto">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={saving}
              className="px-3.5 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl"
            >
              Batal
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              loading={saving}
              className="px-3.5 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs"
            >
              Simpan Perubahan
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

// =========================================================================
// 2. Sub-Komponen Reusable: Stock History Modal (Presisi Sesuai Gambar)
// =========================================================================
function StockHistoryModal({
  product,
  movements,
  loading,
  onClose,
}: {
  product: Product | null;
  movements: StockMovement[];
  loading: boolean;
  onClose: () => void;
}) {
  const [directionFilter, setDirectionFilter] = useState<string>("ALL");

  const filteredMovements = useMemo(() => {
    return (movements || []).filter((m) => {
      if (directionFilter !== "ALL" && m.direction !== directionFilter)
        return false;
      return true;
    });
  }, [movements, directionFilter]);

  if (!product) return null;

  const isLowStock = product.current_stock <= product.min_stock;
  const isOutOfStock = product.current_stock <= 0;
  const lastMovement = movements?.[0];

  return (
    <Modal open={!!product} onClose={onClose} size="lg" hideScrollbar={true}>
      <div className="space-y-4 font-sans text-slate-800">
        {/* Header Informatif Produk */}
        <div className="flex items-start justify-between gap-4 pb-1">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="h-14 w-14 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-center shrink-0 overflow-hidden shadow-2xs">
              {product.image ? (
                <img
                  src={product.image}
                  alt={product.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <Package className="h-7 w-7 text-slate-300" />
              )}
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-base text-slate-900 leading-snug truncate">
                Riwayat Stok: {product.name}
              </h3>
              <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400 font-medium truncate">
                <span>
                  SKU:{" "}
                  <strong className="font-mono text-slate-600">
                    {product.sku}
                  </strong>
                </span>
                <span>•</span>
                <span>
                  Kategori:{" "}
                  <strong className="text-slate-600">
                    {product.category || "General"}
                  </strong>
                </span>
              </div>
              <div className="mt-1">
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold inline-block ${
                    product.is_active
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {product.is_active ? "Aktif" : "Nonaktif"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 4 Summary Cards Panel */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50/70 p-3.5 rounded-2xl border border-slate-200/70">
          <div className="flex items-center gap-3 pr-2 border-r border-slate-200/60 last:border-r-0">
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 shrink-0">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-slate-400 leading-tight">
                Stok Saat Ini
              </p>
              <p className="text-sm font-extrabold text-slate-900 mt-0.5">
                {formatQuantity(product.current_stock)} {product.unit}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 pr-2 border-r border-slate-200/60 last:border-r-0">
            <div>
              <p className="text-[11px] font-medium text-slate-400 leading-tight">
                Stok Minimum
              </p>
              <p className="text-sm font-extrabold text-slate-900 mt-0.5">
                {formatQuantity(product.min_stock)} {product.unit}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 pr-2 border-r border-slate-200/60 last:border-r-0">
            <div>
              <p className="text-[11px] font-medium text-slate-400 leading-tight">
                Status Stok
              </p>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold inline-block mt-1 ${
                  isOutOfStock
                    ? "bg-red-100 text-red-700"
                    : isLowStock
                      ? "bg-amber-100 text-amber-700"
                      : "bg-emerald-100 text-emerald-700"
                }`}
              >
                {isOutOfStock ? "Habis" : isLowStock ? "Menipis" : "Aman"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Clock className="h-4 w-4 text-slate-400 shrink-0" />
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-slate-400 leading-tight">
                Terakhir Diperbarui
              </p>
              <p className="text-xs font-bold text-slate-800 mt-0.5 truncate">
                {lastMovement ? formatDateTime(lastMovement.created_at) : "-"}
              </p>
              <p className="text-[10px] text-slate-400 font-medium truncate">
                Oleh: {lastMovement?.created_by_name || "Sistem"}
              </p>
            </div>
          </div>
        </div>

       

        {/* Tabel Data Riwayat */}
        {loading ? (
          <div className="py-12">
            <LoadingState />
          </div>
        ) : filteredMovements.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 text-center border border-slate-200/80 text-slate-400 space-y-2">
            <History className="h-8 w-8 mx-auto stroke-[1.5] text-slate-300" />
            <p className="text-xs font-medium">
              Tidak ada catatan riwayat pergerakan stok.
            </p>
          </div>
        ) : (
          <>
            {/* Tampilan Desktop & Tablet (>= 640px) */}
            <div className="hidden sm:block overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xs">
              <div className="max-h-[320px] overflow-y-auto hide-scrollbar">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/90 border-b border-slate-200/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider sticky top-0 z-10 backdrop-blur-xs">
                    <tr>
                      <th className="py-3 px-4">ARAH</th>
                      <th className="py-3 px-4">TIPE</th>
                      <th className="py-3 px-4 text-center">PERUBAHAN</th>
                      <th className="py-3 px-4 text-center">SEBELUM</th>
                      <th className="py-3 px-4 text-center">SESUDAH</th>
                      <th className="py-3 px-4">PETUGAS</th>
                      <th className="py-3 px-4">KETERANGAN</th>
                      <th className="py-3 px-4 text-right">WAKTU</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {filteredMovements.map((r) => {
                      const isPositive = r.quantity_change > 0;
                      return (
                        <tr
                          key={r.id}
                          className="hover:bg-slate-50/70 transition-colors"
                        >
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-bold text-[11px] ${
                                isPositive
                                  ? "bg-emerald-100/70 text-emerald-700"
                                  : "bg-red-100/70 text-red-700"
                              }`}
                            >
                              {isPositive ? (
                                <ArrowUpCircle className="h-3.5 w-3.5" />
                              ) : (
                                <ArrowDownCircle className="h-3.5 w-3.5" />
                              )}
                              {isPositive ? "Masuk" : "Keluar"}
                            </span>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 font-bold text-[11px]">
                              {(STOCK_MOVEMENT_LABEL as Record<string, string>)[
                                r.type
                              ] || r.type}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            <span
                              className={`font-black tabular-nums text-xs ${
                                isPositive ? "text-emerald-600" : "text-red-600"
                              }`}
                            >
                              {isPositive ? "+" : ""}
                              {formatQuantity(r.quantity_change)} {product.unit}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center whitespace-nowrap font-semibold text-slate-500">
                            {r.stock_before ?? "-"}
                          </td>
                          <td className="py-3 px-4 text-center whitespace-nowrap font-bold text-slate-900">
                            {r.stock_after ?? "-"}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap font-semibold text-slate-700">
                            {r.created_by_name || "Sistem"}
                          </td>
                          <td className="py-3 px-4 text-slate-500 max-w-[180px] truncate">
                            {r.note || "-"}
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap text-slate-400 text-[11px]">
                            {formatDateTime(r.created_at)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Tampilan Mobile (< 640px) */}
            <div className="sm:hidden space-y-2.5 max-h-[340px] overflow-y-auto hide-scrollbar">
              {filteredMovements.map((r) => {
                const isPositive = r.quantity_change > 0;
                return (
                  <div
                    key={r.id}
                    className="p-3 bg-white border border-slate-200/80 rounded-2xl shadow-2xs space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                            isPositive
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {isPositive ? "Masuk" : "Keluar"}
                        </span>
                        <span className="font-bold text-xs text-slate-800">
                          {(STOCK_MOVEMENT_LABEL as Record<string, string>)[
                            r.type
                          ] || r.type}
                        </span>
                      </div>
                      <span
                        className={`font-black text-xs tabular-nums ${
                          isPositive ? "text-emerald-600" : "text-red-600"
                        }`}
                      >
                        {isPositive ? "+" : ""}
                        {formatQuantity(r.quantity_change)} {product.unit}
                      </span>
                    </div>

                    {/* Stok Sebelum & Sesudah */}
                    <div className="flex items-center justify-center gap-3 py-2 bg-slate-50/50 rounded-lg border border-slate-100">
                      <div className="text-center">
                        <p className="text-[9px] text-slate-400 font-medium uppercase mb-0.5">
                          Sebelum
                        </p>
                        <p className="text-xs font-bold text-slate-600 tabular-nums">
                          {r.stock_before ?? "-"}{" "}
                          {r.stock_before != null ? product.unit : ""}
                        </p>
                      </div>
                      <div className="h-8 w-px bg-slate-200"></div>
                      <div className="text-center">
                        <p className="text-[9px] text-slate-400 font-medium uppercase mb-0.5">
                          Sesudah
                        </p>
                        <p className="text-xs font-bold text-slate-900 tabular-nums">
                          {r.stock_after ?? "-"}{" "}
                          {r.stock_after != null ? product.unit : ""}
                        </p>
                      </div>
                    </div>

                    {r.note && (
                      <p className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded-xl font-medium border border-slate-100 leading-snug">
                        {r.note}
                      </p>
                    )}

                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100">
                      <span>Petugas: {r.created_by_name || "Sistem"}</span>
                      <span>{formatDateTime(r.created_at)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Footer Pagination */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>
            Menampilkan 1 - {filteredMovements.length} dari{" "}
            {filteredMovements.length} riwayat
          </span>

          <div className="flex items-center gap-1">
            <button
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-400 hover:bg-slate-50 disabled:opacity-40"
              disabled
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-3 py-1 rounded-lg bg-blue-600 text-white font-bold text-xs">
              1
            </span>
            <button
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-400 hover:bg-slate-50 disabled:opacity-40"
              disabled
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

// =========================================================================
// 3. Mobile Card & Grid Item Komponen Halaman Produk
// =========================================================================
function MobileProductCard({
  product,
  isAdmin,
  onEdit,
  onAdjust,
  onMovements,
}: {
  product: ProductWithRowIndex;
  isAdmin: boolean;
  onEdit: (p: Product) => void;
  onAdjust: (p: Product) => void;
  onMovements: (p: Product) => void;
}) {
  const isOutOfStock = product.current_stock <= 0;
  const isLowStock = product.current_stock <= product.min_stock;

  return (
    <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs flex flex-col justify-between space-y-3">
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-12 w-12 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center shrink-0">
              {product.image ? (
                <img
                  src={product.image}
                  alt={product.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <Package className="h-5 w-5 text-slate-300" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-mono font-semibold text-slate-400 block">
                #{product.rowIndex} • {product.sku}
              </span>
              <h3 className="font-bold text-xs text-slate-800 leading-snug break-words">
                {product.name}
              </h3>
              <p className="text-[11px] font-medium text-slate-500 mt-0.5">
                {product.category || "General"}
              </p>
            </div>
          </div>
          {isAdmin && (
            <button
              onClick={() => onEdit(product)}
              className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-slate-50 shrink-0"
              title="Edit Produk"
            >
              <EditIcon className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div className="space-y-3 pt-2 border-t border-slate-100">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-[10px] text-slate-400 font-medium">Harga Jual</p>
            <p className="text-xs font-black text-blue-600">
              {formatRupiah(product.sale_price)}
            </p>
          </div>
          <div>
            <span
              className={`text-[10px] font-bold px-2 py-1 rounded-md inline-block whitespace-nowrap ${
                isOutOfStock
                  ? "bg-red-50 text-red-600"
                  : isLowStock
                    ? "bg-amber-50 text-amber-700"
                    : "bg-emerald-50 text-emerald-700"
              }`}
            >
              Stok: {product.current_stock} {product.unit}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <Button
            variant="primary"
            size="sm"
            onClick={() => onAdjust(product)}
            className="flex-1 text-xs py-1.5 bg-blue-600 text-white rounded-xl"
          >
            Atur Stok
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onMovements(product)}
            className="px-3 py-1.5 text-xs bg-slate-100 text-slate-700 rounded-xl"
          >
            Riwayat
          </Button>
        </div>
      </div>
    </div>
  );
}

function ProductCardItem({
  product,
  isAdmin,
  onEdit,
  onAdjust,
  onMovements,
}: {
  product: Product;
  isAdmin: boolean;
  onEdit: (p: Product) => void;
  onAdjust: (p: Product) => void;
  onMovements: (p: Product) => void;
}) {
  const isOutOfStock = product.current_stock <= 0;
  const isLowStock = product.current_stock <= product.min_stock;

  return (
    <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between group">
      <div>
        <div className="relative w-full h-36 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center overflow-hidden mb-3">
          {product.image ? (
            <img
              src={product.image}
              alt={product.name}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <Package className="h-10 w-10 text-slate-300 stroke-[1.5]" />
          )}
          <div className="absolute top-2 left-2">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-white/90 backdrop-blur-xs text-slate-700 shadow-2xs border border-slate-200/50">
              {product.category || "General"}
            </span>
          </div>
          {isAdmin && (
            <button
              onClick={() => onEdit(product)}
              className="absolute top-2 right-2 p-1.5 rounded-lg bg-white/90 backdrop-blur-xs text-slate-500 hover:text-blue-600 shadow-2xs transition-colors"
            >
              <EditIcon className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <div className="space-y-1">
          <p className="text-[11px] font-mono text-slate-400 font-semibold">
            {product.sku}
          </p>
          <h3 className="font-bold text-sm text-slate-800 leading-snug break-words group-hover:text-blue-600 transition-colors">
            {product.name}
          </h3>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-[10px] text-slate-400 font-medium">Harga Jual</p>
            <p className="text-sm font-black text-blue-600">
              {formatRupiah(product.sale_price)}
            </p>
          </div>
          <span
            className={`text-[10px] font-bold px-2.5 py-1 rounded-lg inline-flex items-center gap-1 shrink-0 ${
              isOutOfStock
                ? "bg-red-50 text-red-600 border border-red-100"
                : isLowStock
                  ? "bg-amber-50 text-amber-700 border border-amber-100"
                  : "bg-emerald-50 text-emerald-700 border border-emerald-100"
            }`}
          >
            {isOutOfStock ? (
              <>
                <AlertTriangle className="h-3 w-3" /> Habis
              </>
            ) : (
              `Stok: ${product.current_stock} ${product.unit}`
            )}
          </span>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <Button
            variant="primary"
            size="sm"
            onClick={() => onAdjust(product)}
            className="flex-1 text-xs py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
          >
            Atur Stok
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onMovements(product)}
            className="px-2.5 py-2 text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl"
          >
            <History className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// =========================================================================
// 4. Komponen Utama: ProductsPage
// =========================================================================
export function ProductsPage() {
  const toast = useToast();
  const { refresh: refreshNotifications } = useNotifications();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 200);
  const [page, setPage] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [viewMode, setViewMode] = useState<"GRID" | "TABLE">("TABLE");

  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  const {
    products: data,
    lastPage,
    total,
    isLoading: loading,
    error: loadError,
    createProduct,
    updateProduct,
    adjustStock,
  } = useProducts({
    search: debouncedSearch || undefined,
    page,
    per_page: 12,
    include_cost: 1,
  });

  const error = loadError
    ? (loadError as { message?: string }).message || "Gagal memuat produk."
    : null;

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  const [adjustTarget, setAdjustTarget] = useState<Product | null>(null);
  const [adjustSaving, setAdjustSaving] = useState(false);

  const [moveTarget, setMoveTarget] = useState<Product | null>(null);

  const { movements, isLoading: moveLoading } = useProductMovements(
    moveTarget?.id ?? 0,
    { per_page: 20 },
  );

  const filteredProducts = useMemo<ProductWithRowIndex[]>(() => {
    const filtered =
      selectedCategory === "ALL"
        ? data
        : data.filter(
            (p) => p.category?.toUpperCase() === selectedCategory.toUpperCase(),
          );

    return filtered.map((item, idx) => ({
      ...item,
      rowIndex: (page - 1) * 12 + idx + 1,
    }));
  }, [data, selectedCategory, page]);

  const closeFormModal = () => {
    if (form.imagePreview && form.imagePreview.startsWith("blob:")) {
      URL.revokeObjectURL(form.imagePreview);
    }
    setForm(emptyForm);
    setFormOpen(false);
  };

  const openCreate = () => {
    closeFormModal();
    setForm(emptyForm);
    setFormOpen(true);
  };

  const openEdit = (p: Product) => {
    closeFormModal();
    setForm({
      id: p.id,
      sku: p.sku,
      name: p.name,
      category: p.category || "",
      brand: p.brand || "",
      unit: p.unit,
      purchase_price: String(p.purchase_price),
      sale_price: String(p.sale_price),
      min_stock: String(p.min_stock),
      is_active: p.is_active,
      image: null,
      imagePreview: p.image || null,
    });
    setFormOpen(true);
  };

  const save = async () => {
    if (!form.sku.trim() || !form.name.trim()) {
      toast.error("SKU dan nama wajib diisi.");
      return;
    }
    setSaving(true);
    try {
      if (form.id) {
        const payload: Partial<ProductPayload> = {
          sku: form.sku,
          name: form.name,
          category: form.category || undefined,
          brand: form.brand || undefined,
          unit: form.unit,
          purchase_price: Number(form.purchase_price),
          sale_price: Number(form.sale_price),
          min_stock: Number(form.min_stock),
          is_active: form.is_active,
        };
        if (form.image) {
          payload.image = form.image;
        }
        await updateProduct({ id: form.id, payload });
        toast.success("Produk diperbarui.");
      } else {
        await createProduct({
          sku: form.sku,
          name: form.name,
          category: form.category || undefined,
          brand: form.brand || undefined,
          unit: form.unit,
          purchase_price: Number(form.purchase_price),
          sale_price: Number(form.sale_price),
          min_stock: Number(form.min_stock),
          is_active: form.is_active,
          image: form.image,
        });
        toast.success("Produk dibuat.");
      }
      closeFormModal();
      refreshNotifications();
    } catch (e) {
      const err = e as { message?: string; errors?: Record<string, string[]> };
      if (err.errors) {
        const errorMessages = Object.entries(err.errors)
          .map(([field, messages]) => `${field}: ${messages.join(", ")}`)
          .join("; ");
        toast.error(errorMessages || err.message || "Gagal menyimpan produk.");
      } else {
        toast.error(err.message || "Gagal menyimpan produk.");
      }
    } finally {
      setSaving(false);
    }
  };

  const doAdjust = async (
    type: "PURCHASE" | "ADJUSTMENT",
    adjustQuantity: string,
    adjustNote: string,
  ) => {
    if (!adjustTarget) return;
    let quantity = Number(adjustQuantity);

    if (!Number.isInteger(quantity) || quantity === 0) {
      toast.error("Jumlah harus berupa angka bulat dan tidak boleh nol.");
      return;
    }

    if (quantity < 0) {
      toast.error("Masukkan angka positif saja, tanpa tanda minus.");
      return;
    }

    if (type === "ADJUSTMENT") {
      quantity = -Math.abs(quantity);
    }

    if (type === "ADJUSTMENT" && adjustTarget.current_stock + quantity < 0) {
      toast.error("Stok tidak cukup untuk dikurangi sebanyak itu.");
      return;
    }

    if (!adjustNote.trim()) {
      toast.error("Catatan wajib diisi.");
      return;
    }

    setAdjustSaving(true);
    try {
      await adjustStock({
        id: adjustTarget.id,
        payload: {
          type,
          quantity,
          note: adjustNote.trim(),
        },
      });
      toast.success(
        type === "PURCHASE"
          ? "Stok berhasil ditambahkan!"
          : "Stok berhasil dikurangi!",
      );
      setAdjustTarget(null);
      refreshNotifications();
    } catch (e) {
      const err = e as { message?: string };
      toast.error(err.message || "Gagal menyesuaikan stok.");
    } finally {
      setAdjustSaving(false);
    }
  };

  const openAdjust = (p: Product) => {
    setAdjustTarget(p);
  };

  const openMovements = (p: Product) => {
    setMoveTarget(p);
  };

  // Kolom Tabel Desktop
  const columns: Column<ProductWithRowIndex>[] = [
    {
      key: "no",
      label: "NO",
      render: (r) => (
        <span className="font-semibold text-xs text-slate-400 px-1">
          {r.rowIndex}
        </span>
      ),
    },
    {
      key: "sku",
      label: "SKU",
      render: (r) => (
        <div className="flex items-center gap-2.5 min-w-[120px]">
          <div className="h-8 w-8 overflow-hidden rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center shrink-0">
            {r.image ? (
              <img
                src={r.image}
                alt={r.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <Package className="h-3.5 w-3.5 text-slate-300" />
            )}
          </div>
          <span className="font-mono text-xs font-semibold text-slate-700 whitespace-nowrap">
            {r.sku}
          </span>
        </div>
      ),
    },
    {
      key: "name",
      label: "NAMA",
      render: (r) => (
        <span className="font-bold text-xs text-slate-800 leading-normal block break-words min-w-[140px]">
          {r.name}
        </span>
      ),
    },
    {
      key: "category",
      label: "KATEGORI",
      render: (r) => (
        <span className="text-xs text-slate-600 font-medium whitespace-nowrap">
          {r.category || "-"}
        </span>
      ),
    },
    {
      key: "sale_price",
      label: "HARGA JUAL",
      render: (r) => (
        <span className="font-bold text-xs text-blue-600 whitespace-nowrap">
          {formatRupiah(r.sale_price)}
        </span>
      ),
    },
    {
      key: "stock",
      label: "STOK",
      render: (r) => (
        <span
          className={`text-xs font-bold px-2.5 py-1 rounded-md inline-block whitespace-nowrap ${
            r.current_stock <= 0
              ? "bg-red-50 text-red-600 border border-red-100"
              : r.current_stock <= r.min_stock
                ? "bg-amber-50 text-amber-700 border border-amber-100"
                : "bg-emerald-50 text-emerald-700 border border-emerald-100"
          }`}
        >
          {r.current_stock} {r.unit}
        </span>
      ),
    },
    {
      key: "is_active",
      label: "STATUS",
      render: (r) =>
        r.is_active ? (
          <Badge tone="success">Aktif</Badge>
        ) : (
          <Badge tone="neutral">Nonaktif</Badge>
        ),
    },
    {
      key: "actions",
      label: "AKSI",
      render: (r) => (
        <div className="flex items-center gap-1.5 whitespace-nowrap">
          <Button
            variant="primary"
            size="sm"
            onClick={() => openAdjust(r)}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs px-2.5 py-1 shadow-xs"
          >
            Atur Stok
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => openMovements(r)}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs px-2.5 py-1"
          >
            Riwayat
          </Button>
          {isAdmin && (
            <button
              className="rounded-lg p-1 text-slate-400 hover:text-blue-600 hover:bg-slate-100 transition-colors"
              onClick={() => openEdit(r)}
            >
              <EditIcon className="h-4 w-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4 font-sans text-slate-800">
      <PageHeader
        actions={
          isAdmin ? (
            <Button
              onClick={openCreate}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs"
            >
              <PlusIcon className="h-4 w-4" />
              Produk Baru
            </Button>
          ) : undefined
        }
      />

      {/* Control Panel Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama atau SKU produk..."
            className="w-full rounded-xl border border-slate-200/80 bg-white py-2 pl-10 pr-4 text-xs font-medium text-slate-800 shadow-2xs placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
          <div className="bg-white p-1 rounded-xl border border-slate-200/80 flex gap-1 shadow-2xs overflow-x-auto hide-scrollbar">
            {CATEGORY_FILTERS.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                  selectedCategory === cat.id
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="bg-white p-1 rounded-xl border border-slate-200/80 flex gap-1 shadow-2xs">
            <button
              onClick={() => setViewMode("GRID")}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === "GRID"
                  ? "bg-slate-100 text-blue-600"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("TABLE")}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === "TABLE"
                  ? "bg-slate-100 text-blue-600"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={() => setPage(page)} />
      ) : (
        <>
          {filteredProducts.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200/80 text-slate-400 space-y-2">
              <Package className="h-10 w-10 mx-auto stroke-[1.5] text-slate-300" />
              <p className="text-xs font-medium">Produk tidak ditemukan.</p>
            </div>
          ) : viewMode === "GRID" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredProducts.map((p) => (
                <ProductCardItem
                  key={p.id}
                  product={p}
                  isAdmin={isAdmin}
                  onEdit={openEdit}
                  onAdjust={openAdjust}
                  onMovements={openMovements}
                />
              ))}
            </div>
          ) : (
            <>
              {/* Mobile Card List (< 1024px) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:hidden">
                {filteredProducts.map((p) => (
                  <MobileProductCard
                    key={p.id}
                    product={p}
                    isAdmin={isAdmin}
                    onEdit={openEdit}
                    onAdjust={openAdjust}
                    onMovements={openMovements}
                  />
                ))}
              </div>

              {/* Desktop Table (>= 1024px) */}
              <div className="hidden lg:block bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
                <DataTable
                  columns={columns}
                  data={filteredProducts}
                  keyExtractor={(r) => r.id}
                />
              </div>
            </>
          )}

          <Pagination
            currentPage={page}
            lastPage={lastPage}
            total={total}
            onPageChange={setPage}
          />
        </>
      )}

      {/* Modal Form Tambah/Edit Produk */}
      <Modal
        open={formOpen}
        onClose={closeFormModal}
        title={form.id ? "Edit Produk" : "Produk Baru"}
        size="lg"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={closeFormModal}
              disabled={saving}
            >
              Batal
            </Button>
            <Button onClick={save} loading={saving}>
              Simpan
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="SKU / Kode"
            name="sku"
            value={form.sku}
            onChange={(e) => setForm({ ...form, sku: e.target.value })}
          />
          <Input
            label="Nama Produk"
            name="name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <Input
            label="Kategori"
            name="category"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          />
          <Input
            label="Merek"
            name="brand"
            value={form.brand}
            onChange={(e) => setForm({ ...form, brand: e.target.value })}
          />
          <Select
            label="Satuan"
            name="unit"
            value={form.unit}
            onChange={(e) => setForm({ ...form, unit: e.target.value })}
            options={["pcs", "botol", "set", "liter", "pasang"].map((u) => ({
              value: u,
              label: u,
            }))}
          />
          <Input
            label="Harga Beli"
            name="purchase_price"
            type="number"
            min={0}
            value={form.purchase_price}
            onChange={(e) =>
              setForm({ ...form, purchase_price: e.target.value })
            }
          />
          <Input
            label="Harga Jual"
            name="sale_price"
            type="number"
            min={0}
            value={form.sale_price}
            onChange={(e) => setForm({ ...form, sale_price: e.target.value })}
          />
          <Input
            label="Stok Minimum"
            name="min_stock"
            type="number"
            min={0}
            value={form.min_stock}
            onChange={(e) => setForm({ ...form, min_stock: e.target.value })}
          />
          <Select
            label="Status"
            name="is_active"
            value={String(form.is_active)}
            onChange={(e) =>
              setForm({ ...form, is_active: e.target.value === "true" })
            }
            options={[
              { value: "true", label: "Aktif" },
              { value: "false", label: "Nonaktif" },
            ]}
          />
          <div>
            <Input
              label="Foto Produk"
              name="image"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={async (e) => {
                const file = e.target.files?.[0] || null;
                if (!file) {
                  setForm({ ...form, image: null, imagePreview: null });
                  return;
                }

                try {
                  const resizedFile = await resizeImage(file, 1024, 1024);
                  if (
                    form.imagePreview &&
                    form.imagePreview.startsWith("blob:")
                  ) {
                    URL.revokeObjectURL(form.imagePreview);
                  }
                  const preview = URL.createObjectURL(resizedFile);
                  setForm({
                    ...form,
                    image: resizedFile,
                    imagePreview: preview,
                  });
                } catch {
                  toast.error("Gagal memproses gambar. Silakan coba lagi.");
                  setForm({ ...form, image: null, imagePreview: null });
                }
              }}
            />
          </div>
          {form.imagePreview && (
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-slate-500">
                Preview
              </label>
              <img
                src={form.imagePreview}
                alt="Preview"
                className="h-32 w-32 rounded-xl border border-slate-200 object-cover"
              />
            </div>
          )}
        </div>
      </Modal>

      {/* Modal Atur Stok */}
      <StockAdjustmentModal
        product={adjustTarget}
        onClose={() => setAdjustTarget(null)}
        onSave={doAdjust}
        saving={adjustSaving}
      />

      {/* Modal Riwayat Stok Sesuai Referensi Gambar */}
      <StockHistoryModal
        product={moveTarget}
        movements={movements}
        loading={moveLoading}
        onClose={() => setMoveTarget(null)}
      />
    </div>
  );
}
