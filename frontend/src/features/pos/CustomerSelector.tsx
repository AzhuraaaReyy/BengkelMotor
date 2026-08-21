import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { createCustomerApi, type CustomerPayload } from "@/lib/api/customers";
import type { Customer } from "@/types";

interface CustomerSelectorProps {
  customers: Customer[];
  selectedId: number | null;
  onSelect: (id: number | null) => void;
  onCustomerCreated: (customer: Customer) => void;
}

export function CustomerSelector({
  customers,
  selectedId,
  onSelect,
  onCustomerCreated,
}: CustomerSelectorProps) {
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [motorcycleType, setMotorcycleType] = useState("");

  const handleSave = async () => {
    if (!name.trim()) return;
    setLoading(true);
    try {
      const payload: CustomerPayload = {
        name: name.trim(),
        phone: phone.trim() || undefined,
        motorcycle_type: motorcycleType.trim() || undefined,
      };
      const newCustomer = await createCustomerApi(payload);
      onCustomerCreated(newCustomer);
      resetForm();
      setShowForm(false);
    } catch {
      // Error handled by caller if needed
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setName("");
    setPhone("");
    setMotorcycleType("");
  };

  if (showForm) {
    return (
      <div className="rounded-xl border border-border bg-surface p-3 space-y-3">
        <p className="text-xs font-semibold text-text-secondary">Tambah Pelanggan Baru</p>
        <Input
          label="Nama *"
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nama pelanggan"
        />
        <Input
          label="No. HP"
          name="phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="081234567890"
        />
        <Input
          label="Motor"
          name="motorcycle_type"
          value={motorcycleType}
          onChange={(e) => setMotorcycleType(e.target.value)}
          placeholder="Contoh: Honda Beat 2022"
        />
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setShowForm(false);
              resetForm();
            }}
            disabled={loading}
          >
            Batal
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={loading || !name.trim()}
          >
            {loading ? "Menyimpan..." : "Simpan"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <label className="form-label">Pelanggan</label>
      <select
        className="form-input"
        value={selectedId ?? ""}
        onChange={(e) => onSelect(e.target.value ? Number(e.target.value) : null)}
      >
        <option value="">Pelanggan Umum</option>
        {customers.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}{c.phone ? ` (${c.phone})` : ""}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={() => setShowForm(true)}
        className="mt-2 text-xs font-semibold text-primary hover:text-primary-hover"
      >
        + Tambah Pelanggan Baru
      </button>
    </div>
  );
}
