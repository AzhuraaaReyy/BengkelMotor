import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { getSaleApi } from "@/lib/api/sales";
import { ReceiptView } from "@/features/pos/ReceiptView";
import type { Sale } from "@/types";

export function ReceiptPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [sale, setSale] = useState<Sale | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setError("ID transaksi tidak ditemukan.");
      setLoading(false);
      return;
    }

    const fetchSale = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getSaleApi(Number(id));
        console.log('Sale data received:', data);
        console.log('Sale items:', data.items);
        setSale(data);
      } catch (e) {
        const err = e as { message?: string };
        setError(err.message || "Gagal memuat data transaksi.");
      } finally {
        setLoading(false);
      }
    };

    fetchSale();
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <LoadingState label="Memuat struk..." />
      </div>
    );
  }

  if (error || !sale) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg p-4">
        <ErrorState message={error || "Transaksi tidak ditemukan."} onRetry={() => window.location.reload()} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg">
      <main className="p-4 md:p-6">
        <div className="max-w-2xl mx-auto">
          <ReceiptView
            sale={sale}
            onClose={() => navigate("/riwayat")}
            customerName={sale.customer?.name ?? ""}
          />
        </div>
      </main>
    </div>
  );
}