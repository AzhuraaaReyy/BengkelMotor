import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { SearchInput } from "@/components/ui/SearchInput";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Pagination } from "@/components/ui/Pagination";
import { SaleStatusBadge } from "@/components/ui/badges";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/app/auth/AuthContext";
import { getSalesApi, getSaleApi, voidSaleApi } from "@/lib/api/sales";
import { formatRupiah, formatDateTime, formatNumber } from "@/lib/formatters";
import { SALE_STATUS_LABEL, PAYMENT_LABEL } from "@/lib/constants";
import { ReceiptView } from "@/features/pos/ReceiptView";
import type { Sale } from "@/types";

export function SalesHistoryPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const isAdmin = hasRole("ADMIN");

  const [data, setData] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);

  const [detail, setDetail] = useState<Sale | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [voidTarget, setVoidTarget] = useState<Sale | null>(null);
  const [voidReason, setVoidReason] = useState("");
  const [voidLoading, setVoidLoading] = useState(false);
  const [receiptSale, setReceiptSale] = useState<Sale | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getSalesApi({
        search: search || undefined,
        status: status || undefined,
        page,
        per_page: 10,
      });
      setData(res.data);
      setLastPage(res.last_page);
      setTotal(res.total);
    } catch (e) {
      const err = e as { message?: string };
      setError(err.message || "Gagal memuat riwayat transaksi.");
    } finally {
      setLoading(false);
    }
  }, [search, status, page]);

  useEffect(() => {
    load();
  }, [load]);

  const openDetail = async (sale: Sale) => {
    setDetail(sale);
    setDetailLoading(true);
    try {
      const full = await getSaleApi(sale.id);
      setDetail(full);
    } catch (e) {
      const err = e as { message?: string };
      toast.error(err.message || "Gagal memuat detail transaksi.");
    } finally {
      setDetailLoading(false);
    }
  };

  const openVoid = (sale: Sale) => {
    setVoidReason("");
    setVoidTarget(sale);
  };

  const confirmVoid = async () => {
    if (!voidTarget) return;
    if (!voidReason.trim()) {
      toast.error("Alasan void wajib diisi.");
      return;
    }
    setVoidLoading(true);
    try {
      await voidSaleApi(voidTarget.id, voidReason.trim());
      toast.success(`Transaksi ${voidTarget.sale_code} berhasil di-void.`);
      setVoidTarget(null);
      setDetail(null);
      load();
    } catch (e) {
      const err = e as { message?: string };
      toast.error(err.message || "Gagal membatalkan transaksi.");
    } finally {
      setVoidLoading(false);
    }
  };

  const columns: Column<Sale>[] = [
    {
      key: "sale_code",
      label: "Kode",
      render: (r) => (
        <span className="font-medium text-text-primary">{r.sale_code}</span>
      ),
    },
    {
      key: "paid_at",
      label: "Tanggal",
      render: (r) => (r.paid_at ? formatDateTime(r.paid_at) : "-"),
    },
    {
      key: "cashier",
      label: "Kasir",
      render: (r) => r.cashier?.name || "-",
    },
    {
      key: "customer",
      label: "Pelanggan",
      render: (r) => r.customer?.name || "-",
    },
    {
      key: "payment_method",
      label: "Pembayaran",
      render: (r) => (r.payment_method ? PAYMENT_LABEL[r.payment_method] : "-"),
    },
    {
      key: "grand_total",
      label: "Total",
      render: (r) => (
        <span className="font-semibold text-text-primary">
          {formatRupiah(r.grand_total)}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (r) => <SaleStatusBadge status={r.status} />,
    },
    {
      key: "actions",
      label: "Aksi",
      render: (r) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => openDetail(r)}>
            Detail
          </Button>
          {r.status === "PENDING" && (
            <Button variant="primary" size="sm" onClick={() => navigate(`/pos?resume_payment=${r.id}`)}>
              Lanjutkan Pembayaran
            </Button>
          )}
          {r.status === "PAID" && (
            <Button variant="ghost" size="sm" onClick={() => setReceiptSale(r)}>
              Cetak Struk
            </Button>
          )}
          {isAdmin && r.status === "PAID" && (
            <Button variant="danger" size="sm" onClick={() => openVoid(r)}>
              Void
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <Card className="mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="w-64">
            <SearchInput
              value={search}
              onChange={(v) => {
                setSearch(v);
                setPage(1);
              }}
              placeholder="Cari kode transaksi..."
            />
          </div>
          <div className="w-44">
            <Select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              options={[
                { value: "", label: "Semua Status" },
                ...(["DRAFT", "PENDING", "PAID", "EXPIRED", "VOID"] as const).map((s) => ({
                  value: s,
                  label: SALE_STATUS_LABEL[s],
                })),
              ]}
            />
          </div>
        </div>
      </Card>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : data.length === 0 ? (
        <Card>
          <EmptyState
            title="Belum ada transaksi"
            description="Transaksi yang dibuat lewat POS akan muncul di sini."
          />
        </Card>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden lg:block">
            <DataTable
              columns={columns}
              data={data}
              keyExtractor={(r) => r.id}
            />
          </div>

          {/* Mobile & tablet cards */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:hidden">
            {data.map((s) => (
              <div key={s.id} className="card space-y-3 p-4">
                <div className="flex items-start justify-between gap-2 border-b border-border pb-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-text-primary">
                      {s.sale_code}
                    </p>
                    <p className="text-xs text-text-secondary">
                      {s.paid_at ? formatDateTime(s.paid_at) : "-"}
                    </p>
                  </div>
                  <SaleStatusBadge status={s.status} />
                </div>
                <div className="flex items-center justify-between gap-2 text-xs text-text-secondary">
                  <div className="min-w-0">
                    <p className="truncate">Kasir: {s.cashier?.name || "-"}</p>
                    <p className="truncate">Pelanggan: {s.customer?.name || "-"}</p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold text-text-primary">
                    {formatRupiah(s.grand_total)}
                  </p>
                </div>
                <div className="flex items-center justify-between gap-2 border-t border-border pt-2">
                  <span className="rounded-control bg-surface-2 px-2 py-0.5 text-xs text-text-secondary">
                    {s.payment_method ? PAYMENT_LABEL[s.payment_method] : "-"}
                  </span>
                  <div className="flex shrink-0 gap-1">
                    <Button variant="ghost" size="sm" onClick={() => openDetail(s)}>
                      Detail
                    </Button>
                    {s.status === "PENDING" && (
                      <Button variant="primary" size="sm" onClick={() => navigate(`/pos?resume_payment=${s.id}`)}>
                        Lanjutkan
                      </Button>
                    )}
                    {s.status === "PAID" && (
                      <Button variant="ghost" size="sm" onClick={() => setReceiptSale(s)}>
                        Cetak
                      </Button>
                    )}
                    {isAdmin && s.status === "PAID" && (
                      <Button variant="danger" size="sm" onClick={() => openVoid(s)}>
                        Void
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <Pagination
            currentPage={page}
            lastPage={lastPage}
            total={total}
            onPageChange={setPage}
          />
        </>
      )}

      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail ? `Transaksi ${detail.sale_code}` : ""}
        size="lg"
      >
        {detail && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
              <div>
                <p className="text-text-secondary">Status</p>
                <SaleStatusBadge status={detail.status} />
              </div>
              <div>
                <p className="text-text-secondary">Kasir</p>
                <p className="font-medium text-text-primary">
                  {detail.cashier?.name || "-"}
                </p>
              </div>
              <div>
                <p className="text-text-secondary">Pelanggan</p>
                <p className="font-medium text-text-primary">
                  {detail.customer?.name || "-"}
                </p>
              </div>
              <div>
                <p className="text-text-secondary">Metode Pembayaran</p>
                <p className="font-medium text-text-primary">
                  {detail.payment_method
                    ? PAYMENT_LABEL[detail.payment_method]
                    : "-"}
                </p>
              </div>
              <div>
                <p className="text-text-secondary">Waktu Bayar</p>
                <p className="font-medium text-text-primary">
                  {detail.paid_at ? formatDateTime(detail.paid_at) : "-"}
                </p>
              </div>
            </div>

            {detail.status === "VOID" && (
              <div className="rounded-control bg-danger-subtle px-3 py-2 text-sm text-danger">
                Dibatalkan: {detail.void_reason}
                {detail.voided_at && ` · ${formatDateTime(detail.voided_at)}`}
              </div>
            )}

            {detailLoading ? (
              <LoadingState />
            ) : (
              <div className="divide-y divide-border rounded-control border border-border">
                {(detail.items || []).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between px-3 py-2 text-sm"
                  >
                    <div>
                      <p className="font-medium text-text-primary">
                        {item.item_name_snapshot}
                      </p>
                      <p className="text-xs text-text-secondary">
                        {formatNumber(item.quantity)} x{" "}
                        {formatRupiah(item.unit_price)}
                      </p>
                    </div>
                    <p className="font-semibold text-text-primary">
                      {formatRupiah(item.subtotal)}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-1 border-t border-border pt-3 text-sm">
              <div className="flex justify-between">
                <span className="text-text-secondary">Subtotal</span>
                <span>{formatRupiah(detail.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Diskon</span>
                <span>{formatRupiah(detail.discount_amount)}</span>
              </div>
              <div className="flex justify-between text-base font-bold text-text-primary">
                <span>Total</span>
                <span>{formatRupiah(detail.grand_total)}</span>
              </div>
            </div>

            {detail.status === "PAID" && (
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setReceiptSale(detail)}>
                  Cetak Struk
                </Button>
                {isAdmin && (
                  <Button variant="danger" onClick={() => openVoid(detail)}>
                    Void Transaksi
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!voidTarget}
        title={`Void Transaksi ${voidTarget?.sale_code ?? ""}?`}
        message="Stok sparepart dari transaksi ini akan dikembalikan. Tindakan ini tidak dapat dibatalkan."
        confirmLabel="Void Transaksi"
        danger
        loading={voidLoading}
        onConfirm={confirmVoid}
        onCancel={() => setVoidTarget(null)}
        extra={
          <Input
            label="Alasan"
            name="void_reason"
            value={voidReason}
            onChange={(e) => setVoidReason(e.target.value)}
            placeholder="Contoh: Pelanggan salah bayar"
          />
        }
      />

      <Modal
        open={!!receiptSale}
        onClose={() => setReceiptSale(null)}
        title="Struk Pembayaran"
        size="lg"
      >
        {receiptSale && (
          <ReceiptView
            sale={receiptSale}
            onClose={() => setReceiptSale(null)}
            customerName={receiptSale.customer?.name ?? ""}
          />
        )}
      </Modal>
    </div>
  );
}
