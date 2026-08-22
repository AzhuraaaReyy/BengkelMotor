import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { ReceiptView } from "@/features/pos/ReceiptView";
import { PaymentMethodSelector } from "@/features/pos/PaymentMethodSelector";
import { WaitingPaymentModal } from "@/features/pos/WaitingPaymentModal";
import { useToast } from "@/components/ui/Toast";
import { getProductsApi } from "@/lib/api/products";
import { getServicesApi } from "@/lib/api/services";
import { getCustomersApi } from "@/lib/api/customers";
import { checkoutSaleApi, createSaleApi } from "@/lib/api/sales";
import { formatRupiah, formatNumber } from "@/lib/formatters";
import { PAYMENT_METHODS } from "@/lib/constants";
import { PlusIcon, MinusIcon, TrashIcon } from "@/components/shared/icons";
import { CustomerSelector } from "@/features/pos/CustomerSelector";
import type { Product, Service, Customer } from "@/types";
import { Search, ShoppingCart, ArrowRight } from "lucide-react";

interface CartLine {
  item_type: "PRODUCT" | "SERVICE";
  product?: Product;
  service?: Service;
  quantity: number;
}

export function PosPage() {
  const toast = useToast();

  const [products, setProducts] = useState<Product[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<
    "ALL" | "PRODUCT" | "SERVICE"
  >("ALL");

  const [cart, setCart] = useState<CartLine[]>([]);
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] =
    useState<keyof typeof PAYMENT_METHODS>("CASH");
  const [paidAmount, setPaidAmount] = useState(0);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [paidSale, setPaidSale] = useState<Awaited<
    ReturnType<typeof checkoutSaleApi>
  > | null>(null);
  const [waitingPaymentSale, setWaitingPaymentSale] = useState<any>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const serviceDataRef = useRef({ complaint: "", diagnosis_note: "", motorcycle_type: "" });

  const hasServiceItems = useMemo(
    () => cart.some((l) => l.item_type === "SERVICE"),
    [cart],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [pd, sv, cu] = await Promise.all([
        getProductsApi({ per_page: 200, all: 1 }),
        getServicesApi({ per_page: 200, all: 1 }),
        getCustomersApi({ per_page: 200 }),
      ]);
      setProducts(pd.data);
      setServices(sv.data);
      setCustomers(cu.data);
    } catch (e) {
      const err = e as { message?: string };
      setLoadError(err.message || "Gagal memuat katalog.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filteredProducts = useMemo(() => {
    if (categoryFilter === "SERVICE") return [];
    const q = search.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q),
    );
  }, [products, search, categoryFilter]);

  const filteredServices = useMemo(() => {
    if (categoryFilter === "PRODUCT") return [];
    const q = search.toLowerCase();
    return services.filter((s) => s.name.toLowerCase().includes(q));
  }, [services, search, categoryFilter]);

  const addProduct = (p: Product) => {
    if (p.current_stock <= 0) {
      toast.error(`Stok ${p.name} habis.`);
      return;
    }
    setCart((prev) => {
      const existing = prev.find(
        (l) => l.item_type === "PRODUCT" && l.product?.id === p.id,
      );
      if (existing) {
        if (existing.quantity >= p.current_stock) {
          toast.error(`Stok ${p.name} hanya ${formatNumber(p.current_stock)}.`);
          return prev;
        }
        return prev.map((l) =>
          l === existing ? { ...l, quantity: l.quantity + 1 } : l,
        );
      }
      return [...prev, { item_type: "PRODUCT", product: p, quantity: 1 }];
    });
  };

  const addService = (s: Service) => {
    setCart((prev) => {
      const existing = prev.find(
        (l) => l.item_type === "SERVICE" && l.service?.id === s.id,
      );
      if (existing) {
        return prev.map((l) =>
          l === existing ? { ...l, quantity: l.quantity + 1 } : l,
        );
      }
      return [...prev, { item_type: "SERVICE", service: s, quantity: 1 }];
    });
  };

  const updateQty = (index: number, qty: number) => {
    setCart((prev) =>
      prev.map((l, i) => {
        if (i !== index) return l;
        if (
          l.item_type === "PRODUCT" &&
          qty > (l.product?.current_stock ?? 0)
        ) {
          toast.error(
            `Stok maksimal ${formatNumber(l.product?.current_stock ?? 0)}.`,
          );
          return l;
        }
        return { ...l, quantity: qty };
      }),
    );
  };

  const removeLine = (index: number) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
  };

  const subtotal = cart.reduce((sum, l) => {
    const price =
      l.item_type === "PRODUCT"
        ? (l.product?.sale_price ?? 0)
        : (l.service?.sale_price ?? 0);
    return sum + price * l.quantity;
  }, 0);

  const safeDiscount = Math.min(discount, subtotal);
  const grandTotal = subtotal - safeDiscount;

  const openCheckout = () => {
    if (cart.length === 0) return;
    setPaidAmount(grandTotal);
    setCheckoutOpen(true);
  };

  const isOnlinePayment = ["QRIS", "VA", "GOPAY"].includes(paymentMethod);

  const doCheckout = async () => {
    const svc = serviceDataRef.current;
    if (hasServiceItems && !svc.complaint.trim()) {
      toast.error("Keluhan pelanggan wajib diisi untuk transaksi servis.");
      return;
    }
    setCheckoutLoading(true);
    try {
      const sale = await createSaleApi({
        customer_id: selectedCustomerId ?? undefined,
        discount_amount: safeDiscount,
        items: cart.map((l) =>
          l.item_type === "PRODUCT"
            ? {
                item_type: "PRODUCT",
                product_id: l.product!.id,
                quantity: l.quantity,
              }
            : {
                item_type: "SERVICE",
                service_id: l.service!.id,
                quantity: l.quantity,
              },
        ),
      });
      const paid = await checkoutSaleApi(sale.id, {
        payment_method: paymentMethod,
        paid_amount: isOnlinePayment ? undefined : paidAmount,
        discount_amount: safeDiscount,
        is_service: hasServiceItems || undefined,
        complaint: hasServiceItems ? svc.complaint : undefined,
        diagnosis_note: hasServiceItems && svc.diagnosis_note ? svc.diagnosis_note : undefined,
        motorcycle_type: hasServiceItems && svc.motorcycle_type ? svc.motorcycle_type : undefined,
      });
      if (isOnlinePayment) {
        setWaitingPaymentSale(paid);
        setCheckoutOpen(false);
      } else {
        setPaidSale(paid);
        setCheckoutOpen(false);
      }
    } catch (e) {
      const err = e as { message?: string; errors?: Record<string, string[]> };
      if (err.errors) {
        const msg = Object.values(err.errors).flat().join(" ");
        toast.error(msg || err.message || "Checkout gagal.");
      } else {
        toast.error(err.message || "Checkout gagal.");
      }
    } finally {
      setCheckoutLoading(false);
    }
  };

  const reset = () => {
    setPaidSale(null);
    setCart([]);
    setDiscount(0);
    setPaidAmount(0);
    serviceDataRef.current = { complaint: "", diagnosis_note: "", motorcycle_type: "" };
  };

  if (waitingPaymentSale) {
    return (
      <WaitingPaymentModal
        sale={waitingPaymentSale}
        onPaid={(s) => {
          setPaidSale(s);
          setWaitingPaymentSale(null);
        }}
        onExpired={() => {
          setWaitingPaymentSale(null);
          toast.error("Pembayaran kedaluwarsa. Stok sudah dikembalikan.");
          reset();
        }}
        onClose={() => {
          setWaitingPaymentSale(null);
          toast.info("Tagihan tetap berjalan. Cek di Riwayat Transaksi untuk melanjutkan.");
          reset();
        }}
      />
    );
  }

  if (paidSale) {
    return (
      <ReceiptView
        sale={paidSale}
        onClose={reset}
        customerName={paidSale.customer?.name ?? ""}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f6fb] font-sans text-slate-800 -m-4 p-4 pb-24 md:-m-6 md:p-6 md:pb-6">
      {/* ---------------- TOP HEADER ---------------- */}
      

      {/* ---------------- MAIN CONTENT GRID ---------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
        {/* === KATALOG PRODUK & JASA (KIRI) === */}
        <div className="lg:col-span-8 space-y-6">
          {/* Header Katalog + Filter Button */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold text-slate-900">
                Produk & Jasa
              </h1>
            </div>

            <div className="bg-white p-1 rounded-xl border border-slate-200 flex gap-1 shadow-2xs">
              <button
                onClick={() => setCategoryFilter("ALL")}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  categoryFilter === "ALL"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                Semua
              </button>
              <button
                onClick={() => setCategoryFilter("PRODUCT")}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  categoryFilter === "PRODUCT"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                Sparepart
              </button>
              <button
                onClick={() => setCategoryFilter("SERVICE")}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  categoryFilter === "SERVICE"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                Jasa
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama produk atau jasa..."
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-xs font-medium text-slate-800 shadow-2xs placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {loading ? (
            <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center text-xs text-slate-500">
              Memuat katalog produk & jasa...
            </div>
          ) : loadError ? (
            <div className="bg-red-50 text-red-600 p-6 rounded-2xl border border-red-200 text-xs flex justify-between items-center">
              <span>{loadError}</span>
              <button onClick={load} className="underline font-bold">
                Coba Lagi
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* SECTION 1: SPAREPART */}
              {(categoryFilter === "ALL" || categoryFilter === "PRODUCT") && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-1 h-3.5 bg-blue-600 rounded-full"></div>
                    <h2 className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                      PRODUK / SPAREPART
                    </h2>
                  </div>

                  {filteredProducts.length === 0 ? (
                    <div className="bg-white p-6 rounded-2xl text-center text-xs text-slate-400">
                      Sparepart tidak ditemukan.
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                      {filteredProducts
                        .filter((p) => p.is_active)
                        .slice(0, 60)
                        .map((p) => {
                          const inCart = cart.some(
                            (c) =>
                              c.item_type === "PRODUCT" &&
                              c.product?.id === p.id,
                          );
                          return (
                            <button
                              key={p.id}
                              onClick={() => addProduct(p)}
                              disabled={p.current_stock <= 0}
                              className={`bg-white rounded-2xl p-4 border transition-all text-left flex items-start gap-3 relative group hover:shadow-md ${
                                inCart
                                  ? "border-blue-600 ring-1 ring-blue-600"
                                  : "border-slate-200/80 hover:border-blue-400"
                              } ${p.current_stock <= 0 ? "opacity-50 cursor-not-allowed" : ""}`}
                            >
                              {/* Dummy Placeholder Image Icon */}
                              <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                                <span className="text-xl">⚙️</span>
                              </div>

                              <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-xs text-slate-800 truncate group-hover:text-blue-600 transition-colors">
                                  {p.name}
                                </h3>
                                <p className="text-xs font-extrabold text-blue-600 mt-1">
                                  {formatRupiah(p.sale_price)}
                                </p>

                                <div className="mt-2">
                                  <span
                                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block ${
                                      p.current_stock <= 0
                                        ? "bg-red-100 text-red-600"
                                        : p.current_stock <= 5
                                          ? "bg-amber-100 text-amber-700"
                                          : "bg-emerald-100 text-emerald-700"
                                    }`}
                                  >
                                    {p.current_stock <= 0
                                      ? "Stok Habis"
                                      : `Stok: ${p.current_stock}`}
                                  </span>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                    </div>
                  )}
                </div>
              )}

              {/* SECTION 2: JASA SERVIS */}
              {(categoryFilter === "ALL" || categoryFilter === "SERVICE") && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-1 h-3.5 bg-blue-600 rounded-full"></div>
                    <h2 className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                      JASA SERVIS
                    </h2>
                  </div>

                  {filteredServices.length === 0 ? (
                    <div className="bg-white p-6 rounded-2xl text-center text-xs text-slate-400">
                      Jasa servis tidak ditemukan.
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                      {filteredServices
                        .filter((s) => s.is_active)
                        .map((s) => {
                          const inCart = cart.some(
                            (c) =>
                              c.item_type === "SERVICE" &&
                              c.service?.id === s.id,
                          );
                          return (
                            <button
                              key={s.id}
                              onClick={() => addService(s)}
                              className={`bg-white rounded-2xl p-4 border transition-all text-left flex items-start gap-3 relative group hover:shadow-md ${
                                inCart
                                  ? "border-blue-600 ring-1 ring-blue-600"
                                  : "border-slate-200/80 hover:border-blue-400"
                              }`}
                            >
                              <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                                <span className="text-xl">🛠️</span>
                              </div>

                              <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-xs text-slate-800 truncate group-hover:text-blue-600 transition-colors">
                                  {s.name}
                                </h3>
                                <p className="text-xs font-extrabold text-blue-600 mt-1">
                                  {formatRupiah(s.sale_price)}
                                </p>
                              </div>
                            </button>
                          );
                        })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

         
        </div>

        {/* === KERANJANG BELANJA (KANAN) === */}
        <div id="pos-cart" className="lg:col-span-4 scroll-mt-24">
          <div className="bg-white rounded-3xl p-4 lg:p-5 border border-slate-200/80 shadow-xs flex flex-col h-full lg:min-h-[580px] justify-between">
            <div>
              {/* Header Keranjang */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <h2 className="font-bold text-slate-900 text-base">
                  Keranjang
                </h2>
                {cart.length > 0 && (
                  <button
                    onClick={() => setCart([])}
                    className="p-1.5 text-red-500 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                    title="Kosongkan Keranjang"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* List Cart Items / Empty State */}
              <div className="mt-4">
                {cart.length === 0 ? (
                  <div className="py-16 text-center flex flex-col items-center justify-center">
                    <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center text-blue-500 mb-4">
                      <ShoppingCart className="h-9 w-9" />
                    </div>
                    <h3 className="font-bold text-slate-800 text-sm mb-1">
                      Keranjang kosong
                    </h3>
                    <p className="text-xs text-slate-400 max-w-[200px]">
                      Pilih produk atau jasa di samping kiri.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
                    {cart.map((item, index) => {
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
                          className="p-3 bg-slate-50/70 rounded-2xl border border-slate-100 flex flex-col gap-2"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-bold text-xs text-slate-800">
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
                                onClick={() =>
                                  updateQty(index, item.quantity - 1)
                                }
                                disabled={item.quantity <= 1}
                                className="p-1 hover:bg-slate-100 rounded text-slate-600 disabled:opacity-30"
                              >
                                <MinusIcon className="h-3 w-3" />
                              </button>
                              <span className="w-6 text-center text-xs font-bold text-slate-800">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() =>
                                  updateQty(index, item.quantity + 1)
                                }
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
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Footer Calculation & Checkout Button */}
            <div className="pt-4 border-t border-slate-100 space-y-3">
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
                    onChange={(e) =>
                      setDiscount(Math.max(0, Number(e.target.value)))
                    }
                    placeholder="Rp 0"
                    className="w-24 text-right bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="flex justify-between items-center pt-2 font-bold text-slate-900 text-sm">
                  <span>Total</span>
                  <span className="text-base text-slate-900">
                    {formatRupiah(grandTotal)}
                  </span>
                </div>
              </div>

              {/* Checkout Button */}
              <button
                onClick={openCheckout}
                disabled={cart.length === 0}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold py-3.5 px-4 rounded-2xl shadow-md shadow-blue-500/20 transition-all flex items-center justify-between text-xs"
              >
                <span>Bayar - {formatRupiah(grandTotal)}</span>
                <div className="bg-white/20 p-1 rounded-full">
                  <ArrowRight className="h-3.5 w-3.5" />
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ---------------- MODAL CHECKOUT ---------------- */}
      <Modal
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        title="Konfirmasi Pembayaran"
        size="lg"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setCheckoutOpen(false)}
              disabled={checkoutLoading}
            >
              Batal
            </Button>
            <Button onClick={doCheckout} loading={checkoutLoading}>
              {isOnlinePayment ? "Buat Tagihan" : "Selesaikan Pembayaran"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="rounded-xl bg-blue-50 p-4 text-center">
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
              Total Pembayaran
            </p>
            <p className="text-2xl font-black text-blue-600 mt-1">
              {formatRupiah(grandTotal)}
            </p>
          </div>
          <CustomerSelector
            customers={customers}
            selectedId={selectedCustomerId}
            onSelect={setSelectedCustomerId}
            onCustomerCreated={(c) => {
              setCustomers((prev) => [...prev, c]);
              setSelectedCustomerId(c.id);
            }}
            isRequired={hasServiceItems}
            onServiceDataChange={(data) => { serviceDataRef.current = data; }}
          />
          <PaymentMethodSelector value={paymentMethod} onChange={(m) => setPaymentMethod(m as keyof typeof PAYMENT_METHODS)} />
          {!isOnlinePayment && (
            <>
              <Input
                label="Jumlah Dibayar"
                name="paid_amount"
                type="number"
                min={0}
                value={paidAmount || ""}
                onChange={(e) => setPaidAmount(Number(e.target.value))}
              />
              <div className="flex items-center justify-between rounded-xl bg-emerald-50 p-3">
                <span className="text-xs font-bold text-emerald-800">
                  Kembalian
                </span>
                <span className="text-sm font-black text-emerald-600">
                  {formatRupiah(Math.max(0, paidAmount - grandTotal))}
                </span>
              </div>
            </>
          )}
          {isOnlinePayment && (
            <p className="text-xs text-center text-gray-500">
              Tagihan akan dibuat dengan status Menunggu Bayar. Stok di-reserve otomatis.
            </p>
          )}
        </div>
      </Modal>

      {/* Sticky cart bar — mobile & tablet portrait only; scrolls to the cart
          panel so the Kasir can review items before paying. */}
      {cart.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white p-3 md:hidden">
          <button
            onClick={() =>
              document
                .getElementById("pos-cart")
                ?.scrollIntoView({ behavior: "smooth", block: "start" })
            }
            className="flex w-full items-center justify-between rounded-2xl bg-blue-600 px-4 py-3 text-white shadow-lg shadow-blue-500/20"
          >
            <span className="text-xs font-bold">
              Keranjang ({cart.length})
            </span>
            <span className="flex items-center gap-1.5 text-xs font-bold">
              <span>{formatRupiah(grandTotal)}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
