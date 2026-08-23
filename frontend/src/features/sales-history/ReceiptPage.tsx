import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { ChevronLeftIcon } from "@/components/shared/icons";
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

  const handleBack = () => {
    navigate("/riwayat");
  };

  const handlePrint = () => {
    window.print();
  };

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
      {/* Header with back button - not printed */}
      <header className="no-print sticky top-0 z-40 border-b border-border bg-surface px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={handleBack} className="shrink-0">
            <ChevronLeftIcon className="h-5 w-5" />
          </Button>
          <div>
            <p className="text-sm font-bold text-text-primary">Struk Pembayaran</p>
            <p className="text-xs text-text-secondary">Transaksi: {sale?.sale_code}</p>
          </div>
        </div>
      </header>

      <main className="p-4 md:p-6">
        <div className="max-w-2xl mx-auto">
          <ReceiptView
            sale={sale}
            onClose={() => navigate("/riwayat")}
            customerName={sale.customer?.name ?? ""}
          />

          {/* Print button - not printed */}
          <div className="no-print mt-6 flex flex-col md:flex-row md:flex-wrap gap-2 justify-center">
            <Button variant="secondary" onClick={handlePrint} className="md:flex-1">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2h2" />
              </svg>
              Cetak Struk
            </Button>
            <Button variant="secondary" onClick={handleBack} className="md:flex-1">
              <ChevronLeftIcon className="h-4 w-4" />
              Kembali ke Riwayat
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}