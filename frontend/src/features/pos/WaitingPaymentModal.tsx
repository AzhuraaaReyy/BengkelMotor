import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { getSaleApi } from "@/lib/api/sales";
import { formatRupiah } from "@/lib/formatters";
import { Copy, Clock, CheckCircle, XCircle } from "lucide-react";
import QRCode from "react-qr-code";

interface Props {
  sale: any;
  onPaid: (sale: any) => void;
  onExpired: () => void;
  onClose: () => void;
}

export function WaitingPaymentModal({ sale, onPaid, onExpired, onClose }: Props) {
  const [timeLeft, setTimeLeft] = useState(0);
  const [status, setStatus] = useState(sale.status);

  useEffect(() => {
    const expires = new Date(sale.payment_expires_at).getTime();
    const tick = () => {
      const remaining = Math.max(0, Math.floor((expires - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining <= 0) {
        setStatus("EXPIRED");
        onExpired();
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [sale.payment_expires_at]);

  useEffect(() => {
    if (status !== "PENDING") return;
    const poll = setInterval(async () => {
      try {
        const res = await getSaleApi(sale.id);
        if (res.status === "PAID") {
          setStatus("PAID");
          onPaid(res);
        } else if (res.status === "EXPIRED") {
          setStatus("EXPIRED");
          onExpired();
        }
      } catch {}
    }, 5000);
    return () => clearInterval(poll);
  }, [sale.id, status]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const progress = timeLeft / (15 * 60);
  const isAmber = timeLeft <= 180;

  const copyVa = () => {
    navigator.clipboard.writeText(sale.gateway_va_number || "");
  };

  return (
    <Modal open onClose={onClose} title="Menunggu Pembayaran" size="lg">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Badge tone="warning">Menunggu Bayar</Badge>
          <span className="text-sm text-gray-500">{sale.sale_code}</span>
        </div>

        <div className="text-center text-2xl md:text-3xl font-bold tabular-nums">
          {formatRupiah(sale.grand_total)}
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-center gap-2 text-lg font-mono">
            <Clock className={`h-5 w-5 ${isAmber ? "text-amber-500" : ""}`} />
            <span>{String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}</span>
          </div>
          <div className="h-2 w-full rounded-full bg-gray-200">
            <div
              className={`h-full rounded-full transition-all ${isAmber ? "bg-amber-500" : "bg-primary"}`}
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        </div>

        {sale.payment_method === "QRIS" && (
          <div className="flex flex-col items-center gap-2">
            <div className="bg-white p-4 rounded-lg">
              {sale.gateway_qr_string ? (
                <QRCode value={sale.gateway_qr_string} size={180} className="w-[140px] h-[140px] md:w-[180px] md:h-[180px]" />
              ) : sale.gateway_qr_url ? (
                <img src={sale.gateway_qr_url} alt="QRIS" className="h-[140px] w-[140px] md:h-[180px] md:w-[180px] object-contain" />
              ) : null}
            </div>
            <p className="text-sm text-gray-500">Buka GoPay / e-wallet / m-banking lalu Scan QRIS</p>
          </div>
        )}

        {sale.payment_method === "VA" && (
          <div className="flex flex-col items-center gap-2">
            <p className="text-sm text-gray-500">Nomor Virtual Account</p>
            <div className="flex items-center gap-2">
              <span className="text-xl md:text-2xl font-mono font-bold break-all">{sale.gateway_va_number}</span>
              <button onClick={copyVa} className="rounded-md border p-2 hover:bg-gray-50">
                <Copy className="h-4 w-4" />
              </button>
            </div>
            <p className="text-sm text-gray-500">Bayar lewat ATM / mobile / internet banking</p>
          </div>
        )}

        {sale.payment_method === "GOPAY" && (
          <div className="flex flex-col items-center gap-2">
            {sale.gateway_deeplink && (
              <a href={sale.gateway_deeplink} target="_blank" rel="noopener noreferrer" className="text-primary underline">Buka GoPay</a>
            )}
            <p className="text-sm text-gray-500">Bayar lewat GoPay</p>
          </div>
        )}

        {status === "EXPIRED" && (
          <div className="text-center space-y-2">
            <XCircle className="mx-auto h-12 w-12 text-gray-400" />
            <p className="font-medium">Pembayaran Kedaluwarsa</p>
            <p className="text-sm text-gray-500">Waktu pembayaran (15 menit) habis. Stok sudah dikembalikan otomatis.</p>
          </div>
        )}

        {status === "PAID" && (
          <div className="text-center space-y-2">
            <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
            <p className="font-medium">Pembayaran Berhasil</p>
          </div>
        )}

        <p className="text-xs text-center text-gray-400">
          Jendela bisa ditutup; tagihan tetap berjalan dan bisa dicek di Riwayat Transaksi.
        </p>
      </div>
    </Modal>
  );
}
