import { Button } from "@/components/ui/Button";
import { PrinterIcon } from "@/components/shared/icons";
import { formatRupiah, formatNumber, formatDateTime } from "@/lib/formatters";
import { PAYMENT_LABEL, BENGKEL_CONFIG } from "@/lib/constants";
import type { Sale } from "@/types";

export function ReceiptView({
  sale,
  onClose,
  customerName,
}: {
  sale: Sale;
  onClose: () => void;
  customerName?: string;
}) {
  const handlePrint = () => {
    window.print();
  };

  const renderPaymentDetail = () => {
    const method = sale.payment_method;
    const gatewayId = sale.gateway_transaction_id;
    const vaNumber = sale.gateway_va_number;
    const paid = sale.paid_amount;
    const change = sale.change_amount;

    switch (method) {
      case "QRIS":
        return (
          <>
            <div className="kv-row">
              <span className="kv-label">Metode</span>
              <span className="kv-value">QRIS</span>
            </div>
            <div className="kv-row">
              <span className="kv-label">Status</span>
              <span className="kv-value">LUNAS</span>
            </div>
            {gatewayId && (
              <div className="kv-row">
                <span className="kv-label">Referensi</span>
                <span className="kv-value">{gatewayId}</span>
              </div>
            )}
            <div className="kv-row">
              <span className="kv-label">Total Dibayar</span>
              <span className="kv-value">{formatRupiah(sale.grand_total)}</span>
            </div>
          </>
        );
      case "VA":
        return (
          <>
            <div className="kv-row">
              <span className="kv-label">Metode</span>
              <span className="kv-value">VIRTUAL ACCOUNT</span>
            </div>
            <div className="kv-row">
              <span className="kv-label">Bank</span>
              <span className="kv-value">BCA</span>
            </div>
            {vaNumber && (
              <div className="kv-row">
                <span className="kv-label">No. VA</span>
                <span className="kv-value">{vaNumber}</span>
              </div>
            )}
            <div className="kv-row">
              <span className="kv-label">Status</span>
              <span className="kv-value">LUNAS</span>
            </div>
            {gatewayId && (
              <div className="kv-row">
                <span className="kv-label">Referensi</span>
                <span className="kv-value">{gatewayId}</span>
              </div>
            )}
            <div className="kv-row">
              <span className="kv-label">Total Dibayar</span>
              <span className="kv-value">{formatRupiah(sale.grand_total)}</span>
            </div>
          </>
        );
      case "CASH":
        return (
          <>
            <div className="kv-row">
              <span className="kv-label">Metode</span>
              <span className="kv-value">TUNAI</span>
            </div>
            <div className="kv-row">
              <span className="kv-label">Status</span>
              <span className="kv-value">LUNAS</span>
            </div>
            {paid != null && (
              <div className="kv-row">
                <span className="kv-label">Dibayar</span>
                <span className="kv-value">{formatRupiah(paid)}</span>
              </div>
            )}
            {change != null && change > 0 && (
              <div className="kv-row">
                <span className="kv-label">Kembalian</span>
                <span className="kv-value">{formatRupiah(change)}</span>
              </div>
            )}
          </>
        );
      default:
        return (
          <>
            <div className="kv-row">
              <span className="kv-label">Metode</span>
              <span className="kv-value">
                {method ? PAYMENT_LABEL[method] : "-"}
              </span>
            </div>
            <div className="kv-row">
              <span className="kv-label">Status</span>
              <span className="kv-value">LUNAS</span>
            </div>
            <div className="kv-row">
              <span className="kv-label">Total Dibayar</span>
              <span className="kv-value">{formatRupiah(sale.grand_total)}</span>
            </div>
          </>
        );
    }
  };

  return (
    <>
      <div className="thermal-scroll">
        <div className="thermal-receipt">
          {/* Header Bengkel */}
          <div className="text-center mb-4">
            <p
              className="font-bold text-lg"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              {BENGKEL_CONFIG.NAMA}
            </p>
            <p className="text-xs text-gray-500">{BENGKEL_CONFIG.TAGLINE}</p>
            <p className="text-xs text-gray-500">{BENGKEL_CONFIG.ALAMAT}</p>
          </div>

          <div className="section-divider "></div>

          {/* Bucket Transaksi */}
          <p className="section-title">BUKTI TRANSAKSI</p>
          <div className="section-divider"></div>

          <div className="kv-row">
            <span className="kv-label">No. Transaksi</span>
            <span className="kv-value">{sale.sale_code}</span>
          </div>
          <div className="kv-row">
            <span className="kv-label">Tanggal</span>
            <span className="kv-value">{formatDateTime(sale.paid_at)}</span>
          </div>
          <div className="kv-row">
            <span className="kv-label">Kasir</span>
            <span className="kv-value">{sale.cashier?.name || "-"}</span>
          </div>

          <div className="section-divider"></div>

          {/* Pelanggan */}
          {customerName && (
            <>
              <p className="section-title">PELANGGAN</p>
              <div className="section-divider"></div>
              <div className="kv-row">
                <span className="kv-label">Nama</span>
                <span className="kv-value">{customerName}</span>
              </div>
              <div className="section-divider"></div>
            </>
          )}

          {/* Detail Transaksi - gabungan jasa & sparepart */}
          <p className="section-title">DETAIL TRANSAKSI</p>
          <div className="section-divider"></div>
          {sale.items?.map((item, i) => (
            <div key={i} className="item-row">
              <div>
                <div className="item-name">{item.item_name_snapshot}</div>
                <div className="item-qty-price">
                  {formatNumber(item.quantity)} ×{" "}
                  {formatRupiah(item.unit_price)}
                </div>
              </div>
              <div className="item-total">{formatRupiah(item.subtotal)}</div>
            </div>
          ))}

          {/* Total */}
          <div className="kv-row total-row">
            <span>TOTAL</span>
            <span>{formatRupiah(sale.grand_total)}</span>
          </div>

          <div className="section-divider"></div>

          {/* Pembayaran - dynamic by method */}
          <p className="section-title">PEMBAYARAN</p>
          <div className="section-divider"></div>
          {renderPaymentDetail()}

          <div className="section-divider"></div>

          {/* Footer */}
          <p className="footer-note">
            Terima kasih telah mempercayakan kendaraan Anda kepada:
            <br />
            <strong>{BENGKEL_CONFIG.NAMA}</strong>
            <br />
            <br />
            Simpan struk ini sebagai bukti transaksi dan service kendaraan.
            <br />
            Barang yang sudah dibeli tidak dapat dikembalikan kecuali sesuai
            ketentuan garansi toko.
            <br />
            Semoga perjalanan Anda aman.
          </p>
        </div>
      </div>

      {/* Buttons - not printed */}
      <div className="no-print mt-4 flex flex-col md:flex-row md:flex-wrap gap-2 justify-center">
        <Button variant="secondary" onClick={handlePrint} className="md:flex-1">
          <PrinterIcon className="h-4 w-4" /> Cetak Nota
        </Button>
        <Button variant="secondary" onClick={onClose} className="md:flex-1">
          Transaksi Baru
        </Button>
      </div>
    </>
  );
}
