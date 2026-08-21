import { useCallback, useEffect, useState } from "react";
import { useDebouncedValue } from "@/lib/useDebouncedValue";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { SearchInput } from "@/components/ui/SearchInput";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Pagination } from "@/components/ui/Pagination";
import { useToast } from "@/components/ui/Toast";
import {
  getCustomersApi,
  createCustomerApi,
  updateCustomerApi,
} from "@/lib/api/customers";
import { formatDate } from "@/lib/formatters";
import { PlusIcon, EditIcon } from "@/components/shared/icons";
import type { Customer } from "@/types";

export function CustomersPage() {
  const toast = useToast();
  const [data, setData] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 200);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [type, setType] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getCustomersApi({
        search: debouncedSearch || undefined,
        page,
        per_page: 15,
      });
      setData(res.data);
      setLastPage(res.last_page);
      setTotal(res.total);
    } catch (e) {
      const err = e as { message?: string };
      setError(err.message || "Gagal memuat pelanggan.");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, page]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setName("");
    setPhone("");
    setType("");
    setNotes("");
    setFormOpen(true);
  };

  const openEdit = (c: Customer) => {
    setEditing(c);
    setName(c.name);
    setPhone(c.phone || "");
    setType(c.motorcycle_type || "");
    setNotes(c.notes || "");
    setFormOpen(true);
  };

  const save = async () => {
    if (!name.trim()) {
      toast.error("Nama wajib diisi.");
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await updateCustomerApi(editing.id, {
          name,
          phone: phone || undefined,
          motorcycle_type: type || undefined,
          notes: notes || undefined,
        });
        toast.success("Pelanggan diperbarui.");
      } else {
        await createCustomerApi({
          name,
          phone: phone || undefined,
          motorcycle_type: type || undefined,
          notes: notes || undefined,
        });
        toast.success("Pelanggan dibuat.");
      }
      setFormOpen(false);
      load();
    } catch (e) {
      const err = e as { message?: string };
      toast.error(err.message || "Gagal menyimpan.");
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<Customer>[] = [
    {
      key: "name",
      label: "Nama",
      render: (r) => (
        <span className="font-medium text-text-primary">{r.name}</span>
      ),
    },
    { key: "phone", label: "Telepon", render: (r) => r.phone || "-" },
    {
      key: "motorcycle_type",
      label: "Tipe Motor",
      render: (r) => r.motorcycle_type || "-",
    },
    { key: "notes", label: "Catatan", render: (r) => r.notes || "-" },
    {
      key: "created_at",
      label: "Terdaftar",
      render: (r) => formatDate(r.created_at),
    },
    {
      key: "actions",
      label: "Aksi",
      render: (r) => (
        <div className="flex items-center gap-2">
          <button
            className="rounded p-1 text-text-secondary hover:text-primary"
            onClick={() => openEdit(r)}
            aria-label="Edit"
          >
            <EditIcon className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        actions={
          <Button onClick={openCreate}>
            <PlusIcon className="h-4 w-4" />
            Pelanggan Baru
          </Button>
        }
      />

      <Card className="mb-4">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Cari nama / telepon pelanggan..."
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
            {data.map((c) => (
              <div key={c.id} className="card space-y-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-text-primary">
                      {c.name}
                    </p>
                    <p className="text-xs text-text-secondary">
                      {c.phone || "-"}
                    </p>
                  </div>
                  <button
                    className="shrink-0 rounded p-1 text-text-secondary hover:text-primary"
                    onClick={() => openEdit(c)}
                    aria-label="Edit"
                  >
                    <EditIcon className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-control bg-surface-2 px-2 py-0.5 text-text-secondary">
                    {c.motorcycle_type || "Tanpa motor"}
                  </span>
                  <span className="text-text-secondary">
                    Terdaftar {formatDate(c.created_at)}
                  </span>
                </div>
                {c.notes && (
                  <p className="text-xs text-text-secondary">{c.notes}</p>
                )}
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

      {/* Customer form */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? "Edit Pelanggan" : "Pelanggan Baru"}
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
        <div className="space-y-4">
          <Input
            label="Nama"
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Input
            label="Telepon (opsional)"
            name="phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <Input
            label="Tipe Motor (opsional)"
            name="motorcycle_type"
            value={type}
            onChange={(e) => setType(e.target.value)}
            placeholder="Misal: Honda Vario 125"
          />
          <Input
            label="Catatan"
            name="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </Modal>
    </div>
  );
}
