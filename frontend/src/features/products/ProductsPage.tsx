import { useCallback, useEffect, useState } from "react";
import { useDebouncedValue } from "@/lib/useDebouncedValue";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { SearchInput } from "@/components/ui/SearchInput";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Pagination } from "@/components/ui/Pagination";
import { StockBadge } from "@/components/ui/badges";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import { useNotifications } from "@/lib/useNotifications";
import { useAuth } from "@/app/auth/AuthContext";
import {
  getProductsApi,
  createProductApi,
  updateProductApi,
  adjustStockApi,
  getProductMovementsApi,
} from "@/lib/api/products";
import { formatRupiah, formatQuantity, formatDateTime } from "@/lib/formatters";
import { STOCK_MOVEMENT_LABEL } from "@/lib/constants";
import { PlusIcon, EditIcon } from "@/components/shared/icons";
import type { Product, StockMovement } from "@/types";

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

export function ProductsPage() {
  const toast = useToast();
  const { refresh: refreshNotifications } = useNotifications();
  const [data, setData] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 200);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);

  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  const [adjustTarget, setAdjustTarget] = useState<Product | null>(null);
  const [adjustType, setAdjustType] = useState<"PURCHASE" | "ADJUSTMENT">(
    "PURCHASE",
  );
  const [adjustQuantity, setAdjustQuantity] = useState<string>("");
  const [adjustNote, setAdjustNote] = useState("");
  const [adjustSaving, setAdjustSaving] = useState(false);

  const [moveTarget, setMoveTarget] = useState<Product | null>(null);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [moveLoading, setMoveLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getProductsApi({
        search: debouncedSearch || undefined,
        page,
        per_page: 10,
        include_cost: 1,
      });
      setData(res.data);
      setLastPage(res.last_page);
      setTotal(res.total);
    } catch (e) {
      const err = e as { message?: string };
      setError(err.message || "Gagal memuat produk.");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, page]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setForm(emptyForm);
    setFormOpen(true);
  };

  const openEdit = (p: Product) => {
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
        await updateProductApi(form.id, {
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
        toast.success("Produk diperbarui.");
      } else {
        await createProductApi({
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
      setFormOpen(false);
      load();
      refreshNotifications();
    } catch (e) {
      const err = e as { message?: string };
      setError(err.message || "Gagal menyimpan.");
    } finally {
      setSaving(false);
    }
  };

  const doAdjust = async () => {
    if (!adjustTarget) return;
    const quantity = Number(adjustQuantity);
    if (!Number.isInteger(quantity) || quantity === 0) {
      toast.error("Jumlah perubahan harus bilangan bulat (bukan nol).");
      return;
    }
    if (adjustType === "PURCHASE" && quantity < 0) {
      toast.error("Jumlah ditambahkan tidak boleh negatif.");
      return;
    }
    if (
      adjustType === "ADJUSTMENT" &&
      adjustTarget.current_stock + quantity < 0
    ) {
      toast.error("Stok tidak bisa menjadi negatif.");
      return;
    }
    if (!adjustNote.trim()) {
      toast.error("Penyesuaian stok wajib menyertakan catatan.");
      return;
    }
    setAdjustSaving(true);
    try {
      await adjustStockApi(adjustTarget.id, {
        type: adjustType,
        quantity,
        note: adjustNote.trim(),
      });
      toast.success(
        adjustType === "PURCHASE"
          ? "Stok masuk berhasil dicatat."
          : "Stok diperbarui.",
      );
      setAdjustTarget(null);
      setAdjustQuantity("");
      setAdjustNote("");
      load();
      refreshNotifications();
    } catch (e) {
      const err = e as { message?: string };
      toast.error(err.message || "Gagal menyesuaikan stok.");
    } finally {
      setAdjustSaving(false);
    }
  };

  const openAdjust = (p: Product) => {
    setAdjustType("PURCHASE");
    setAdjustQuantity("");
    setAdjustNote("");
    setAdjustTarget(p);
  };

  const openMovements = async (p: Product) => {
    setMoveTarget(p);
    setMoveLoading(true);
    try {
      const res = await getProductMovementsApi(p.id, { per_page: 20 });
      setMovements(res.data);
    } catch (e) {
      const err = e as { message?: string };
      toast.error(err.message || "Gagal memuat riwayat stok.");
    } finally {
      setMoveLoading(false);
    }
  };

  const adjustQty = Number(adjustQuantity);
  const previewAfter =
    adjustTarget && Number.isFinite(adjustQty)
      ? adjustTarget.current_stock + adjustQty
      : null;
  const columns: Column<Product>[] = [
    {
      key: "sku",
      label: "SKU",
      render: (r) => (
        <span className="font-mono text-xs text-text-secondary">{r.sku}</span>
      ),
    },
    {
      key: "name",
      label: "Nama",
      render: (r) => (
        <span className="font-medium text-text-primary">{r.name}</span>
      ),
    },
    { key: "category", label: "Kategori", render: (r) => r.category || "-" },
    {
      key: "sale_price",
      label: "Harga Jual",
      render: (r) => (
        <span className="tabular-nums">{formatRupiah(r.sale_price)}</span>
      ),
    },
    {
      key: "stock",
      label: "Stok",
      render: (r) => <StockBadge current={r.current_stock} min={r.min_stock} />,
    },
    {
      key: "is_active",
      label: "Status",
      render: (r) =>
        r.is_active ? (
          <Badge tone="success">Aktif</Badge>
        ) : (
          <Badge tone="neutral">Nonaktif</Badge>
        ),
    },
    {
      key: "actions",
      label: "Aksi",
      render: (r) => (
        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            onClick={() => openAdjust(r)}
          >
            Atur Stok
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => openMovements(r)}
          >
            Riwayat
          </Button>
          {isAdmin && (
            <button
              className="rounded p-1 text-text-secondary hover:text-primary"
              onClick={() => openEdit(r)}
              aria-label="Edit"
            >
              <EditIcon className="h-4 w-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        actions={isAdmin ? (
          <Button onClick={openCreate}>
            <PlusIcon className="h-4 w-4" />
            Produk Baru
          </Button>
        ) : undefined}
      />

      <Card className="mb-4">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Cari nama / SKU produk..."
        />
      </Card>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
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
            {data.map((p) => (
              <div key={p.id} className="card space-y-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-text-primary">
                      {p.name}
                    </p>
                    <p className="font-mono text-xs text-text-secondary">
                      {p.sku}
                    </p>
                  </div>
                  {isAdmin && (
                    <button
                      className="shrink-0 rounded p-1 text-text-secondary hover:text-primary"
                      onClick={() => openEdit(p)}
                      aria-label="Edit"
                    >
                      <EditIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-control bg-surface-2 px-2 py-0.5 text-text-secondary">
                    {p.category || "-"}
                  </span>
                  <StockBadge current={p.current_stock} min={p.min_stock} />
                </div>
                <div className="flex items-center justify-between gap-2 border-t border-border pt-2">
                  <span className="text-sm font-semibold text-text-primary">
                    {formatRupiah(p.sale_price)}
                  </span>
                  <div className="flex shrink-0 gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => openAdjust(p)}
                    >
                      Atur Stok
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => openMovements(p)}
                    >
                      Riwayat
                    </Button>
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

      {/* Product form modal */}
      <Modal
        open={formOpen}
        onClose={() => {
          if (form.imagePreview) URL.revokeObjectURL(form.imagePreview);
          setForm(emptyForm);
          setFormOpen(false);
        }}
        title={form.id ? "Edit Produk" : "Produk Baru"}
        size="lg"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setFormOpen(false)}
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
          <Input
            label="Foto Produk"
            name="image"
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0] || null;
              const preview = file ? URL.createObjectURL(file) : null;
              setForm({ ...form, image: file, imagePreview: preview });
            }}
          />
          {form.imagePreview && (
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Preview
              </label>
              <img
                src={form.imagePreview}
                alt="Preview"
                className="w-32 h-32 object-cover rounded-lg border border-border"
              />
            </div>
          )}
        </div>
      </Modal>

      {/* Stock adjustment modal */}
      <Modal
        open={!!adjustTarget}
        onClose={() => setAdjustTarget(null)}
        title="Atur Stok"
        size="sm"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setAdjustTarget(null)}
              disabled={adjustSaving}
            >
              Batal
            </Button>
            <Button onClick={doAdjust} loading={adjustSaving}>
              Simpan
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            {adjustTarget?.name} — stok saat ini:{" "}
            <span className="font-bold text-text-primary">
              {formatQuantity(adjustTarget?.current_stock ?? 0)}{" "}
              {adjustTarget?.unit}
            </span>
          </p>
          <Select
            label="Jenis Perubahan"
            name="adjustType"
            value={adjustType}
            onChange={(e) =>
              setAdjustType(e.target.value as "PURCHASE" | "ADJUSTMENT")
            }
            options={[
              { value: "PURCHASE", label: "Pembelian / Restock" },
              { value: "ADJUSTMENT", label: "Penyesuaian" },
            ]}
          />
          {adjustType === "PURCHASE" ? (
            <>
              <Input
                label="Jumlah Ditambahkan (dari stok saat ini)"
                name="quantity"
                type="number"
                min={1}
                step={1}
                value={adjustQuantity}
                onChange={(e) => setAdjustQuantity(e.target.value)}
              />
              {previewAfter !== null && (
                <div className="rounded-control border border-border bg-surface-2 px-4 py-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-text-secondary">Stok akhir</span>
                    <span className="font-bold text-text-primary">
                      {formatQuantity(previewAfter)} {adjustTarget?.unit}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-text-secondary">
                    Stok masuk tidak membuat pengeluaran otomatis.
                  </p>
                </div>
              )}
            </>
          ) : (
            <>
              <Input
                label="Jumlah Perubahan (bertanda, minus = pengurangan)"
                name="quantity"
                type="number"
                step={1}
                value={adjustQuantity}
                onChange={(e) => setAdjustQuantity(e.target.value)}
              />
              {previewAfter !== null && (
                <div className="rounded-control border border-border bg-surface-2 px-4 py-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-text-secondary">Stok akhir</span>
                    <span
                      className={`font-bold ${
                        previewAfter < 0 ? "text-danger" : "text-text-primary"
                      }`}
                    >
                      {formatQuantity(previewAfter)} {adjustTarget?.unit}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-text-secondary">
                    Penyesuaian tidak membuat pengeluaran otomatis.
                  </p>
                </div>
              )}
            </>
          )}
          <Input
            label="Catatan (wajib)"
            name="note"
            value={adjustNote}
            onChange={(e) => setAdjustNote(e.target.value)}
          />
        </div>
      </Modal>

      {/* Movement history modal */}
      <Modal
        open={!!moveTarget}
        onClose={() => setMoveTarget(null)}
        title={`Riwayat Stok: ${moveTarget?.name ?? ""}`}
        size="lg"
      >
        {moveLoading ? (
          <LoadingState />
        ) : (
          <>
            {moveTarget && (
              <div className="mb-4 flex flex-wrap items-center gap-3 rounded-control border border-border bg-surface-2 px-4 py-3">
                <span className="text-sm text-text-secondary">
                  Stok saat ini:{" "}
                  <span className="font-bold text-text-primary">
                    {formatQuantity(moveTarget.current_stock)} {moveTarget.unit}
                  </span>
                </span>
                <span className="text-sm text-text-secondary">
                  Stok minimum:{" "}
                  <span className="font-bold text-text-primary">
                    {formatQuantity(moveTarget.min_stock)} {moveTarget.unit}
                  </span>
                </span>
                {moveTarget.current_stock === 0 ? (
                  <Badge tone="danger">Habis</Badge>
                ) : moveTarget.current_stock <= moveTarget.min_stock ? (
                  <Badge tone="warning">Menipis</Badge>
                ) : (
                  <Badge tone="success">Aman</Badge>
                )}
              </div>
            )}
            {movements.length === 0 ? (
              <p className="py-8 text-center text-sm text-text-secondary">
                Belum ada pergerakan stok.
              </p>
            ) : (
              <DataTable
                columns={[
                  {
                    key: "direction",
                    label: "Arah",
                    render: (r) =>
                      r.direction === "IN" ? (
                        <Badge tone="success">Stok Masuk</Badge>
                      ) : (
                        <Badge tone="danger">Stok Keluar</Badge>
                      ),
                  },
                  {
                    key: "type",
                    label: "Tipe",
                    render: (r) => (
                      <Badge tone="info">{STOCK_MOVEMENT_LABEL[r.type]}</Badge>
                    ),
                  },
                  {
                    key: "qty",
                    label: "Perubahan",
                    render: (r) => (
                      <span
                        className={`tabular-nums ${r.quantity_change > 0 ? "text-success" : "text-danger"}`}
                      >
                        {r.quantity_change > 0 ? "+" : ""}
                        {formatQuantity(r.quantity_change)}
                      </span>
                    ),
                  },
                  {
                    key: "before",
                    label: "Sebelum",
                    render: (r) => formatQuantity(r.stock_before),
                  },
                  {
                    key: "after",
                    label: "Sesudah",
                    render: (r) => formatQuantity(r.stock_after),
                  },
                  {
                    key: "actor",
                    label: "Petugas",
                    render: (r) => r.created_by_name || "-",
                  },
                  {
                    key: "note",
                    label: "Keterangan",
                    render: (r) =>
                      [r.sale_code ? `Transaksi ${r.sale_code}` : null, r.note]
                        .filter(Boolean)
                        .join(" — ") || "-",
                  },
                  {
                    key: "at",
                    label: "Waktu",
                    render: (r) => formatDateTime(r.created_at),
                  },
                ]}
                data={movements}
                keyExtractor={(r) => r.id}
              />
            )}
          </>
        )}
      </Modal>
    </div>
  );
}
