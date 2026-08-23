import { useRef } from "react";
import { formatRupiah } from "@/lib/formatters";
import { BENGKEL_CONFIG } from "@/lib/constants";
import type { Sale } from "@/types";

interface ReceiptPrintLayoutProps {
  sale: any;
  customerName?: string;
  onPrint?: () => void;
  onClose?: () => void;
  showPrintButton?: boolean;
  showCloseButton?: boolean;
}

export function ReceiptPrintLayout({
  sale,
  customerName,
  onPrint,
  onClose,
  showPrintButton = true,
  showCloseButton = true,
}: ReceiptPrintLayoutProps) {
  const lastPrintTimeRef = useRef<number>(0);

  const handlePrint = () => {
    const now = Date.now();
    if (now - (window as any).__lastPrintTime < 3000) {
      return;
    }
    (window as any).__lastPrintTime = now;
    if (onPrint) {
      onPrint();
    } else {
      window.print();
    }
  };

  const renderQRIS = () => (
    <div>
      <div className="kv-row"><span className="kv-label">Metode</span><span className="kv-value">QRIS</span></div>
      <div className="kv-row"><span className="kv-label">Status</span><span className="kv-value">LUNAS</span></div>
      {sale.gateway_transaction_id && <div className="kv-row"><span className="kv-label">Referensi</span><span className="kv-value">{sale.gateway_transaction_id}</span></div>}
      <div className="kv-row"><span className="kv-label">Total Dibayar</span><span className="kv-value">{formatRupiah(sale.grand_total)}</span></div>
    </div>
  );

  const renderVA = () => (
    <div>
      <div className="kv-row"><span className="kv-label">Metode</span><span className="kv-value">VIRTUAL ACCOUNT</span></div>
      <div className="kv-row"><span className="kv-label">Bank</span><span className="kv-value">BCA</span></div>
      {sale.gateway_va_number && <div className="kv-row"><span className="kv-label">No. VA</span><span className="kv-value">{sale.gateway_va_number}</span></div>}
      <div className="kv-row"><span className="kv-label">Status</span><span className="kv-value">LUNAS</span></div>
      {sale.gateway_transaction_id && <div className="kv-row"><span className="kv-label">Referensi</span><span className="kv-value">{sale.gateway_transaction_id}</span></div>}
      <div className="kv-row"><span className="kv-label">Total Dibayar</span><span className="kv-value">{formatRupiah(sale.grand_total)}</span></div>
    </div>
  );

  const renderCash = () => (
    <div>
      <div className="kv-row"><span className="kv-label">Metode</span><span className="kv-value">TUNAI</span></div>
      <div className="kv-row"><span className="kv-label">Status</span><span className="kv-value">LUNAS</span></div>
      {sale.paid_amount != null && <div className="kv-row"><span className="kv-label">Dibayar</span><span className="kv-value">{formatRupiah(sale.paid_amount)}</span></div>}
      {sale.change_amount != null && sale.change_amount > 0 && <div className="kv-row"><span className="kv-label">Kembalian</span><span className="kv-value">{formatRupiah(sale.change_amount)}</span></div>}
    </div>
  );

  const renderDefault = () => (
    <div>
      <div className="kv-row"><span className="kv-label">Metode</span><span className="kv-value">{sale.payment_method || '-'}</span></div>
      <div className="kv-row"><span className="kv-label">Status</span><span className="kv-value">LUNAS</span></div>
      <div className="kv-row"><span className="kv-label">Total Dibayar</span><span className="kv-value">{formatRupiah(sale.grand_total)}</span></div>
    </div>
  );

  const renderPaymentDetail = () => {
    switch (sale.payment_method) {
      case "QRIS": return renderQRIS();
      case "VA": return renderVA();
      case "CASH": return renderCash();
      default: return renderDefault();
    }
  };

  return (
    <div className="space-y-4">
      <div className="thermal-print-layout">
        <div className="thermal-receipt">
          <div className="text-center mb-4">
            <p className="font-bold text-lg" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              {BENGKEL_CONFIG.NAMA}
            </p>
            <p className="text-xs text-gray-500">{BENGKEL_CONFIG.TAGLINE}</p>
            <p className="text-xs text-gray-500">{BENGKEL_CONFIG.ALAMAT}</p>
          </div>

          <div className="section-divider"></div>

          <p className="section-title">BUKTI TRANSAKSI</p>
          <div className="section-divider"></div>

          <div className="kv-row"><span className="kv-label">No. Transaksi</span><span className="kv-value">{sale.sale_code}</span></div>
          <div className="kv-row"><span className="kv-label">Tanggal</span><span className="kv-value">{new Date(sale.paid_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</span></div>
          <div className="kv-row"><span className="kv-label">Kasir</span><span className="kv-value">{sale.cashier?.name || "-"}</span></div>

          <div className="section-divider"></div>

          {customerName && (
            <div>
              <p className="section-title">PELANGGAN</p>
              <div className="section-divider"></div>
              <div className="kv-row"><span className="kv-label">Nama</span><span className="kv-value">{customerName}</span></div>
              <div className="section-divider"></div>
            </div>
          )}

          <p className="section-title">DETAIL TRANSAKSI</p>
          <div className="section-divider"></div>
          {sale.items?.map((item: any, i: number) => (
            <div key={i} className="item-row">
              <div>
                <div className="item-name">{item.item_name_snapshot}</div>
                <div className="item-qty-price">{item.quantity} ×{" "}{formatRupiah(item.unit_price)}</div>
              </div>
              <div className="item-total">{formatRupiah(item.quantity * item.unit_price)}</div>
            </div>
          ))}

          <div className="section-divider"></div>
          <div className="kv-row total-row"><span>TOTAL</span><span>{formatRupiah(sale.grand_total)}</span></div>

          <div className="section-divider"></div>

          <p className="section-title">PEMBAYARAN</p>
          <div className="section-divider"></div>
          {renderPaymentDetail()}
        </div>
      </div>

      <div className="no-print mt-4 flex flex-col md:flex-row md:flex-wrap gap-2 justify-center">
        {showPrintButton && (
          <button
            onClick={handlePrint}
            className="md:flex-1 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 002-2H9a2 2 0 00-2 2v4a2 2 0 002 2h2" />
            </svg>
            Cetak Struk
          </button>
        )}
        {showCloseButton && (
          <button
            onClick={() => onClose ? onClose() : window.history.back()}
            className="md:flex-1 px-4 py-2 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors flex items-center justify-center gap-2"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Kembali
          </button>
        )}
      </div>
    </div>
  );
}