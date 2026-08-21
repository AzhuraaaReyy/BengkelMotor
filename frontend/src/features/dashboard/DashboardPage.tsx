import { useCallback, useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getDashboardApi } from "@/lib/api/dashboard";
import type { DashboardData } from "@/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Card } from "@/components/ui/Card";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatRupiah, formatNumber, formatDateTime } from "@/lib/formatters";
import { SALE_STATUS_LABEL } from "@/lib/constants";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { Sale } from "@/types";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Link } from "react-router-dom";

export function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const d = await getDashboardApi();
      setData(d);
    } catch (e) {
      const err = e as { message?: string };
      setError(err.message || "Gagal memuat dashboard.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <LoadingState label="Memuat dashboard..." />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!data)
    return <ErrorState message="Tidak ada data dashboard." onRetry={load} />;

  const {
    kpi,
    revenue_series,
    revenue_breakdown,
    top_products,
    top_services,
    low_stock,
    recent_sales,
    recent_voids,
  } = data;

  return (
    <div>
      <PageHeader
        actions={
          <Button variant="secondary" size="sm" onClick={load}>
            Segarkan
          </Button>
        }
      />

      {/* KPI Cards (Design.md §4.1) */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <StatCard
          label="Omzet Hari Ini"
          value={formatRupiah(kpi.today_revenue)}
          tone="success"
        />
        <StatCard
          label="Transaksi Hari Ini"
          value={formatNumber(kpi.today_transactions)}
        />
        <StatCard
          label="Servis Hari Ini"
          value={formatNumber(kpi.today_service_orders)}
        />
        <StatCard
          label="Pengeluaran Hari Ini"
          value={formatRupiah(kpi.today_expenses)}
          tone="warning"
        />
        <StatCard
          label="Estimasi Hasil Usaha"
          value={formatRupiah(kpi.estimated_result)}
          hint="Periode dipilih"
          tone={kpi.estimated_result >= 0 ? "success" : "danger"}
        />
        <StatCard
          label="Stok Rendah"
          value={formatNumber(kpi.low_stock_count)}
          tone="danger"
        />
      </div>

      {/* Charts (Design.md §4.2) */}
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card
          title="Grafik Omzet Harian"
          description="Periode berjalan"
          className="lg:col-span-2"
        >
          {revenue_series.length === 0 ? (
            <EmptyState title="Belum ada data omzet" />
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenue_series}>
                  <defs>
                    <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="date"
                    fontSize={12}
                    tick={{ fill: "#6b7280" }}
                  />
                  <YAxis fontSize={12} tick={{ fill: "#6b7280" }} width={70} />
                  <Tooltip formatter={(v) => formatRupiah(Number(v))} />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#2563eb"
                    fill="url(#rev)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card title="Breakdown Penjualan">
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-control bg-surface-2 p-3">
              <div>
                <p className="text-sm font-medium text-text-primary">
                  Produk / Sparepart
                </p>
                <p className="text-xs text-text-secondary">Penjualan barang</p>
              </div>
              <p className="text-lg font-bold text-text-primary">
                {formatRupiah(revenue_breakdown.products)}
              </p>
            </div>
            <div className="flex items-center justify-between rounded-control bg-surface-2 p-3">
              <div>
                <p className="text-sm font-medium text-text-primary">
                  Jasa Servis
                </p>
                <p className="text-xs text-text-secondary">Pendapatan jasa</p>
              </div>
              <p className="text-lg font-bold text-text-primary">
                {formatRupiah(revenue_breakdown.services)}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Operational lists (Design.md §4.3) */}
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card title="Produk Terlaris">
          {top_products.length === 0 ? (
            <EmptyState title="Belum ada data" />
          ) : (
            <ul className="space-y-3">
              {top_products.map((p) => (
                <li
                  key={p.product_id}
                  className="flex items-center justify-between"
                >
                  <div>
                    <p className="text-sm font-medium text-text-primary">
                      {p.name}
                    </p>
                    <p className="text-xs text-text-secondary">
                      {formatNumber(p.total_qty)} terjual
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-text-primary">
                    {formatRupiah(p.total_revenue)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Jasa Terlaris">
          {top_services.length === 0 ? (
            <EmptyState title="Belum ada data" />
          ) : (
            <ul className="space-y-3">
              {top_services.map((s) => (
                <li
                  key={s.service_id}
                  className="flex items-center justify-between"
                >
                  <p className="text-sm font-medium text-text-primary">
                    {s.name}
                  </p>
                  <p className="text-sm font-semibold text-text-primary">
                    {formatNumber(s.total_qty)}x
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card
          title="Stok Rendah"
          actions={
            <Link to="/produk" className="text-xs text-primary hover:underline">
              Kelola stok
            </Link>
          }
        >
          {low_stock.length === 0 ? (
            <EmptyState title="Semua stok aman" />
          ) : (
            <ul className="space-y-3">
              {low_stock.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between rounded-control bg-warning-subtle px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-medium text-text-primary">
                      {p.name}
                    </p>
                    <p className="text-xs text-text-secondary">{p.sku}</p>
                  </div>
                  <Badge tone="danger">
                    Stok {formatNumber(p.current_stock)} /{" "}
                    {formatNumber(p.min_stock)}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <RecentSalesList sales={recent_sales} />
        <RecentVoidsList voids={recent_voids} />
      </div>
    </div>
  );
}

function RecentSalesList({ sales }: { sales: Sale[] }) {
  return (
    <Card title="Transaksi Terbaru">
      {sales.length === 0 ? (
        <EmptyState title="Belum ada transaksi hari ini" />
      ) : (
        <ul className="divide-y divide-border">
          {sales.map((s) => (
            <li key={s.id} className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium text-text-primary">
                  {s.sale_code}
                </p>
                <p className="text-xs text-text-secondary">
                  {s.cashier?.name} · {formatDateTime(s.paid_at)}
                </p>
              </div>
              <Badge
                tone={
                  s.status === "PAID"
                    ? "success"
                    : s.status === "VOID"
                      ? "danger"
                      : "warning"
                }
              >
                {SALE_STATUS_LABEL[s.status]}
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function RecentVoidsList({ voids }: { voids: Sale[] }) {
  const [target, setTarget] = useState<Sale | null>(null);

  if (voids.length === 0)
    return (
      <Card title="Void Terbaru">
        <EmptyState title="Tidak ada transaksi dibatalkan" />
      </Card>
    );

  return (
    <>
      <Card title="Void Terbaru">
        <ul className="divide-y divide-border">
          {voids.map((s) => (
            <li key={s.id} className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium text-text-primary">
                  {s.sale_code}
                </p>
                <p className="text-xs text-text-secondary">
                  {s.void_reason || "Dibatalkan"} ·{" "}
                  {formatDateTime(s.voided_at)}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setTarget(s)}>
                Detail
              </Button>
            </li>
          ))}
        </ul>
      </Card>

      <ConfirmDialog
        open={!!target}
        title="Detail Void"
        message={
          target
            ? `Transaksi ${target.sale_code} (${formatRupiah(target.grand_total)}) dibatalkan dengan alasan: ${target.void_reason}`
            : ""
        }
        confirmLabel="Tutup"
        cancelLabel="Batal"
        onConfirm={() => setTarget(null)}
        onCancel={() => setTarget(null)}
      />
    </>
  );
}
