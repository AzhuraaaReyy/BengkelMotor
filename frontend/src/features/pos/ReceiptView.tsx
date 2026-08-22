import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PrinterIcon, CheckIcon } from "@/components/shared/icons";
import { formatRupiah, formatNumber, formatDateTime } from "@/lib/formatters";
import { PAYMENT_LABEL } from "@/lib/constants";
import type { Sale } from "@/types";


export function ReceiptView({
  sale,
  onClose,
  customerName,
}: {
  sale: Sale;
  onClose: () => void;
  customerName: string;
}) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="mx-auto max-w-md lg:max-w-lg">
      <Card className="text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success-subtle text-success">
          <CheckIcon className="h-6 w-6" />
        </div>
        <h2 className="mt-3 text-lg font-semibold text-text-primary">
          Pembayaran Berhasil
        </h2>
        <p className="mt-1 text-sm text-text-secondary">
          Transaksi {sale.sale_code}
        </p>
        <p className="mt-1 text-xs text-text-secondary">
          {formatDateTime(sale.paid_at)}
        </p>
      </Card>

      <div className="mt-4 card p-5 print:p-0 print:shadow-none print:border-0">
        <div className="mb-3 border-b border-dashed border-border pb-3">
          <h3 className="font-bold text-text-primary">Bengkel Motor</h3>
          <p className="text-xs text-text-secondary">Nota Penjualan</p>
        </div>

        <table className="w-full text-sm">
          <tbody>
            {sale.items?.map((item, i) => {
              return (
                <tr key={i} className="border-b border-dashed border-border">
                  <td className="py-2 align-top">
                    <p className="font-medium text-text-primary">
                      {item.item_name_snapshot}
                    </p>
                    <p className="text-xs text-text-secondary">
                      {formatNumber(item.quantity)} ×{" "}
                      {formatRupiah(item.unit_price)}
                    </p>
                  </td>
                  <td className="py-2 text-right align-top font-semibold tabular-nums text-text-primary">
                    {formatRupiah(item.subtotal)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="mt-3 space-y-1 border-t border-border pt-3 text-sm">
          <div className="flex justify-between">
            <span className="text-text-secondary">Subtotal</span>
            <span className="tabular-nums text-text-primary">
              {formatRupiah(sale.subtotal)}
            </span>
          </div>
          {sale.discount_amount > 0 && (
            <div className="flex justify-between">
              <span className="text-text-secondary">Diskon</span>
              <span className="tabular-nums text-danger">
                -{formatRupiah(sale.discount_amount)}
              </span>
            </div>
          )}
          <div className="flex justify-between text-base font-bold">
            <span className="text-text-primary">Total</span>
            <span className="tabular-nums text-primary">
              {formatRupiah(sale.grand_total)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-secondary">Metode</span>
            <span className="text-text-primary">
              {sale.payment_method ? PAYMENT_LABEL[sale.payment_method] : "-"}
            </span>
          </div>
          {sale.paid_amount != null && (
            <div className="flex justify-between">
              <span className="text-text-secondary">Dibayar</span>
              <span className="tabular-nums text-text-primary">
                {formatRupiah(sale.paid_amount)}
              </span>
            </div>
          )}
          {sale.change_amount != null && sale.change_amount > 0 && (
            <div className="flex justify-between">
              <span className="text-text-secondary">Kembalian</span>
              <span className="tabular-nums text-text-primary">
                {formatRupiah(sale.change_amount)}
              </span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-text-secondary">Kasir</span>
            <span className="text-text-primary">
              {sale.cashier?.name || "-"}
            </span>
          </div>
          {customerName && (
            <div className="flex justify-between">
              <span className="text-text-secondary">Pelanggan</span>
              <span className="text-text-primary">{customerName}</span>
            </div>
          )}
        </div>

        <p className="mt-4 border-t border-dashed border-border pt-3 text-center text-xs text-text-secondary">
          Terima kasih atas kunjungan Anda.
        </p>
      </div>

      <div className="mt-4 flex flex-col md:flex-row md:flex-wrap gap-2 print:hidden">
        <Button variant="secondary" onClick={handlePrint} className="md:flex-1">
          <PrinterIcon className="h-4 w-4" />
          Cetak Nota
        </Button>
        <Button variant="secondary" onClick={onClose} className="md:flex-1">
          Transaksi Baru
        </Button>
      </div>
    </div>
  );
}
