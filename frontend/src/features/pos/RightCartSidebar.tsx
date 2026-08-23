import { usePos } from "./PosContext";
import { formatRupiah } from "@/lib/formatters";
import { PlusIcon, MinusIcon, TrashIcon } from "@/components/shared/icons";
import { ShoppingCart, ArrowRight } from "lucide-react";

export function RightCartSidebar() {
  const {
    cart,
    subtotal,
    discount,
    setDiscount,
    grandTotal,
    updateQty,
    removeLine,
    clearCart,
    openCheckout,
  } = usePos();

  return (
    <aside className="w-80 shrink-0 border-l border-border bg-surface hidden xl:flex flex-col h-screen sticky top-0">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <h2 className="font-bold text-slate-900 text-base">Pesanan</h2>
        {cart.length > 0 && (
          <button
            onClick={clearCart}
            className="p-1.5 text-red-500 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
            title="Kosongkan Keranjang"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {cart.length === 0 ? (
          <div className="py-20 text-center flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center text-blue-500 mb-3">
              <ShoppingCart className="h-8 w-8" />
            </div>
            <h3 className="font-bold text-slate-800 text-sm mb-1">
              Keranjang kosong
            </h3>
            <p className="text-xs text-slate-400">
              Pilih produk atau jasa di katalog.
            </p>
          </div>
        ) : (
          cart.map((item, index) => {
            const name =
              item.item_type === "PRODUCT"
                ? item.product?.name
                : item.service?.name;
            const price =
              item.item_type === "PRODUCT"
                ? (item.product?.sale_price ?? 0)
                : (item.service?.sale_price ?? 0);

            return (
              <div
                key={index}
                className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col gap-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-bold text-xs text-slate-800 break-words">
                      {name}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {formatRupiah(price)}
                    </p>
                  </div>
                  <button
                    onClick={() => removeLine(index)}
                    className="text-slate-300 hover:text-red-500 transition-colors"
                  >
                    <TrashIcon className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg p-0.5">
                    <button
                      onClick={() => updateQty(index, item.quantity - 1)}
                      disabled={item.quantity <= 1}
                      className="p-1 hover:bg-slate-100 rounded text-slate-600 disabled:opacity-30"
                    >
                      <MinusIcon className="h-3 w-3" />
                    </button>
                    <span className="w-6 text-center text-xs font-bold text-slate-800">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQty(index, item.quantity + 1)}
                      className="p-1 hover:bg-slate-100 rounded text-slate-600"
                    >
                      <PlusIcon className="h-3 w-3" />
                    </button>
                  </div>
                  <span className="font-extrabold text-xs text-slate-900">
                    {formatRupiah(price * item.quantity)}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="p-4 border-t border-border space-y-3 bg-white">
        <div className="space-y-1.5 text-xs">
          <div className="flex justify-between text-slate-500 font-medium">
            <span>Subtotal</span>
            <span className="font-bold text-slate-800">
              {formatRupiah(subtotal)}
            </span>
          </div>

          <div className="flex justify-between items-center text-slate-500 font-medium">
            <span>Diskon</span>
            <input
              type="number"
              min={0}
              max={subtotal}
              value={discount || ""}
              onChange={(e) => setDiscount(Math.max(0, Number(e.target.value)))}
              placeholder="Rp 0"
              className="w-24 text-right bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="flex justify-between items-center pt-2 font-bold text-slate-900 text-sm border-t border-slate-100">
            <span>Total</span>
            <span className="text-base text-slate-900">
              {formatRupiah(grandTotal)}
            </span>
          </div>
        </div>

        <button
          onClick={openCheckout}
          disabled={cart.length === 0}
          className="w-full bg-[#1d4ed8] hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold py-3 px-4 rounded-2xl shadow-md shadow-blue-500/20 transition-all flex items-center justify-between text-xs"
        >
          <span>Pesan Sekarang</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </aside>
  );
}
