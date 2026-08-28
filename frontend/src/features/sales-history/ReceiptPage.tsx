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
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <LoadingState label="Memuat struk..." />
      </div>
    );
  }

  if (error || !sale) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <ErrorState message={error || "Transaksi tidak ditemukan."} onRetry={() => window.location.reload()} />
      </div>
    );
  }

  return (
    <ReceiptView
      sale={sale}
      onClose={() => navigate("/pos")}
      customerName={sale.customer?.name ?? ""}
    />
  );
}