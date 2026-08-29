import { usePos } from "./PosContext";
import { formatRupiah } from "@/lib/formatters";
import { PlusIcon, MinusIcon, TrashIcon } from "@/components/shared/icons";
import { ShoppingCart, ArrowRight, Wrench, X } from "lucide-react";

interface RightCartSidebarProps {
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export function RightCartSidebar({
  isOpenMobile = false,
  onCloseMobile,
}: RightCartSidebarProps) {
  const {
    cart,
    subtotal,
    discount,
    setDiscount,
    grandTotal,
    updateQty,
    removeLine,
    openCheckout,
  } = usePos();

  const totalItemsCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  // Komponen isi keranjang utama (Gaya visual 100% sama persis antara Desktop & Mobile/Tablet)
  const cartContent = (
    <div className="flex-1 bg-white rounded-[24px] border border-slate-200/80 shadow-xs flex flex-col overflow-hidden h-full">
      {/* Header Keranjang */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3.5 text-white flex items-center justify-between shrink-0 relative overflow-hidden">
        <div className="flex items-center gap-2.5 z-10">
          <div className="p-1.5 rounded-lg bg-white/15 backdrop-blur-xs text-white">
            <ShoppingCart className="h-4 w-4" />
          </div>
          <h2 className="font-extrabold text-white text-xs tracking-wider">
            KERANJANG
          </h2>
          <span className="bg-white/20 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
            {totalItemsCount}
          </span>
        </div>

        {/* Tombol Close khusus untuk Drawer Mobile/Tablet */}
        {onCloseMobile && (
          <button
            onClick={onCloseMobile}
            className="xl:hidden text-white/80 hover:text-white p-1 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Cart Items List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0 divide-y divide-slate-100/60 hide-scrollbar">
        {cart.length === 0 ? (
          <div className="py-20 text-center flex flex-col items-center justify-center">
            <div className="w-14 h-14 bg-slate-100/80 rounded-full flex items-center justify-center text-slate-400 mb-3 border border-slate-200/50">
              <ShoppingCart className="h-6 w-6" />
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
                className={`flex gap-3 pt-3 ${index === 0 ? "pt-0" : ""}`}
              >
                {/* Thumbnail Gambar / Icon */}
                <div className="h-12 w-12 shrink-0 rounded-xl bg-blue-600 border border-slate-100 overflow-hidden flex items-center justify-center self-start">
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
                        <ShoppingCart className="h-5 w-5 text-white" />
                      ) : (
                        <Wrench className="h-5 w-5 text-blue-600" />
                      )}
                    </div>
                  )}
                </div>

                {/* Info Item */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-1">
                    <div className="min-w-0 pr-1">
                      <p className="font-bold text-xs text-slate-800 truncate leading-tight">
                        {name}
                      </p>
                      <p className="text-[11px] font-bold text-blue-600 mt-0.5">
                        {formatRupiah(price)}
                      </p>
                    </div>

                    <button
                      onClick={() => removeLine(index)}
                      className="text-slate-600 hover:text-red-500 transition-colors p-0.5 shrink-0"
                      title="Hapus barang"
                    >
                      <TrashIcon className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Stepper Kuantitas & Subtotal Item */}
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-2 py-0.5">
                      <button
                        onClick={() => updateQty(index, item.quantity - 1)}
                        disabled={item.quantity <= 1}
                        className="text-black hover:text-slate-600 disabled:opacity-70 transition-colors"
                      >
                        <MinusIcon className="h-3 w-3" />
                      </button>
                      <span className="text-xs font-bold text-slate-800 min-w-[12px] text-center">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQty(index, item.quantity + 1)}
                        className="text-slate-600 hover:text-slate-900 transition-colors"
                      >
                        <PlusIcon className="h-3 w-3" />
                      </button>
                    </div>

                    <span className="font-extrabold text-xs text-slate-900">
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
      <div className="p-4 border-t border-slate-100 space-y-3.5 bg-white shrink-0">
        <div className="space-y-2 text-xs">
          <div className="flex justify-between items-center text-slate-500 font-medium">
            <span>Subtotal</span>
            <span className="font-bold text-slate-900">
              {formatRupiah(subtotal)}
            </span>
          </div>

          <div className="flex justify-between items-center text-slate-500 font-medium">
            <div className="flex items-center gap-1.5">
              <span>Diskon</span>
            </div>
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
                className="w-24 text-right bg-slate-100/70 border-0 rounded-xl px-3 py-1 text-xs font-bold text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          <div className="flex justify-between items-center font-bold text-slate-900 pt-1">
            <span className="text-xs font-extrabold text-slate-800 tracking-wider uppercase">
              TOTAL
            </span>
            <span className="text-lg font-black text-blue-600">
              {formatRupiah(grandTotal)}
            </span>
          </div>
        </div>

        <button
          onClick={() => {
            openCheckout();
            if (onCloseMobile) onCloseMobile();
          }}
          disabled={cart.length === 0}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold py-3.5 px-4 rounded-xl shadow-md shadow-blue-500/20 transition-all flex items-center justify-between text-xs active:scale-[0.99]"
        >
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4" />
            <span>Proses Pembayaran</span>
          </div>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* 1. TAMPILAN DESKTOP (Fixed di kanan layar tanpa card luar pembungkus ganda) */}
      <aside className="w-80 shrink-0 hidden xl:flex flex-col fixed right-6 top-20 bottom-6 z-20 p-0">
        {cartContent}
      </aside>

      {/* 2. TAMPILAN MOBILE & TABLET (Drawer slide-over) */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 xl:hidden flex justify-end">
          <div
            className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          ></div>
          <div className="relative w-full max-w-sm h-full p-3 flex flex-col z-10 bg-transparent">
            {cartContent}
          </div>
        </div>
      )}
    </>
  );
}
