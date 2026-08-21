import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Pagination } from "@/components/ui/Pagination";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import { getUsersApi, createUserApi, updateUserApi } from "@/lib/api/users";
import { formatDateTime } from "@/lib/formatters";
import { ROLE_LABEL } from "@/lib/constants";
import { PlusIcon } from "@/components/shared/icons";
import type { User } from "@/types";

export function UsersPage() {
  const toast = useToast();
  const [data, setData] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"ADMIN" | "CASHIER">("CASHIER");
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getUsersApi({ page, per_page: 15 });
      setData(res.data);
      setLastPage(res.last_page);
    } catch (e) {
      const err = e as { message?: string };
      setError(err.message || "Gagal memuat pengguna.");
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setName("");
    setUsername("");
    setEmail("");
    setPassword("");
    setRole("CASHIER");
    setIsActive(true);
    setFormOpen(true);
  };

  const save = async () => {
    if (!name.trim() || !username.trim() || !email.trim()) {
      toast.error("Nama, username, dan email wajib diisi.");
      return;
    }
    if (!editing && password.length < 8) {
      toast.error("Password minimal 8 karakter.");
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await updateUserApi(editing.id, {
          name,
          username,
          email,
          password: password || undefined,
          is_active: isActive,
        });
        toast.success("Pengguna diperbarui.");
      } else {
        await createUserApi({
          name,
          username,
          email,
          password,
          role,
          is_active: isActive,
        });
        toast.success("Pengguna dibuat.");
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

  const columns: Column<User>[] = [
    {
      key: "name",
      label: "Nama",
      render: (r) => (
        <span className="font-medium text-text-primary">{r.name}</span>
      ),
    },
    {
      key: "username",
      label: "Username",
      render: (r) => <span className="font-mono text-xs">{r.username}</span>,
    },
    {
      key: "role",
      label: "Role",
      render: (r) => (
        <Badge tone={r.role === "ADMIN" ? "info" : "neutral"}>
          {ROLE_LABEL[r.role]}
        </Badge>
      ),
    },
    {
      key: "is_active",
      label: "Status",
      render: (r) =>
        r.is_active ? (
          <Badge tone="success">Aktif</Badge>
        ) : (
          <Badge tone="danger">Nonaktif</Badge>
        ),
    },
    {
      key: "last_login_at",
      label: "Login Terakhir",
      render: (r) => (r.last_login_at ? formatDateTime(r.last_login_at) : "-"),
    },
  ];

  return (
    <div>
      <PageHeader
        actions={
          <Button onClick={openCreate}>
            <PlusIcon className="h-4 w-4" />
            Pengguna Baru
          </Button>
        }
      />

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
        title={editing ? "Edit Pengguna" : "Pengguna Baru"}
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
        <div className="space-y-4">
          <Input
            label="Nama"
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Username"
              name="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <Input
              label="Email"
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select
              label="Role"
              name="role"
              value={role}
              onChange={(e) => setRole(e.target.value as "ADMIN" | "CASHIER")}
              options={[
                { value: "CASHIER", label: "Kasir" },
                { value: "ADMIN", label: "Admin" },
              ]}
            />
            <Select
              label="Status"
              name="is_active"
              value={String(isActive)}
              onChange={(e) => setIsActive(e.target.value === "true")}
              options={[
                { value: "true", label: "Aktif" },
                { value: "false", label: "Nonaktif" },
              ]}
            />
          </div>
          <Input
            label={
              editing
                ? "Password Baru (kosongkan jika tidak diubah)"
                : "Password (min 8 karakter)"
            }
            name="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
      </Modal>
    </div>
  );
}
