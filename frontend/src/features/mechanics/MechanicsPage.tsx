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
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import {
  getMechanicsApi,
  createMechanicApi,
  updateMechanicApi,
} from "@/lib/api/mechanics";
import { PlusIcon, EditIcon } from "@/components/shared/icons";
import type { Mechanic } from "@/types";

export function MechanicsPage() {
  const toast = useToast();
  const [data, setData] = useState<Mechanic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 200);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Mechanic | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getMechanicsApi({
        search: debouncedSearch || undefined,
        page,
        per_page: 15,
      });
      setData(res.data);
      setLastPage(res.last_page);
    } catch (e) {
      const err = e as { message?: string };
      setError(err.message || "Gagal memuat mekanik.");
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
    setIsActive(true);
    setFormOpen(true);
  };

  const openEdit = (m: Mechanic) => {
    setEditing(m);
    setName(m.name);
    setPhone(m.phone || "");
    setIsActive(m.is_active);
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
        await updateMechanicApi(editing.id, {
          name,
          phone: phone || undefined,
          is_active: isActive,
        });
        toast.success("Mekanik diperbarui.");
      } else {
        await createMechanicApi({
          name,
          phone: phone || undefined,
          is_active: isActive,
        });
        toast.success("Mekanik ditambahkan.");
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

  const columns: Column<Mechanic>[] = [
    {
      key: "name",
      label: "Nama",
      render: (r) => (
        <span className="font-medium text-text-primary">{r.name}</span>
      ),
    },
    { key: "phone", label: "Telepon", render: (r) => r.phone || "-" },
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
      label: "",
      render: (r) => (
        <button
          className="rounded p-1 text-text-secondary hover:text-primary"
          onClick={() => openEdit(r)}
          aria-label="Edit"
        >
          <EditIcon className="h-4 w-4" />
        </button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        actions={
          <Button onClick={openCreate}>
            <PlusIcon className="h-4 w-4" />
            Mekanik Baru
          </Button>
        }
      />

      <Card className="mb-4">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Cari nama mekanik..."
        />
      </Card>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : (
        <>
          <DataTable columns={columns} data={data} keyExtractor={(r) => r.id} />
          <Pagination
            currentPage={page}
            lastPage={lastPage}
            onPageChange={setPage}
          />
        </>
      )}

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? "Edit Mekanik" : "Mekanik Baru"}
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
          <label className="flex items-center gap-2 text-sm text-text-primary">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
            />
            Aktif
          </label>
        </div>
      </Modal>
    </div>
  );
}
