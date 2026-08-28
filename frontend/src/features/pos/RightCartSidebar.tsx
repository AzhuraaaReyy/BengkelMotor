import { usePos } from "./PosContext";
import { formatRupiah } from "@/lib/formatters";
import { PlusIcon, MinusIcon, TrashIcon } from "@/components/shared/icons";
import { ShoppingCart, ArrowRight, Wrench } from "lucide-react";

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
    <aside className="w-80 shrink-0 border-l border-slate-200/60 bg-white hidden xl:flex flex-col h-screen sticky top-0 shadow-xs">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 bg-white">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100/50">
            <ShoppingCart className="h-4 w-4" />
          </div>
          <h2 className="font-extrabold text-slate-800 text-xs tracking-wider">
            PESANAN
          </h2>
        </div>
        {cart.length > 0 && (
          <button
            onClick={clearCart}
            className="p-2 text-red-500 bg-red-50 hover:bg-red-100 rounded-xl transition-colors"
            title="Kosongkan Keranjang"
          >
            <TrashIcon className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Cart Items List */}
      <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-3 bg-slate-50/40 hide-scrollbar">
        {cart.length === 0 ? (
          <div className="py-24 text-center flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-slate-100/80 rounded-full flex items-center justify-center text-slate-400 mb-3 border border-slate-200/50">
              <ShoppingCart className="h-7 w-7" />
            </div>
            <h3 className="font-bold text-slate-700 text-xs mb-1">
              Keranjang kosong
            </h3>
            <p className="text-[11px] text-slate-400 max-w-[180px]">
              Pilih produk atau jasa dari katalog di samping.
            </p>
          </div>
        ) : (
          cart.map((item, index) => {
            const isProduct = item.item_type === "PRODUCT";
            const name = isProduct ? item.product?.name : item.service?.name;
            const price = isProduct
              ? (item.product?.sale_price ?? 0)
              : (item.service?.sale_price ?? 0);
            const imageUrl = isProduct ? item.product?.image : null;

            return (
              <div
                key={index}
                className="p-3 bg-white rounded-2xl shadow-xs border border-slate-200/70 flex gap-3 relative transition-all hover:shadow-sm "
              >
                {/* Thumbnail Gambar / Icon */}
                <div className="h-12 w-12 shrink-0 rounded-xl bg-slate-50 border border-slate-100 overflow-hidden flex items-center justify-center self-center">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={name || "Product"}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                        const parent = e.currentTarget.parentElement;
                        if (parent) {
                          parent.innerHTML = `<div class="text-slate-400 flex items-center justify-center w-full h-full text-base">⚙️</div>`;
                        }
                      }}
                    />
                  ) : (
                    <div className="text-slate-400 flex items-center justify-center">
                      {isProduct ? (
                        <ShoppingCart className="h-5 w-5 text-slate-400" />
                      ) : (
                        <Wrench className="h-5 w-5 text-blue-600" />
                      )}
                    </div>
                  )}
                </div>

                {/* Info & Action Item */}
                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <div className="flex items-start justify-between gap-1">
                    <div className="pr-5">
                      <p className="font-bold text-xs text-slate-800 truncate leading-tight">
                        {name}
                      </p>
                      <p className="text-[11px] font-semibold text-slate-400 mt-0.5">
                        {formatRupiah(price)}
                      </p>
                    </div>

                    <button
                      onClick={() => removeLine(index)}
                      className="absolute top-3 right-3 text-slate-300 hover:text-red-500 transition-colors p-0.5"
                      title="Hapus barang"
                    >
                      <TrashIcon className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Stepper Kuantitas & Subtotal Item */}
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/80 rounded-lg p-0.5">
                      <button
                        onClick={() => updateQty(index, item.quantity - 1)}
                        disabled={item.quantity <= 1}
                        className="p-1 hover:bg-white rounded text-slate-600 disabled:opacity-30 transition-colors"
                      >
                        <MinusIcon className="h-3 w-3" />
                      </button>
                      <span className="w-4 text-center text-xs font-bold text-slate-800">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQty(index, item.quantity + 1)}
                        className="p-1 hover:bg-white rounded text-slate-600 transition-colors"
                      >
                        <PlusIcon className="h-3 w-3" />
                      </button>
                    </div>

                    <span className="font-black text-xs text-slate-900">
                      {formatRupiah(price * item.quantity)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Ringkasan Pembayaran */}
      <div className="p-4 border-t border-slate-100 space-y-4 bg-white">
        <div className="space-y-2.5 text-xs">
          <div className="flex justify-between items-center text-slate-500 font-medium">
            <span>Subtotal</span>
            <span className="font-bold text-slate-800">
              {formatRupiah(subtotal)}
            </span>
          </div>

          <div className="flex justify-between items-center text-slate-500 font-medium">
            <span>Diskon</span>
            <div className="relative">
              <input
                type="number"
                min={0}
                max={subtotal}
                value={discount || ""}
                onChange={(e) =>
                  setDiscount(Math.max(0, Number(e.target.value)))
                }
                placeholder="Rp 0"
                className="w-28 text-right bg-slate-100/80 border border-slate-200/60 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          <div className="border-t border-slate-100 pt-2.5" />

          <div className="flex justify-between items-center font-bold text-slate-900 text-sm">
            <span className="text-sm font-bold text-slate-800">Total</span>
            <span className="text-lg font-black text-blue-600">
              {formatRupiah(grandTotal)}
            </span>
          </div>
        </div>

        <button
          onClick={openCheckout}
          disabled={cart.length === 0}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold py-3.5 px-4 rounded-2xl shadow-md shadow-blue-500/20 transition-all flex items-center justify-between text-xs"
        >
          <span>Pesan Sekarang</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </aside>
  );
}