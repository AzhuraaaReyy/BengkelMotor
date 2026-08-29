import { useState, useMemo } from "react";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import {
  Package,
  History,
  ArrowUpCircle,
  ArrowDownCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
} from "lucide-react";
import { formatQuantity, formatDateTime } from "@/lib/formatters";
import { STOCK_MOVEMENT_LABEL } from "@/lib/constants";
import type { Product, StockMovement } from "@/types";

interface HistoryProductPageProps {
  product: Product | null;
  movements: StockMovement[];
  loading: boolean;
  onBack: () => void;
}

const ITEMS_PER_PAGE = 10;

export function HistoryProductPage({
  product,
  movements,
  loading,
  onBack,
}: HistoryProductPageProps) {
  const [currentPage, setCurrentPage] = useState(1);

  const filteredMovements = useMemo(() => {
    return movements || [];
  }, [movements]);

  // Pagination logic
  const totalPages = Math.ceil(filteredMovements.length / ITEMS_PER_PAGE) || 1;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedMovements = filteredMovements.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  if (!product) return null;

  const isLowStock = product.current_stock <= product.min_stock;
  const isOutOfStock = product.current_stock <= 0;
  const lastMovement = movements?.[0];

  return (
    <div className="space-y-6 font-sans text-slate-800 animate-fadeIn">
      {/* Header Halaman & Informasi Produk */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200/80 shadow-2xs space-y-4 sm:space-y-5">
        <div className="flex flex-col gap-3.5">
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="h-14 w-14 sm:h-20 sm:w-20 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-center shrink-0 overflow-hidden shadow-2xs">
              {product.image ? (
                <img
                  src={product.image}
                  alt={product.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <Package className="h-7 w-7 sm:h-10 sm:w-10 text-slate-300" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                    product.is_active
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {product.is_active ? "Aktif" : "Nonaktif"}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  SKU: {product.sku}
                </span>
              </div>
              <h1 className="text-sm sm:text-xl font-bold text-slate-900 leading-snug mt-1 whitespace-normal break-words">
                Riwayat Stok: {product.name}
              </h1>
              <p className="text-xs text-slate-500 font-medium mt-0.5 whitespace-normal break-words">
                Kategori:{" "}
                <strong className="text-slate-700">
                  {product.category || "General"}
                </strong>{" "}
                • Merek:{" "}
                <strong className="text-slate-700">
                  {product.brand || "-"}
                </strong>
              </p>
            </div>
          </div>
        </div>

        {/* 3 Summary Cards Panel */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50/70 p-3.5 sm:p-4 rounded-2xl border border-slate-200/70">
          <div className="flex items-center gap-3 p-2 bg-white sm:bg-transparent rounded-xl border sm:border-0 border-slate-200/60 shadow-2xs sm:shadow-none">
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 shrink-0">
              <Package className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium text-slate-400 leading-tight">
                Stok Saat Ini
              </p>
              <p className="text-sm font-extrabold text-slate-900 mt-0.5 truncate">
                {formatQuantity(product.current_stock)} {product.unit}
              </p>
            </div>
          </div>

          {/* Kartu Gabungan Stok Minimum & Status Stok (Rata tengah khusus mobile, rata kiri di sm ke atas) */}
          <div className="flex items-center justify-between sm:justify-between p-3 bg-white sm:bg-transparent rounded-xl border sm:border-0 border-slate-200/60 shadow-2xs sm:shadow-none text-center sm:text-left">
            <div className="min-w-0 flex-1 sm:flex-initial">
              <p className="text-[11px] font-medium text-slate-400 leading-tight">
                Stok Minimum
              </p>
              <p className="text-sm font-extrabold text-slate-900 mt-0.5 truncate">
                {formatQuantity(product.min_stock)} {product.unit}
              </p>
            </div>
            <div className="flex-1 sm:flex-initial sm:text-right pl-3 sm:pl-2 sm:border-l border-slate-200/80">
              <p className="text-[11px] font-medium text-slate-400 leading-tight">
                Status
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

          <div className="flex items-center gap-3 p-2 bg-white sm:bg-transparent rounded-xl border sm:border-0 border-slate-200/60 shadow-2xs sm:shadow-none">
            <Clock className="h-4 w-4 text-slate-400 shrink-0 self-start mt-0.5" />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium text-slate-400 leading-tight">
                Terakhir Diperbarui
              </p>
              <p className="text-xs font-bold text-slate-800 mt-0.5 whitespace-normal break-words">
                {lastMovement ? formatDateTime(lastMovement.created_at) : "-"}
              </p>
              <p className="text-[10px] text-slate-400 font-medium whitespace-normal break-words">
                Oleh: {lastMovement?.created_by_name || "Sistem"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bagian Daftar Pergerakan Stok */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden p-4 sm:p-6 space-y-4">
        <div>
          <h3 className="font-bold text-sm text-slate-800">
            Daftar Pergerakan Stok
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Semua catatan keluar masuk barang tercatat secara transparan.
          </p>
        </div>

        {loading ? (
          <div className="py-20">
            <LoadingState />
          </div>
        ) : filteredMovements.length === 0 ? (
          <div className="py-20 text-center text-slate-400 space-y-2">
            <History className="h-10 w-10 mx-auto stroke-[1.5] text-slate-300" />
            <p className="text-xs font-medium">
              Tidak ada catatan riwayat pergerakan stok untuk produk ini.
            </p>
          </div>
        ) : (
          <>
            {/* 1. TAMPILAN TABEL (Khusus Tablet & Desktop: hidden md:block) */}
            <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-200/80">
              <table className="w-full text-left text-xs min-w-[700px]">
                <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">ARAH</th>
                    <th className="py-3 px-4">TIPE</th>
                    <th className="py-3 px-4 text-center">PERUBAHAN</th>
                    <th className="py-3 px-4 text-center">
                      STOK (SEBELUM ➔ SESUDAH)
                    </th>
                    <th className="py-3 px-4">PETUGAS & WAKTU</th>
                    <th className="py-3 px-4">KETERANGAN</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {paginatedMovements.map((r) => {
                    const isPositive = r.quantity_change > 0;
                    return (
                      <tr
                        key={r.id}
                        className="hover:bg-slate-50/70 transition-colors align-middle"
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
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5 bg-slate-100/80 px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-700">
                            <span className="text-slate-500">
                              {r.stock_before ?? "-"}
                            </span>
                            <ArrowRight className="h-3 w-3 text-slate-400" />
                            <span className="font-bold text-slate-900">
                              {r.stock_after ?? "-"}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-800 text-xs">
                              {r.created_by_name || "Sistem"}
                            </span>
                            <span className="text-[11px] text-slate-400 mt-0.5">
                              {formatDateTime(r.created_at)}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-600 text-xs whitespace-normal break-words max-w-[250px]">
                          {r.note || "-"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* 2. TAMPILAN CARD MODERN (Khusus Mobile: md:hidden) */}
            <div className="md:hidden space-y-3.5">
              {paginatedMovements.map((r) => {
                const isPositive = r.quantity_change > 0;
                return (
                  <div
                    key={r.id}
                    className="p-4 bg-white border border-slate-200/80 rounded-2xl shadow-2xs space-y-3 relative overflow-hidden"
                  >
                    {/* Aksen garis tepi warna di kiri card */}
                    <div
                      className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                        isPositive ? "bg-emerald-500" : "bg-red-500"
                      }`}
                    ></div>

                    {/* Baris Atas: Badge Arah & Tipe */}
                    <div className="flex items-center justify-between pl-2">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-bold text-[11px] ${
                          isPositive
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {isPositive ? (
                          <ArrowUpCircle className="h-3.5 w-3.5" />
                        ) : (
                          <ArrowDownCircle className="h-3.5 w-3.5" />
                        )}
                        {isPositive ? "Masuk" : "Keluar"}
                      </span>

                      <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 font-bold text-[11px]">
                        {(STOCK_MOVEMENT_LABEL as Record<string, string>)[
                          r.type
                        ] || r.type}
                      </span>
                    </div>

                    {/* Grid Informasi: Perubahan, Sebelum, Sesudah */}
                    <div className="grid grid-cols-3 gap-2 bg-slate-50/80 p-3 rounded-xl border border-slate-100 pl-4 text-center">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Perubahan
                        </span>
                        <span
                          className={`font-black text-xs tabular-nums block mt-1 whitespace-normal break-words ${
                            isPositive ? "text-emerald-600" : "text-red-600"
                          }`}
                        >
                          {isPositive ? "+" : ""}
                          {formatQuantity(r.quantity_change)} {product.unit}
                        </span>
                      </div>

                      <div className="border-x border-slate-200/60 px-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Sebelum
                        </span>
                        <span className="font-bold text-xs text-slate-700 block mt-1 whitespace-normal break-words">
                          {r.stock_before ?? "-"}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Sesudah
                        </span>
                        <span className="font-bold text-xs text-slate-900 block mt-1 whitespace-normal break-words">
                          {r.stock_after ?? "-"}
                        </span>
                      </div>
                    </div>

                    {/* Keterangan / Catatan */}
                    {r.note && (
                      <div className="text-xs text-slate-600 bg-slate-50/50 p-2.5 rounded-xl border border-slate-100/80 pl-4">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Keterangan
                        </span>
                        <p className="mt-0.5 whitespace-normal break-words font-medium">
                          {r.note}
                        </p>
                      </div>
                    )}

                    {/* Baris Bawah: Petugas & Waktu */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-slate-400 pt-2.5 border-t border-slate-100 pl-2 gap-1">
                      <span className="font-bold text-slate-700 whitespace-normal break-words">
                        Oleh: {r.created_by_name || "Sistem"}
                      </span>
                      <span className="whitespace-normal break-words">
                        {formatDateTime(r.created_at)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Footer Halaman / Navigasi & Informasi */}
        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
            <Button
              variant="secondary"
              size="sm"
              onClick={onBack}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 border border-slate-200/80 hover:bg-blue-800 text-white rounded-xl shadow-sm transition-all"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="text-sm font-semibold">Kembali</span>
            </Button>

            <span className="text-xs text-slate-500 whitespace-nowrap">
              Menampilkan {filteredMovements.length > 0 ? startIndex + 1 : 0}-
              {Math.min(endIndex, filteredMovements.length)} dari{" "}
              {filteredMovements.length} riwayat
            </span>
          </div>

          {/* Bagian Pagination (Nomor Halaman) di sebelah kanan */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            {/* Page Numbers */}
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                (page) => {
                  const showPage =
                    page === 1 ||
                    page === totalPages ||
                    (page >= currentPage - 1 && page <= currentPage + 1);

                  const showEllipsis =
                    (page === currentPage - 2 && currentPage > 3) ||
                    (page === currentPage + 2 && currentPage < totalPages - 2);

                  if (showEllipsis) {
                    return (
                      <span key={page} className="px-2 text-slate-400">
                        ...
                      </span>
                    );
                  }

                  if (!showPage) return null;

                  return (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                        currentPage === page
                          ? "bg-blue-600 text-white"
                          : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {page}
                    </button>
                  );
                },
              )}
            </div>

            <button
              onClick={() => handlePageChange(currentPage + 1)}
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
