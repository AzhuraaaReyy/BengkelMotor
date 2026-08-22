import { PAYMENT_METHODS, PAYMENT_LABEL } from "@/lib/constants";
import { ShoppingCart, QrCode, Building2, Wallet } from "lucide-react";

const ICONS = {
  CASH: ShoppingCart,
  QRIS: QrCode,
  VA: Building2,
  GOPAY: Wallet,
};

const HELPERS = {
  CASH: "Bayar langsung di kasir",
  QRIS: "Pindai QR dari e-wallet / m-banking",
  VA: "Bayar lewat ATM / mobile banking",
  GOPAY: "Bayar lewat GoPay",
};

interface Props {
  value: string;
  onChange: (method: string) => void;
}

export function PaymentMethodSelector({ value, onChange }: Props) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
      {Object.values(PAYMENT_METHODS).map((method) => {
        const Icon = ICONS[method as keyof typeof ICONS];
        const isSelected = value === method;
        return (
          <button
            key={method}
            type="button"
            onClick={() => onChange(method)}
            className={`flex flex-col items-center gap-1 rounded-lg border-2 p-2.5 md:p-3 text-center transition-colors ${
              isSelected
                ? "border-primary bg-primary/5 text-primary"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <Icon className="h-6 w-6" />
            <span className="text-sm font-medium">{PAYMENT_LABEL[method]}</span>
            <span className="text-xs text-gray-500">{HELPERS[method as keyof typeof HELPERS]}</span>
          </button>
        );
      })}
    </div>
  );
}
