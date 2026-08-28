import { useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Pagination } from "@/components/ui/Pagination";
import { Badge } from "@/components/ui/Badge";
import { DateRangePicker } from "@/components/ui/DateRangePicker";
import { useToast } from "@/components/ui/Toast";
import { useExpenses } from "@/lib/useExpenses";
import { formatRupiah, formatDate } from "@/lib/formatters";
import { EXPENSE_CATEGORIES } from "@/lib/constants";
import { PlusIcon, EditIcon } from "@/components/shared/icons";
import type { Expense } from "@/types";

export function ExpensesPage() {
  const toast = useToast();
  const [from, setFrom] = useState(new Date().toISOString().slice(0, 10));
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const [page, setPage] = useState(1);

  const {
    expenses: data,
    lastPage,
    total,
    isLoading: loading,
    error: loadError,
    createExpense,
    updateExpense,
  } = useExpenses({
    from,
    to,
    page,
    per_page: 10,
  });

  const error = loadError ? (loadError as { message?: string }).message || "Gagal memuat pengeluaran." : null;

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [fDate, setFDate] = useState(new Date().toISOString().slice(0, 10));
  const [category, setCategory] = useState<string>(EXPENSE_CATEGORIES[0]);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const openCreate = () => {
    setEditing(null);
    setFDate(new Date().toISOString().slice(0, 10));
    setCategory(EXPENSE_CATEGORIES[0]);
    setAmount("");
    setDescription("");
    setFormOpen(true);
  };

  const openEdit = (e: Expense) => {
    setEditing(e);
    setFDate(e.expense_date);
    setCategory(e.category);
    setAmount(String(e.amount));
    setDescription(e.description || "");
    setFormOpen(true);
  };

  const save = async () => {
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      toast.error("Nominal harus lebih dari 0.");
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await updateExpense({
          id: editing.id,
          payload: {
            expense_date: fDate,
            category,
            amount: amt,
            description: description || undefined,
          },
        });
        toast.success("Pengeluaran diperbarui.");
      } else {
        await createExpense({
          expense_date: fDate,
          category,
          amount: amt,
          description: description || undefined,
        });
        toast.success("Pengeluaran dicatat.");
      }
      setFormOpen(false);
    } catch (e) {
      const err = e as { message?: string; errors?: Record<string, string[]> };

      if (err.errors) {
        const errorMessages = Object.entries(err.errors)
          .map(([field, messages]) => `${field}: ${messages.join(', ')}`)
          .join('; ');
        toast.error(errorMessages || err.message || "Gagal menyimpan.");
      } else {
        toast.error(err.message || "Gagal menyimpan.");
      }
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<Expense>[] = [
    {
      key: "expense_date",
      label: "Tanggal",
      render: (r) => formatDate(r.expense_date),
    },
    {
      key: "category",
      label: "Kategori",
      render: (r) => (
        <span className="flex items-center gap-2">
          <span className="font-medium text-text-primary">{r.category}</span>
          {r.source === "STOCK_PURCHASE" && (
            <Badge tone="info">Pembelian Stok</Badge>
          )}
        </span>
      ),
    },
    {
      key: "amount",
      label: "Nominal",
      render: (r) => (
        <span className="tabular-nums font-semibold text-danger">
          {formatRupiah(r.amount)}
        </span>
      ),
    },
    {
      key: "description",
      label: "Keterangan",
      render: (r) => r.description || "-",
    },
    {
      key: "actions",
      label: "",
      render: (r) =>
        r.source === "STOCK_PURCHASE" ? (
          <span className="text-xs text-text-tertiary" title="Otomatis dari restock, tidak dapat diedit manual">
            Otomatis
          </span>
        ) : (
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
            Catat Pengeluaran
          </Button>
        }
      />

      <Card className="mb-4">
        <DateRangePicker
          from={from}
          to={to}
          onFromChange={(v) => {
            setFrom(v);
            setPage(1);
          }}
          onToChange={(v) => {
            setTo(v);
            setPage(1);
          }}
        />
      </Card>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} />
      ) : (
        <>
          <DataTable columns={columns} data={data} keyExtractor={(r) => r.id} />
          <Pagination
            currentPage={page}
            lastPage={lastPage}
            total={total}
            onPageChange={setPage}
          />
        </>
      )}

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? "Edit Pengeluaran" : "Catat Pengeluaran"}
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
            label="Tanggal"
            name="expense_date"
            type="date"
            value={fDate}
            onChange={(e) => setFDate(e.target.value)}
          />
          <Select
            label="Kategori"
            name="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            options={EXPENSE_CATEGORIES.map((c) => ({ value: c, label: c }))}
          />
          <Input
            label="Nominal (Rp)"
            name="amount"
            type="number"
            min={0}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <Input
            label="Keterangan"
            name="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
      </Modal>
    </div>
  );
}
