import { useEffect, useState, useRef, useMemo } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { createCustomerApi, type CustomerPayload } from "@/lib/api/customers";
import type { Customer } from "@/types";
import { ChevronDown } from "lucide-react";

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
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
        setSearchQuery("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredCustomers = useMemo(() => {
    if (!searchQuery.trim()) return customers;
    const q = searchQuery.toLowerCase();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.phone && c.phone.toLowerCase().includes(q))
    );
  }, [customers, searchQuery]);

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
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="form-input flex items-center justify-between"
          >
            <span className="truncate">
              {selectedCustomer
                ? `${selectedCustomer.name}${selectedCustomer.phone ? ` (${selectedCustomer.phone})` : ""}`
                : "Pelanggan Umum"}
            </span>
            <ChevronDown className={`h-4 w-4 shrink-0 text-text-secondary transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
          </button>
          {dropdownOpen && (
            <div className="absolute z-50 mt-1 w-full rounded-control border border-border bg-surface shadow-card">
              <div className="p-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari nama / no. HP..."
                  className="w-full rounded-control border border-border bg-surface px-3 py-1.5 text-sm text-text-primary placeholder:text-text-secondary/70 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  autoFocus
                />
              </div>
              <div className="hide-scrollbar max-h-[160px] overflow-y-auto">
                <button
                  type="button"
                  onClick={() => {
                    onSelect(null);
                    setDropdownOpen(false);
                    setSearchQuery("");
                  }}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-surface-2 ${
                    !selectedId ? "bg-primary/5 text-primary font-medium" : "text-text-primary"
                  }`}
                >
                  Pelanggan Umum
                </button>
                {filteredCustomers.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      onSelect(c.id);
                      setDropdownOpen(false);
                      setSearchQuery("");
                    }}
                    className={`w-full px-3 py-2 text-left text-sm hover:bg-surface-2 ${
                      selectedId === c.id ? "bg-primary/5 text-primary font-medium" : "text-text-primary"
                    }`}
                  >
                    {c.name}{c.phone ? ` (${c.phone})` : ""}
                  </button>
                ))}
                {filteredCustomers.length === 0 && (
                  <p className="px-3 py-2 text-xs text-text-secondary">Tidak ditemukan</p>
                )}
              </div>
            </div>
          )}
        </div>
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
