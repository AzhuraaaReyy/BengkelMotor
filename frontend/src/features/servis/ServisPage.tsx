import { useSearchParams } from "react-router-dom";
import { ServiceOrdersPage } from "@/features/service-orders/ServiceOrdersPage";
import { CustomersPage } from "@/features/customers/CustomersPage";

type TabKey = "orders" | "customers";

const TABS: { key: TabKey; label: string }[] = [
  { key: "orders", label: "Order Servis" },
  { key: "customers", label: "Pelanggan" },
];

export function ServisPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab: TabKey =
    searchParams.get("tab") === "customers" ? "customers" : "orders";

  const setTab = (key: TabKey) => {
    if (key === "orders") {
      searchParams.delete("tab");
    } else {
      searchParams.set("tab", key);
    }
    setSearchParams(searchParams, { replace: true });
  };

  return (
    <div>
      <div className="mb-6 flex gap-1 rounded-card border border-border bg-surface-2 p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 rounded-control px-3 py-2 text-sm font-medium transition-colors ${
              tab === t.key
                ? "bg-surface text-primary shadow-sm"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "orders" ? <ServiceOrdersPage /> : <CustomersPage />}
    </div>
  );
}
