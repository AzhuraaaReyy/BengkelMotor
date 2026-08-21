import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { Pagination } from "@/components/ui/Pagination";
import { Card } from "@/components/ui/Card";
import { SearchInput } from "@/components/ui/SearchInput";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { ServiceStatusBadge, SaleStatusBadge } from "@/components/ui/badges";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import {
  getServiceOrdersApi,
  getServiceOrderApi,
  createServiceOrderApi,
  updateServiceOrderApi,
  deleteServiceOrderApi,
} from "@/lib/api/serviceOrders";
import { getCustomersApi, createCustomerApi } from "@/lib/api/customers";
import { useDebouncedValue } from "@/lib/useDebouncedValue";
import { formatDateTime, formatRupiah } from "@/lib/formatters";
import { SERVICE_STATUS_LABEL, SALE_STATUS_LABEL } from "@/lib/constants";
import type { ServiceOrder, Customer } from "@/types";
import {
  Plus,
  Pencil,
  User,
  Calendar,
  ArrowRight,
  CheckCircle2,
  Trash2,
} from "lucide-react";

// DONE ("Selesai") is set automatically when the linked POS transaction is
// paid (see CheckoutSaleService::checkout); CANCELLED is a legacy/dormant
// state. Both are terminal: locked from further edits, same rule the backend
// enforces in ServiceOrderController::update.
function isLocked(order: ServiceOrder): boolean {
  return order.status === "DONE" || order.status === "CANCELLED";
}

// Compare phone numbers ignoring spaces, dashes and dots (keep + and digits).
function normalizePhone(value: string): string {
  return value.replace(/[\s.-]/g, "");
}

export function ServiceOrdersPage() {
  const toast = useToast();
  const [data, setData] = useState<ServiceOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Single create form: Nama, No. WA, Tipe Motor, Keluhan, Catatan Diagnosa.
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState("");
  const [matched, setMatched] = useState<Customer | null>(null);
  const [checking, setChecking] = useState(false);
  const [form, setForm] = useState({
    complaint: "",
    diagnosis_note: "",
  });

  const [editTarget, setEditTarget] = useState<ServiceOrder | null>(null);
  const [editForm, setEditForm] = useState({
    complaint: "",
    diagnosis_note: "",
  });
  const [editSaving, setEditSaving] = useState(false);

  const [detail, setDetail] = useState<ServiceOrder | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ServiceOrder | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const debouncedPhone = useDebouncedValue(phone, 400);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getServiceOrdersApi({
        search: search || undefined,
        status: status || undefined,
        page,
        per_page: 15,
      });
      setData(res.data);
      setLastPage(res.last_page);
      setTotal(res.total);
    } catch (e) {
      const err = e as { message?: string };
      setError(err.message || "Gagal memuat data servis.");
    } finally {
      setLoading(false);
    }
  }, [search, status, page]);

  useEffect(() => {
    load();
  }, [load]);

  // Look up the customer by normalized phone number as the Kasir types it.
  // When found, Nama & No. WA lock to the customer record while Tipe Motor is
  // pre-filled but stays editable (it is stored per-order, not on the master).
  useEffect(() => {
    const q = debouncedPhone.trim();
    if (!q) {
      setMatched(null);
      setChecking(false);
      return;
    }
    let active = true;
    setChecking(true);
    getCustomersApi({ search: q, per_page: 15 })
      .then((res) => {
        if (!active) return;
        const found =
          res.data.find(
            (c) => normalizePhone(c.phone ?? "") === normalizePhone(q),
          ) ?? null;
        setMatched(found);
        if (found) setType(found.motorcycle_type || "");
      })
      .catch(() => {
        if (active) setMatched(null);
      })
      .finally(() => {
        if (active) setChecking(false);
      });
    return () => {
      active = false;
    };
  }, [debouncedPhone]);

  const openForm = () => {
    setPhone("");
    setName("");
    setType("");
    setMatched(null);
    setChecking(false);
    setForm({
      complaint: "",
      diagnosis_note: "",
    });
    setFormOpen(true);
  };

  const formValid =
    phone.trim().length > 0 && (matched !== null || name.trim().length > 0);

  const save = async () => {
    const p = phone.trim();
    if (!p) {
      toast.error("No. WA/Telepon wajib diisi.");
      return;
    }
    if (!matched && !name.trim()) {
      toast.error("Nama pelanggan wajib diisi.");
      return;
    }
    if (!form.complaint.trim()) {
      toast.error("Keluhan wajib diisi.");
      return;
    }
    setSaving(true);
    try {
      let customerId: number;
      if (matched) {
        customerId = matched.id;
      } else {
        const created = await createCustomerApi({
          name: name.trim(),
          phone: p,
          motorcycle_type: type.trim() || undefined,
        });
        customerId = created.id;
      }
      await createServiceOrderApi({
        customer_id: customerId,
        motorcycle_type: type.trim() || undefined,
        complaint: form.complaint,
        diagnosis_note: form.diagnosis_note || undefined,
      });
      toast.success("Order servis dibuat.");
      setFormOpen(false);
      load();
    } catch (e) {
      const err = e as { message?: string };
      toast.error(err.message || "Gagal menyimpan.");
    } finally {
      setSaving(false);
    }
  };

  // Lets Kasir record progress (catatan diagnosa) while an order is still
  // OPEN/IN_PROGRESS, so "Dikerjakan" reflects real work instead of being
  // just a label.
  const openEdit = (order: ServiceOrder) => {
    setEditForm({
      complaint: order.complaint,
      diagnosis_note: order.diagnosis_note || "",
    });
    setEditTarget(order);
  };

  const saveEdit = async () => {
    if (!editTarget) return;
    if (!editForm.complaint.trim()) {
      toast.error("Keluhan wajib diisi.");
      return;
    }
    setEditSaving(true);
    try {
      await updateServiceOrderApi(editTarget.id, {
        complaint: editForm.complaint,
        diagnosis_note: editForm.diagnosis_note || undefined,
      });
      toast.success("Catatan servis diperbarui.");
      setEditTarget(null);
      load();
    } catch (e) {
      const err = e as { message?: string };
      toast.error(err.message || "Gagal memperbarui catatan servis.");
    } finally {
      setEditSaving(false);
    }
  };

  const openDetail = async (order: ServiceOrder) => {
    setDetail(order);
    setDetailLoading(true);
    try {
      const full = await getServiceOrderApi(order.id);
      setDetail(full);
    } catch (e) {
      const err = e as { message?: string };
      toast.error(err.message || "Gagal memuat detail order.");
    } finally {
      setDetailLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await deleteServiceOrderApi(deleteTarget.id);
      toast.success(`Order ${deleteTarget.order_code} dihapus.`);
      setDeleteTarget(null);
      load();
    } catch (e) {
      const err = e as { message?: string };
      toast.error(err.message || "Gagal menghapus order servis.");
    } finally {
      setDeleteLoading(false);
    }
  };

  const columns: Column<ServiceOrder>[] = [
    {
      key: "order_code",
      label: "Kode Order",
      render: (r) => (
        <span className="font-medium text-primary">{r.order_code}</span>
      ),
    },
    {
      key: "customer",
      label: "Pelanggan",
      render: (r) => (
        <span className="font-medium text-text-primary">
          {r.customer?.name || "-"}
        </span>
      ),
    },
    {
      key: "motorcycle_type",
      label: "Tipe Motor",
      render: (r) => r.motorcycle_type || "-",
    },
    {
      key: "status",
      label: "Status",
      render: (r) => <ServiceStatusBadge status={r.status} />,
    },
    {
      key: "opened_at",
      label: "Tanggal Masuk",
      render: (r) => formatDateTime(r.opened_at),
    },
    {
      key: "actions",
      label: "Aksi",
      className: "text-right",
      render: (r) => (
        <div className="flex items-center justify-end gap-2">
          {r.status === "DONE" && (
            <Button variant="ghost" size="sm" onClick={() => openDetail(r)}>
              Lihat Detail
            </Button>
          )}
          {!isLocked(r) && (
            <button
              onClick={() => openEdit(r)}
              title="Edit catatan servis"
              className="shrink-0 rounded-control bg-surface-2 p-2 text-text-secondary hover:bg-surface-2 hover:text-primary"
            >
              <Pencil className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={() => setDeleteTarget(r)}
            title="Hapus order servis"
            className="shrink-0 rounded-control bg-surface-2 p-2 text-text-secondary hover:bg-surface-2 hover:text-danger"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          {!r.sale && r.status !== "CANCELLED" && r.status !== "DONE" && (
            <Link
              to={`/pos?service_order=${r.id}`}
              className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-control bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-hover"
            >
              <span>Transaksi</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <Card className="mb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Cari pelanggan..."
            />
          </div>
          <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <Select
              className="w-full sm:w-40"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              options={[
                { value: "", label: "Semua Status" },
                { value: "OPEN", label: SERVICE_STATUS_LABEL.OPEN },
                { value: "DONE", label: SERVICE_STATUS_LABEL.DONE },
              ]}
            />
            <Button onClick={openForm} className="w-full justify-center sm:w-auto">
              <Plus className="h-4 w-4" />
              Order Baru
            </Button>
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
            title="Belum ada order servis"
            description="Buat order servis baru untuk mulai mencatat pekerjaan."
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
            {data.map((r) => (
              <div key={r.id} className="card space-y-3 p-4">
                <div className="flex items-center justify-between gap-2 border-b border-border pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-primary">
                      {r.order_code}
                    </span>
                    <ServiceStatusBadge status={r.status} />
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-text-secondary">
                    <Calendar className="h-3 w-3" />
                    <span>{formatDateTime(r.opened_at)}</span>
                  </div>
                </div>

                <div className="space-y-1.5 text-sm">
                  <div className="flex items-center gap-2 text-text-primary">
                    <User className="h-3.5 w-3.5 shrink-0 text-text-secondary" />
                    <span className="font-medium">
                      {r.customer?.name || "-"}
                    </span>
                  </div>

                  {r.motorcycle_type && (
                    <div className="flex items-center gap-2 text-text-secondary">
                      <span className="font-medium text-text-primary">
                        {r.motorcycle_type}
                      </span>
                    </div>
                  )}

                  {r.complaint && (
                    <div className="mt-2 rounded-control border border-border bg-surface-2 p-2.5 text-sm text-text-primary">
                      <span className="mb-0.5 block text-xs font-bold text-text-primary">
                        Keluhan:
                      </span>
                      {r.complaint}
                    </div>
                  )}

                  {r.diagnosis_note && (
                    <div className="mt-2 rounded-control border border-primary-subtle bg-primary-subtle p-2.5 text-sm text-text-primary">
                      <span className="mb-0.5 block text-xs font-bold text-primary">
                        Catatan Diagnosa:
                      </span>
                      {r.diagnosis_note}
                    </div>
                  )}
                </div>

                <div className="flex flex-col items-stretch gap-2 border-t border-border pt-2 sm:flex-row sm:items-center">
                  {r.status === "DONE" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openDetail(r)}
                    >
                      Lihat Detail
                    </Button>
                  )}
                  {!isLocked(r) && (
                    <button
                      onClick={() => openEdit(r)}
                      className="shrink-0 rounded-control bg-surface-2 p-2 text-text-secondary hover:bg-surface-2 hover:text-primary"
                      title="Edit catatan servis"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    onClick={() => setDeleteTarget(r)}
                    className="shrink-0 rounded-control bg-surface-2 p-2 text-text-secondary hover:bg-surface-2 hover:text-danger"
                    title="Hapus order servis"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  {!r.sale && r.status !== "CANCELLED" && r.status !== "DONE" && (
                    <Link
                      to={`/pos?service_order=${r.id}`}
                      className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-control bg-primary px-4 py-2 text-xs font-medium text-white hover:bg-primary-hover"
                    >
                      <span>Buat Transaksi</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  )}
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

      {/* ---------------- MODAL CREATE ORDER (satu form) ---------------- */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title="Order Servis Baru"
        size="lg"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setFormOpen(false)}
              disabled={saving || checking}
            >
              Batal
            </Button>
            <Button onClick={save} loading={saving} disabled={!formValid || checking}>
              Simpan Order
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            Masukkan no. WA/telepon pelanggan. Jika sudah terdaftar, nama akan
            terisi otomatis dan kasir cukup melengkapi keluhan & catatan.
          </p>

          {matched && (
            <div className="flex items-start gap-2 rounded-control border border-success bg-success-subtle p-3">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
              <div>
                <p className="text-sm font-medium text-text-primary">
                  Sudah terdaftar
                </p>
                <p className="text-sm text-text-secondary">
                  {matched.name} · {matched.phone || "-"}
                </p>
              </div>
            </div>
          )}

          {/* Responsive: 2 kolom di tablet/desktop (md+), 1 kolom di phone.
              Kiri = identitas pelanggan, kanan = keluhan & catatan diagnosa. */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <Input
                label="Nama"
                name="name"
                value={matched ? matched.name : name}
                onChange={(e) => setName(e.target.value)}
                readOnly={!!matched}
                disabled={!!matched}
                placeholder="Nama pelanggan"
              />
              <Input
                label="No. WA / Telepon"
                name="phone"
                type="tel"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  setMatched(null);
                  setChecking(false);
                }}
                placeholder="Misal: 0812xxxxxxx"
                hint={checking ? "Mencari data pelanggan..." : undefined}
              />
              <Input
                label="Tipe Motor"
                name="motorcycle_type"
                value={type}
                onChange={(e) => setType(e.target.value)}
                placeholder="Misal: Honda Vario 125"
              />
            </div>

            <div className="space-y-4">
              <div>
                <label className="form-label" htmlFor="complaint">
                  Keluhan Pelanggan
                </label>
                <textarea
                  id="complaint"
                  name="complaint"
                  rows={4}
                  className="form-input"
                  value={form.complaint}
                  onChange={(e) =>
                    setForm({ ...form, complaint: e.target.value })
                  }
                  placeholder="Misal: Mesin berbunyi kasar saat tarikan awal"
                />
              </div>

              <div>
                <label className="form-label" htmlFor="diagnosis_note">
                  Catatan Diagnosa / Kerusakan
                </label>
                <textarea
                  id="diagnosis_note"
                  name="diagnosis_note"
                  rows={4}
                  className="form-input"
                  value={form.diagnosis_note}
                  onChange={(e) =>
                    setForm({ ...form, diagnosis_note: e.target.value })
                  }
                  placeholder="Misal: Perlu ganti roller & V-belt"
                />
              </div>
            </div>
          </div>

          <p className="text-xs text-text-secondary">
            Order baru otomatis berstatus <strong>Baru</strong> dan akan menjadi{" "}
            <strong>Selesai</strong> setelah transaksinya dibayar di POS.
          </p>
        </div>
      </Modal>

      {/* ---------------- MODAL EDIT CATATAN SERVIS ---------------- */}
      <Modal
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        title={
          editTarget
            ? `Edit Catatan — ${editTarget.order_code}`
            : "Edit Catatan"
        }
        size="lg"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setEditTarget(null)}
              disabled={editSaving}
            >
              Batal
            </Button>
            <Button onClick={saveEdit} loading={editSaving}>
              Simpan
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Keluhan Pelanggan"
            name="edit_complaint"
            value={editForm.complaint}
            onChange={(e) =>
              setEditForm({ ...editForm, complaint: e.target.value })
            }
          />

          <Input
            label="Catatan Diagnosa / Progres Servis"
            name="edit_diagnosis_note"
            value={editForm.diagnosis_note}
            onChange={(e) =>
              setEditForm({ ...editForm, diagnosis_note: e.target.value })
            }
            placeholder="Update dari mekanik: apa yang ditemukan / dikerjakan sejauh ini"
          />
        </div>
      </Modal>

      {/* ---------------- MODAL DETAIL ORDER ---------------- */}
      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail ? `Detail Order — ${detail.order_code}` : "Detail Order"}
        size="lg"
      >
        {detailLoading || !detail ? (
          <LoadingState />
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-bold text-text-primary">
                {detail.order_code}
              </span>
              <ServiceStatusBadge status={detail.status} />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 text-sm">
                <p className="font-medium text-text-primary">Pelanggan</p>
                <p className="text-text-secondary">{detail.customer?.name || "-"}</p>
                <p className="text-text-secondary">
                  {detail.customer?.phone || "-"}
                </p>
              </div>
              <div className="space-y-1.5 text-sm">
                <p className="font-medium text-text-primary">Tipe Motor</p>
                <p className="text-text-secondary">
                  {detail.motorcycle_type || "-"}
                </p>
              </div>
              <div className="space-y-1.5 text-sm">
                <p className="font-medium text-text-primary">Kasir</p>
                <p className="text-text-secondary">
                  {detail.cashier?.name || "-"}
                </p>
              </div>
              <div className="space-y-1.5 text-sm">
                <p className="font-medium text-text-primary">Waktu Masuk</p>
                <p className="text-text-secondary">
                  {formatDateTime(detail.opened_at)}
                </p>
              </div>
              {detail.completed_at && (
                <div className="space-y-1.5 text-sm">
                  <p className="font-medium text-text-primary">Selesai</p>
                  <p className="text-text-secondary">
                    {formatDateTime(detail.completed_at)}
                  </p>
                </div>
              )}
            </div>

            <div className="rounded-control border border-border bg-surface-2 p-3 text-sm">
              <p className="mb-1 text-xs font-bold text-text-primary">Keluhan</p>
              <p className="text-text-primary">{detail.complaint}</p>
            </div>

            {detail.diagnosis_note && (
              <div className="rounded-control border border-primary-subtle bg-primary-subtle p-3 text-sm">
                <p className="mb-1 text-xs font-bold text-primary">
                  Catatan Diagnosa
                </p>
                <p className="text-text-primary">{detail.diagnosis_note}</p>
              </div>
            )}

            {detail.sale && (
              <div className="rounded-control border border-border p-3">
                <p className="mb-2 text-xs font-bold text-text-primary">
                  Transaksi Terkait
                </p>
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-text-primary">
                      {detail.sale.sale_code}
                    </span>
                    <SaleStatusBadge status={detail.sale.status} />
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-text-primary">
                      {formatRupiah(detail.sale.grand_total)}
                    </p>
                    <p className="text-xs text-text-secondary">
                      {detail.sale.paid_at
                        ? `Dibayar ${formatDateTime(detail.sale.paid_at)}`
                        : `Status ${SALE_STATUS_LABEL[detail.sale.status]}`}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* ---------------- CONFIRM HAPUS ORDER ---------------- */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Hapus Order Servis?"
        message={
          deleteTarget
            ? deleteTarget.sale
              ? `Order ${deleteTarget.order_code} akan dihapus permanen. Transaksi terkait (${deleteTarget.sale.sale_code}) tetap tersimpan.`
              : `Order ${deleteTarget.order_code} akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.`
            : ""
        }
        confirmLabel="Hapus"
        danger
        loading={deleteLoading}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}