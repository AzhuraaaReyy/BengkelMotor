import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { createCustomerApi, type CustomerPayload } from "@/lib/api/customers";
import type { Customer } from "@/types";

interface CustomerSelectorProps {
  customers: Customer[];
  selectedId: number | null;
  onSelect: (id: number | null) => void;
  onCustomerCreated: (customer: Customer) => void;
  isRequired?: boolean;
  onServiceDataChange?: (data: {
    complaint: string;
    diagnosis_note: string;
    motorcycle_type: string;
  }) => void;
}

export function CustomerSelector({
  customers,
  selectedId,
  onSelect,
  onCustomerCreated,
  isRequired = false,
  onServiceDataChange,
}: CustomerSelectorProps) {
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [motorcycleType, setMotorcycleType] = useState("");
  const [complaint, setComplaint] = useState("");
  const [diagnosisNote, setDiagnosisNote] = useState("");

  const selectedCustomer = customers.find((c) => c.id === selectedId);

  useEffect(() => {
    if (selectedCustomer) {
      setMotorcycleType(selectedCustomer.motorcycle_type || "");
    }
  }, [selectedCustomer]);

  useEffect(() => {
    if (onServiceDataChange) {
      onServiceDataChange({
        complaint,
        diagnosis_note: diagnosisNote,
        motorcycle_type: motorcycleType,
      });
    }
  }, [complaint, diagnosisNote, motorcycleType, onServiceDataChange]);

  const handleSave = async () => {
    if (!name.trim()) return;
    if (isRequired && !complaint.trim()) return;
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
    setComplaint("");
    setDiagnosisNote("");
  };

  if (showForm) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 md:p-4 space-y-3">
        <p className="text-xs font-semibold text-slate-600">Tambah Pelanggan Baru</p>
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
          label={isRequired ? "Tipe Motor *" : "Tipe Motor"}
          name="motorcycle_type"
          value={motorcycleType}
          onChange={(e) => setMotorcycleType(e.target.value)}
          placeholder="Contoh: Honda Beat 2022"
        />
        {isRequired && (
          <>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">
                Keluhan Pelanggan <span className="text-red-500">*</span>
              </label>
              <textarea
                value={complaint}
                onChange={(e) => setComplaint(e.target.value)}
                placeholder="Jelaskan keluhan pelanggan..."
                rows={3}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">
                Catatan Diagnosa <span className="text-slate-400">(opsional)</span>
              </label>
              <textarea
                value={diagnosisNote}
                onChange={(e) => setDiagnosisNote(e.target.value)}
                placeholder="Catatan teknisi..."
                rows={2}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </>
        )}
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
            disabled={loading || !name.trim() || (isRequired && !complaint.trim())}
          >
            {loading ? "Menyimpan..." : "Simpan"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
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
          className="mt-2 text-xs font-semibold text-blue-600 hover:text-blue-700"
        >
          + Tambah Pelanggan Baru
        </button>
      </div>

      {selectedCustomer && isRequired && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 md:p-4 space-y-3">
          <p className="text-xs font-semibold text-slate-600">
            Data Servis untuk {selectedCustomer.name}
          </p>
          <Input
            label="Tipe Motor *"
            name="motorcycle_type_edit"
            value={motorcycleType}
            onChange={(e) => setMotorcycleType(e.target.value)}
            placeholder="Contoh: Honda Beat 2022"
          />
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700">
              Keluhan Pelanggan <span className="text-red-500">*</span>
            </label>
            <textarea
              value={complaint}
              onChange={(e) => setComplaint(e.target.value)}
              placeholder="Jelaskan keluhan pelanggan..."
              rows={3}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700">
              Catatan Diagnosa <span className="text-slate-400">(opsional)</span>
            </label>
            <textarea
              value={diagnosisNote}
              onChange={(e) => setDiagnosisNote(e.target.value)}
              placeholder="Catatan teknisi..."
              rows={2}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
      )}
    </div>
  );
}
