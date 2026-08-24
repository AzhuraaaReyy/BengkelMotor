import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Pagination } from "@/components/ui/Pagination";
import { DateRangePicker } from "@/components/ui/DateRangePicker";
import { Select } from "@/components/ui/Select";
import { StatCard } from "@/components/ui/StatCard";
import { useToast } from "@/components/ui/Toast";
import {
  getSalesReportApi,
  getServiceReportApi,
  getInventoryReportApi,
  getFinanceReportApi,
  exportReportApi,
  type ExportFormat,
} from "@/lib/api/reports";
import { formatRupiah, formatNumber, formatDateTime } from "@/lib/formatters";
import { DownloadIcon } from "@/components/shared/icons";

type TabKey = "sales" | "services" | "inventory" | "finance";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}
function startOfMonth(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

type AnyRow = Record<string, any>;

const REPORT_PAGE_SIZE = 10;

// Tabel laporan memakai paginasi sisi-klien (10 baris/halaman): payload
// laporan tetap utuh untuk ekspor, hanya tampilan yang dipotong.
function PagedTable<T>({ columns, data, keyExtractor }: {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (r: T) => string | number;
}) {
  const [page, setPage] = useState(1);
  const lastPage = Math.max(1, Math.ceil(data.length / REPORT_PAGE_SIZE));
  const safePage = Math.min(page, lastPage);
  const rows = data.slice((safePage - 1) * REPORT_PAGE_SIZE, safePage * REPORT_PAGE_SIZE);

  return (
    <div>
      <DataTable columns={columns} data={rows} keyExtractor={keyExtractor} />
      <Pagination
        currentPage={safePage}
        lastPage={lastPage}
        total={data.length}
        onPageChange={setPage}
      />
    </div>
  );
}

// Backend response shapes (App\Services\Reports\ReportQueryService):
// sales:    { summary: {transactions,revenue,discount,product_sales,service_sales,voided}, payment_methods: [{method,count,total}], transactions: [...] }
// services: { summary: {total_orders,by_status,service_revenue}, top_services: [{service_name,count,total}], orders: [...], by_mechanic }
// inventory:{ summary: {total_products,low_stock_count,inventory_value}, low_stock: [...], products: [...], top_sold: [{name,quantity}] }
// finance:  { summary: {revenue,cogs,expenses,estimated_result}, expenses: [...] }

export function ReportsPage() {
  const toast = useToast();
  const [tab, setTab] = useState<TabKey>("sales");
  const [from, setFrom] = useState(startOfMonth());
  const [to, setTo] = useState(today());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exportFormat, setExportFormat] = useState<ExportFormat>("xlsx");
  const [exporting, setExporting] = useState(false);

  const [sales, setSales] = useState<AnyRow | null>(null);
  const [services, setServices] = useState<AnyRow | null>(null);
  const [inventory, setInventory] = useState<AnyRow | null>(null);
  const [finance, setFinance] = useState<AnyRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (tab === "sales") setSales(await getSalesReportApi({ from, to }));
      else if (tab === "services")
        setServices(await getServiceReportApi({ from, to }));
      else if (tab === "inventory")
        setInventory(await getInventoryReportApi({ from, to }));
      else if (tab === "finance")
        setFinance(await getFinanceReportApi({ from, to }));
    } catch (e) {
      const err = e as { message?: string };
      setError(err.message || "Gagal memuat laporan.");
    } finally {
      setLoading(false);
    }
  }, [tab, from, to]);

  useEffect(() => {
    load();
  }, [load]);

  const doExport = async () => {
    setExporting(true);
    try {
      const blob = await exportReportApi(tab, { from, to }, exportFormat);
      const mime =
        exportFormat === "pdf"
          ? "application/pdf"
          : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      const url = URL.createObjectURL(new Blob([blob], { type: mime }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `laporan-${tab}-${from}-${to}.${exportFormat}`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Laporan diekspor.");
    } catch (e) {
      const err = e as { message?: string };
      toast.error(err.message || "Gagal mengekspor.");
    } finally {
      setExporting(false);
    }
  };

  const tabs: { value: TabKey; label: string }[] = [
    { value: "sales", label: "Penjualan" },
    { value: "services", label: "Servis" },
    { value: "inventory", label: "Stok" },
    { value: "finance", label: "Keuangan" },
  ];

  return (
    <div>
      <PageHeader
        actions={
          <div className="flex items-center gap-2">
            <Select
              className="w-28"
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value as ExportFormat)}
              options={[
                { value: "xlsx", label: "Excel" },
                { value: "pdf", label: "PDF" },
              ]}
            />
            <Button onClick={doExport} loading={exporting} variant="secondary">
              <DownloadIcon className="h-4 w-4" />
              Export
            </Button>
          </div>
        }
      />

      <Card className="mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <Select
            className="w-44"
            value={tab}
            onChange={(e) => setTab(e.target.value as TabKey)}
            options={tabs.map((t) => ({ value: t.value, label: t.label }))}
          />
          <DateRangePicker
            from={from}
            to={to}
            onFromChange={setFrom}
            onToChange={setTo}
          />
        </div>
      </Card>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : tab === "sales" ? (
        <SalesReportView data={sales} />
      ) : tab === "services" ? (
        <ServicesReportView data={services} />
      ) : tab === "inventory" ? (
        <InventoryReportView data={inventory} />
      ) : (
        <FinanceReportView data={finance} />
      )}
    </div>
  );
}

function SalesReportView({ data }: { data: AnyRow | null }) {
  if (!data) return null;
  const summary = data.summary || {};
  const paymentMethods: AnyRow[] = data.payment_methods || [];
  const transactions: AnyRow[] = data.transactions || [];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          label="Jumlah Transaksi"
          value={formatNumber(summary.transactions)}
        />
        <StatCard
          label="Omzet"
          value={formatRupiah(summary.revenue)}
          tone="success"
        />
        <StatCard
          label="Diskon"
          value={formatRupiah(summary.discount)}
          tone="danger"
        />
        <StatCard
          label="Total Void"
          value={formatRupiah(summary.voided)}
          tone="warning"
        />
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <Card title="Penjualan Sparepart">
          <p className="text-xl font-bold tabular-nums text-text-primary">
            {formatRupiah(summary.product_sales)}
          </p>
        </Card>
        <Card title="Penjualan Jasa">
          <p className="text-xl font-bold tabular-nums text-text-primary">
            {formatRupiah(summary.service_sales)}
          </p>
        </Card>
        <Card title="Metode Pembayaran">
          {paymentMethods.length === 0 ? (
            <p className="text-sm text-text-secondary">Belum ada data.</p>
          ) : (
            <ul className="space-y-1">
              {paymentMethods.map((pm) => (
                <li key={pm.method} className="flex justify-between text-sm">
                  <span className="text-text-secondary">{pm.method}</span>
                  <span className="tabular-nums text-text-primary">
                    {formatRupiah(pm.total)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card title="Detail Transaksi">
        {transactions.length === 0 ? (
          <p className="py-6 text-center text-sm text-text-secondary">
            Belum ada transaksi pada periode ini.
          </p>
        ) : (
          <PagedTable
            columns={[
              {
                key: "sale_code",
                label: "Kode",
                render: (r: AnyRow) => (
                  <span className="font-mono text-xs">{r.sale_code}</span>
                ),
              },
              {
                key: "paid_at",
                label: "Waktu",
                render: (r: AnyRow) => (r.paid_at ? formatDateTime(r.paid_at) : "-"),
              },
              {
                key: "cashier",
                label: "Kasir",
                render: (r: AnyRow) => r.cashier || "-",
              },
              { key: "status", label: "Status", render: (r: AnyRow) => r.status },
              {
                key: "grand_total",
                label: "Total",
                render: (r: AnyRow) => (
                  <span className="tabular-nums font-semibold">
                    {formatRupiah(r.grand_total)}
                  </span>
                ),
              },
            ]}
            data={transactions}
            keyExtractor={(r: AnyRow) => r.id}
          />
        )}
      </Card>
    </div>
  );
}

function ServicesReportView({ data }: { data: AnyRow | null }) {
  if (!data) return null;
  const summary = data.summary || {};
  const byStatus: AnyRow = summary.by_status || {};
  const topServices: AnyRow[] = data.top_services || [];
  const orders: AnyRow[] = data.orders || [];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card title="Jumlah Order Servis">
          <p className="text-xl font-bold tabular-nums">
            {formatNumber(summary.total_orders ?? 0)}
          </p>
        </Card>
        <Card title="Servis Selesai">
          <p className="text-xl font-bold tabular-nums">
            {formatNumber(byStatus.DONE ?? 0)}
          </p>
        </Card>
        <Card title="Pendapatan Jasa">
          <p className="text-xl font-bold tabular-nums text-success">
            {formatRupiah(summary.service_revenue ?? 0)}
          </p>
        </Card>
      </div>
      <Card title="Jasa Terlaris">
        {topServices.length === 0 ? (
          <p className="py-6 text-center text-sm text-text-secondary">
            Belum ada data.
          </p>
        ) : (
          <PagedTable
            columns={[
              {
                key: "service_name",
                label: "Jasa",
                render: (r: AnyRow) => (
                  <span className="font-medium">{r.service_name}</span>
                ),
              },
              {
                key: "count",
                label: "Jumlah",
                render: (r: AnyRow) => formatNumber(r.count),
              },
              {
                key: "total",
                label: "Pendapatan",
                render: (r: AnyRow) => (
                  <span className="tabular-nums">{formatRupiah(r.total)}</span>
                ),
              },
            ]}
            data={topServices}
            keyExtractor={(r: AnyRow) => r.service_name}
          />
        )}
      </Card>
      <Card title="Daftar Order Servis">
        {orders.length === 0 ? (
          <p className="py-6 text-center text-sm text-text-secondary">
            Belum ada order servis pada periode ini.
          </p>
        ) : (
          <PagedTable
            columns={[
              {
                key: "order_code",
                label: "Kode",
                render: (r: AnyRow) => (
                  <span className="font-mono text-xs">{r.order_code}</span>
                ),
              },
              { key: "customer", label: "Pelanggan", render: (r: AnyRow) => r.customer || "-" },
              { key: "motorcycle_type", label: "Tipe Motor", render: (r: AnyRow) => r.motorcycle_type || "-" },
              { key: "status", label: "Status", render: (r: AnyRow) => r.status },
              {
                key: "opened_at",
                label: "Masuk",
                render: (r: AnyRow) => (r.opened_at ? formatDateTime(r.opened_at) : "-"),
              },
            ]}
            data={orders}
            keyExtractor={(r: AnyRow) => r.id}
          />
        )}
      </Card>
    </div>
  );
}

function InventoryReportView({ data }: { data: AnyRow | null }) {
  if (!data) return null;
  const summary = data.summary || {};
  const topSold: AnyRow[] = data.top_sold || [];
  const lowStock: AnyRow[] = data.low_stock || [];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card title="Total Produk Aktif">
          <p className="text-xl font-bold tabular-nums">
            {formatNumber(summary.total_products ?? 0)}
          </p>
        </Card>
        <Card title="Produk Stok Rendah">
          <p className="text-xl font-bold tabular-nums text-danger">
            {formatNumber(summary.low_stock_count ?? 0)}
          </p>
        </Card>
        <Card title="Nilai Persediaan">
          <p className="text-xl font-bold tabular-nums">
            {formatRupiah(summary.inventory_value ?? 0)}
          </p>
        </Card>
      </div>

      <Card title="Produk Terlaris (periode)">
        {topSold.length === 0 ? (
          <p className="py-6 text-center text-sm text-text-secondary">
            Belum ada data penjualan pada periode ini.
          </p>
        ) : (
          <PagedTable
            columns={[
              {
                key: "name",
                label: "Produk",
                render: (r: AnyRow) => (
                  <span className="font-medium text-text-primary">{r.name}</span>
                ),
              },
              {
                key: "quantity",
                label: "Jumlah Terjual",
                render: (r: AnyRow) => formatNumber(r.quantity),
              },
            ]}
            data={topSold}
            keyExtractor={(r: AnyRow) => r.name}
          />
        )}
      </Card>

      <Card title="Stok Rendah">
        {lowStock.length === 0 ? (
          <p className="py-6 text-center text-sm text-text-secondary">
            Tidak ada produk yang berada di bawah batas minimum.
          </p>
        ) : (
          <PagedTable
            columns={[
              {
                key: "name",
                label: "Produk",
                render: (r: AnyRow) => (
                  <span className="font-medium text-text-primary">{r.name}</span>
                ),
              },
              { key: "sku", label: "SKU", render: (r: AnyRow) => r.sku },
              {
                key: "current_stock",
                label: "Stok",
                render: (r: AnyRow) => formatNumber(r.current_stock),
              },
              {
                key: "min_stock",
                label: "Min. Stok",
                render: (r: AnyRow) => formatNumber(r.min_stock),
              },
            ]}
            data={lowStock}
            keyExtractor={(r: AnyRow) => r.id}
          />
        )}
      </Card>
    </div>
  );
}

function FinanceReportView({ data }: { data: AnyRow | null }) {
  if (!data) return null;
  const summary = data.summary || {};
  const expenses: AnyRow[] = data.expenses || [];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card title="Penjualan Bersih">
          <p className="text-xl font-bold tabular-nums text-success">
            {formatRupiah(summary.revenue)}
          </p>
        </Card>
        <Card title="COGS Produk">
          <p className="text-xl font-bold tabular-nums text-danger">
            {formatRupiah(summary.cogs)}
          </p>
        </Card>
        <Card title="Pengeluaran">
          <p className="text-xl font-bold tabular-nums text-danger">
            {formatRupiah(summary.expenses)}
          </p>
        </Card>
        <Card title="Estimasi Hasil Usaha">
          <p
            className={`text-xl font-bold tabular-nums ${Number(summary.estimated_result) >= 0 ? "text-success" : "text-danger"}`}
          >
            {formatRupiah(summary.estimated_result)}
          </p>
        </Card>
      </div>
      <p className="text-xs text-text-secondary">
        * Estimasi Hasil Usaha = Penjualan Bersih - COGS Produk - Pengeluaran
        tercatat. Ini estimasi, bukan laba akuntansi resmi.
      </p>

      <Card title="Detail Pengeluaran">
        {expenses.length === 0 ? (
          <p className="py-6 text-center text-sm text-text-secondary">
            Belum ada pengeluaran tercatat pada periode ini.
          </p>
        ) : (
          <PagedTable
            columns={[
              {
                key: "expense_date",
                label: "Tanggal",
                render: (r: AnyRow) => r.expense_date,
              },
              { key: "category", label: "Kategori", render: (r: AnyRow) => r.category },
              {
                key: "amount",
                label: "Jumlah",
                render: (r: AnyRow) => (
                  <span className="tabular-nums font-semibold">
                    {formatRupiah(r.amount)}
                  </span>
                ),
              },
              {
                key: "description",
                label: "Keterangan",
                render: (r: AnyRow) => r.description || "-",
              },
              {
                key: "created_by",
                label: "Dicatat Oleh",
                render: (r: AnyRow) => r.created_by || "-",
              },
            ]}
            data={expenses}
            keyExtractor={(r: AnyRow) => r.id}
          />
        )}
      </Card>
    </div>
  );
}
