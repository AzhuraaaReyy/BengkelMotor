import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Modal } from "@/components/ui/Modal";
import { PaymentMethodSelector } from "@/features/pos/PaymentMethodSelector";
import { WaitingPaymentModal } from "@/features/pos/WaitingPaymentModal";
import { useToast } from "@/components/ui/Toast";
import { getProductsApi } from "@/lib/api/products";
import { getServicesApi } from "@/lib/api/services";
import { getCustomersApi } from "@/lib/api/customers";
import { checkoutSaleApi, createSaleApi, getSaleApi } from "@/lib/api/sales";
import { useNotifications } from "@/lib/useNotifications";
import { formatRupiah } from "@/lib/formatters";
import { PAYMENT_METHODS } from "@/lib/constants";
import { CustomerSelector } from "@/features/pos/CustomerSelector";
import { usePos } from "@/features/pos/PosContext";
import { PlusIcon, MinusIcon, TrashIcon } from "@/components/shared/icons";
import { RightCartSidebar } from "@/features/pos/RightCartSidebar";
import type { Product, Service, Customer, PaymentMethod } from "@/types";
import {
  Search,
  ShoppingCart,
  ArrowRight,
  X,
  Wallet,
  CheckCircle2,
  ChevronDown,
} from "lucide-react";

export function PosPage() {
  const toast = useToast();
  const { refresh: refreshNotifications } = useNotifications();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Memakai state & handler global dari PosContext
  const {
    cart,
    setCart,
    discount,
    setDiscount,
    subtotal,
    grandTotal,
    addProduct,
    addService,
    updateQty,
    removeLine,
    checkoutOpen,
    setCheckoutOpen,
  } = usePos();

  const [products, setProducts] = useState<Product[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<
    "ALL" | "PRODUCT" | "SERVICE"
  >("ALL");

  // =========================================================================
  // PENAMBAHAN: State untuk batas tampilan produk pada tab 'Semua' (default 10)
  // =========================================================================
  const [visibleProductLimit, setVisibleProductLimit] = useState(10);

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [paidAmount, setPaidAmount] = useState(0);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [waitingPaymentSale, setWaitingPaymentSale] = useState<any>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(
    null,
  );
  const [tabletCartOpen, setTabletCartOpen] = useState(false);
  const serviceDataRef = useRef({
    complaint: "",
    diagnosis_note: "",
    motorcycle_type: "",
  });

  // =========================================================================
  // PENAMBAHAN: Reset limit tampilan ke 10 jika pencarian / kategori berubah
  // =========================================================================
  useEffect(() => {
    setVisibleProductLimit(10);
  }, [search, categoryFilter]);

  // =========================================================================
  // PENAMBAHAN: Map kalkulasi stok tersisa secara realtime di UI
  // =========================================================================
  const remainingStockMap = useMemo(() => {
    const map = new Map<number, number>();
    products.forEach((p) => {
      map.set(p.id, p.current_stock);
    });
    cart.forEach((item) => {
      if (item.item_type === "PRODUCT" && item.product) {
        const current = map.get(item.product.id) ?? item.product.current_stock;
        map.set(item.product.id, current - item.quantity);
      }
    });
    return map;
  }, [products, cart]);

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

  useEffect(() => {
    const resumeId = searchParams.get("resume_payment");
    if (!resumeId) return;

    const resumeSale = async () => {
      try {
        const sale = await getSaleApi(Number(resumeId));
        if (sale.status === "PENDING") {
          setWaitingPaymentSale(sale);
        } else {
          toast.error("Transaksi sudah tidak aktif.");
        }
      } catch {
        toast.error("Gagal memuat transaksi.");
      } finally {
        setSearchParams({}, { replace: true });
      }
    };

    resumeSale();
  }, [searchParams, setSearchParams]);

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

  // =========================================================================
  // PENAMBAHAN: Pemotongan list produk aktif berdasar filter dan limit tab 'ALL'
  // =========================================================================
  const activeProducts = useMemo(() => {
    return filteredProducts.filter((p) => p.is_active);
  }, [filteredProducts]);

  const displayedProducts = useMemo(() => {
    if (categoryFilter === "ALL") {
      return activeProducts.slice(0, visibleProductLimit);
    }
    return activeProducts.slice(0, 60);
  }, [activeProducts, categoryFilter, visibleProductLimit]);

  const isOnlinePayment = ["QRIS", "VA"].includes(paymentMethod);

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
        discount_amount: discount,
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
        discount_amount: discount,
        is_service: hasServiceItems || undefined,
        complaint: hasServiceItems ? svc.complaint : undefined,
        diagnosis_note:
          hasServiceItems && svc.diagnosis_note
            ? svc.diagnosis_note
            : undefined,
        motorcycle_type:
          hasServiceItems && svc.motorcycle_type
            ? svc.motorcycle_type
            : undefined,
      });
      if (isOnlinePayment) {
        setWaitingPaymentSale(paid);
        setCheckoutOpen(false);
      } else {
        setCheckoutOpen(false);
        refreshNotifications();
        navigate(`/pos/struk/${paid.id}`);
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
    setCart([]);
    setPaidAmount(0);
    serviceDataRef.current = {
      complaint: "",
      diagnosis_note: "",
      motorcycle_type: "",
    };
  };

  if (waitingPaymentSale) {
    return (
      <WaitingPaymentModal
        sale={waitingPaymentSale}
        onPaid={(s) => {
          setWaitingPaymentSale(null);
          refreshNotifications();
          navigate(`/pos/struk/${s.id}`);
        }}
        onExpired={() => {
          setWaitingPaymentSale(null);
          toast.error("Pembayaran kedaluwarsa. Stok sudah dikembalikan.");
          reset();
        }}
        onClose={() => {
          setWaitingPaymentSale(null);
          toast.info(
            "Tagihan tetap berjalan. Cek di Riwayat Transaksi untuk melanjutkan.",
          );
          reset();
        }}
      />
    );
  }

  return (
    <div className="flex gap-6 min-h-screen bg-[#f4f6fb] font-sans text-slate-800 -m-4 p-4 pb-24 md:-m-6 md:p-6 md:pb-6 items-start">
      {/* Area Katalog (Kiri) */}
      <div className="flex-1 min-w-0 space-y-6">
        {/* Search Bar + Filter Buttons */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama produk atau jasa..."
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-xs font-medium text-slate-800 shadow-2xs placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="bg-white p-1 rounded-xl border border-slate-200 flex gap-1 shadow-2xs shrink-0">
            <button
              onClick={() => setCategoryFilter("ALL")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                categoryFilter === "ALL"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              Semua
            </button>
            <button
              onClick={() => setCategoryFilter("PRODUCT")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                categoryFilter === "PRODUCT"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              Sparepart
            </button>
            <button
              onClick={() => setCategoryFilter("SERVICE")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                categoryFilter === "SERVICE"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              Jasa
            </button>
          </div>
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
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3 gap-3">
                      {displayedProducts.map((p) => {
                        const inCart = cart.some(
                          (c) =>
                            c.item_type === "PRODUCT" && c.product?.id === p.id,
                        );
                        // PENAMBAHAN: Ambil stok sisa realtime dari map
                        const currentStock =
                          remainingStockMap.get(p.id) ?? p.current_stock;

                        return (
                          <button
                            key={p.id}
                            onClick={() => addProduct(p)}
                            disabled={currentStock <= 0}
                            className={`bg-white rounded-2xl p-3.5 border transition-all text-left flex items-center gap-3 relative group hover:shadow-md min-h-[104px] ${
                              inCart
                                ? "border-blue-600 ring-1 ring-blue-600 bg-blue-50/20"
                                : "border-slate-200/80 hover:border-blue-400"
                            } ${currentStock <= 0 ? "opacity-50 cursor-not-allowed" : ""}`}
                          >
                            {/* Gambar / Ikon Produk */}
                            <div className="w-16 h-16 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 overflow-hidden border border-slate-100">
                              {p.image ? (
                                <img
                                  src={p.image}
                                  alt={p.name}
                                  className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                                  onError={(e) => {
                                    (
                                      e.target as HTMLImageElement
                                    ).style.display = "none";
                                    const parent = (e.target as HTMLElement)
                                      .parentElement;
                                    if (parent) {
                                      parent.innerHTML =
                                        '<span class="text-xl">⚙️</span>';
                                    }
                                  }}
                                />
                              ) : (
                                <span className="text-xl">⚙️</span>
                              )}
                            </div>

                            {/* Informasi Produk (Nama, Harga, Stok) */}
                            <div className="flex-1 min-w-0 flex flex-col justify-between self-stretch py-0.5">
                              <div>
                                <h3 className="font-bold text-xs text-slate-800 line-clamp-2 group-hover:text-blue-600 transition-colors leading-tight">
                                  {p.name}
                                </h3>
                              </div>

                              <div className="mt-1 space-y-1">
                                <p className="text-xs font-black text-blue-600 leading-none">
                                  {formatRupiah(p.sale_price)}
                                </p>
                                <div>
                                  <span
                                    className={`text-[10px] font-bold px-2 py-0.5 rounded-md inline-block leading-none ${
                                      currentStock <= 0
                                        ? "bg-red-100 text-red-600"
                                        : currentStock <= 5
                                          ? "bg-amber-100 text-amber-700"
                                          : "bg-emerald-100 text-emerald-700"
                                    }`}
                                  >
                                    {currentStock <= 0
                                      ? "Stok Habis"
                                      : `Stok: ${currentStock}`}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* ========================================================================= */}
                    {/* PENAMBAHAN: Tombol Tampilkan Lebih Banyak khusus untuk Tab 'Semua' (ALL)  */}
                    {/* ========================================================================= */}
                    {categoryFilter === "ALL" &&
                      activeProducts.length > visibleProductLimit && (
                        <div className="mt-4 text-center">
                          <button
                            onClick={() =>
                              setVisibleProductLimit((prev) => prev + 20)
                            }
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 text-blue-600 font-bold text-xs rounded-xl shadow-2xs transition-all active:scale-95"
                          >
                            <span>Tampilkan Lebih Banyak</span>
                            <ChevronDown className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                  </>
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3 gap-3">
                    {filteredServices
                      .filter((s) => s.is_active)
                      .map((s) => {
                        const inCart = cart.some(
                          (c) =>
                            c.item_type === "SERVICE" && c.service?.id === s.id,
                        );
                        return (
                          <button
                            key={s.id}
                            onClick={() => addService(s)}
                            className={`bg-white rounded-2xl p-3.5 border transition-all text-left flex items-center gap-3 relative group hover:shadow-md min-h-[90px] ${
                              inCart
                                ? "border-blue-600 ring-1 ring-blue-600 bg-blue-50/20"
                                : "border-slate-200/80 hover:border-blue-400"
                            }`}
                          >
                            <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 border border-slate-100">
                              <span className="text-xl">🛠️</span>
                            </div>

                            <div className="flex-1 min-w-0 flex flex-col justify-between self-stretch py-0.5">
                              <h3 className="font-bold text-xs text-slate-800 line-clamp-2 group-hover:text-blue-600 transition-colors leading-tight">
                                {s.name}
                              </h3>
                              <p className="text-xs font-black text-blue-600 leading-none mt-1">
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

      {/* ---------------- RIGHT CART SIDEBAR DESKTOP (FIXED POS) ---------------- */}
      <div className="hidden xl:block w-80 shrink-0 sticky top-0 h-[calc(100vh-3rem)]">
        <RightCartSidebar />
      </div>

      {/* ---------------- TABLET & MOBILE BOTTOM BAR ---------------- */}
      {cart.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white p-3 xl:hidden">
          <button
            onClick={() => setTabletCartOpen(true)}
            className="flex w-full items-center justify-between rounded-2xl bg-blue-600 px-4 py-3 text-white shadow-lg shadow-blue-500/20 active:scale-[0.99] transition-transform"
          >
            <span className="text-xs font-bold">
              Keranjang ({cart.length} Item) - Lihat Pesanan
            </span>
            <span className="flex items-center gap-1.5 text-xs font-bold">
              <span>{formatRupiah(grandTotal)}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </button>
        </div>
      )}

      <RightCartSidebar
        isOpenMobile={tabletCartOpen}
        onCloseMobile={() => setTabletCartOpen(false)}
      />

      {/* ---------------- TABLET & MOBILE BOTTOM BAR ---------------- */}
      {cart.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white p-3 xl:hidden">
          <button
            onClick={() => setTabletCartOpen(true)}
            className="flex w-full items-center justify-between rounded-2xl bg-blue-600 px-4 py-3 text-white shadow-lg shadow-blue-500/20 active:scale-[0.99] transition-transform"
          >
            <span className="text-xs font-bold">
              Keranjang ({cart.reduce((acc, item) => acc + item.quantity, 0)}{" "}
              Item) - Lihat Pesanan
            </span>
            <span className="flex items-center gap-1.5 text-xs font-bold">
              <span>{formatRupiah(grandTotal)}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </button>
        </div>
      )}

      {/* ---------------- MODAL KONFIRMASI PEMBAYARAN ---------------- */}
      <Modal
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        title="Konfirmasi Pembayaran"
        size="lg"
        footer={
          <div className="flex items-center justify-end gap-3 w-full">
            <button
              onClick={() => setCheckoutOpen(false)}
              disabled={checkoutLoading}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-50 transition-colors"
            >
              Batal
            </button>
            <button
              onClick={doCheckout}
              disabled={
                checkoutLoading ||
                (!isOnlinePayment &&
                  (paidAmount <= 0 || paidAmount < grandTotal))
              }
              className={`flex items-center gap-2 bg-[#1d4ed8] hover:bg-blue-700 text-white font-semibold text-xs px-6 py-2.5 rounded-xl shadow-md transition-all ${
                !isOnlinePayment && (paidAmount <= 0 || paidAmount < grandTotal)
                  ? "opacity-50 cursor-not-allowed"
                  : ""
              }`}
            >
              <CheckCircle2 className="h-4 w-4" />
              Selesaikan Pembayaran
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="rounded-2xl bg-[#f8fafc] border border-slate-200/80 p-5 flex items-center gap-4 shadow-2xs">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0 border border-blue-100">
              <Wallet className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                TOTAL PEMBAYARAN
              </p>
              <p className="text-2xl font-black text-blue-600 mt-0.5">
                {formatRupiah(grandTotal)}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Mohon pilih metode pembayaran
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">
              Pelanggan
            </label>
            <CustomerSelector
              customers={customers}
              selectedId={selectedCustomerId}
              onSelect={setSelectedCustomerId}
              onCustomerCreated={(c) => {
                setCustomers((prev) => [...prev, c]);
                setSelectedCustomerId(c.id);
              }}
              isRequired={hasServiceItems}
              onServiceDataChange={(data) => {
                serviceDataRef.current = data;
              }}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">
              Metode Pembayaran
            </label>
            <PaymentMethodSelector
              value={paymentMethod}
              onChange={(m) =>
                setPaymentMethod(m as keyof typeof PAYMENT_METHODS)
              }
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 space-y-3">
              <p className="text-xs font-bold text-slate-800">
                Detail Transaksi
              </p>
              <div className="space-y-2 max-h-[120px] overflow-y-auto pr-1">
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
                      className="flex items-center justify-between text-xs"
                    >
                      <span className="text-slate-600 truncate flex-1 mr-2">
                        {name}{" "}
                        <span className="text-slate-400">
                          {item.quantity} x {formatRupiah(price)}
                        </span>
                      </span>
                      <span className="font-bold text-slate-800 tabular-nums">
                        {formatRupiah(price * item.quantity)}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="pt-2 border-t border-slate-100 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-500">
                  <span>Subtotal</span>
                  <span className="font-semibold text-slate-700">
                    {formatRupiah(subtotal)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Diskon</span>
                  <span className="font-semibold text-slate-700">
                    {formatRupiah(discount)}
                  </span>
                </div>
                <div className="flex justify-between pt-2 font-bold text-slate-900 border-t border-slate-100 text-sm">
                  <span>Total Pembayaran</span>
                  <span className="text-blue-600">
                    {formatRupiah(grandTotal)}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 space-y-3">
              <p className="text-xs font-bold text-slate-800">
                Pembayaran Tunai
              </p>
              {!isOnlinePayment ? (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-500">
                      Jumlah Bayar
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={paidAmount || ""}
                      onChange={(e) => setPaidAmount(Number(e.target.value))}
                      placeholder="Rp 0"
                      className="w-full rounded-xl border border-slate-200 bg-white py-2.5 px-3 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-500">
                      Kembalian
                    </label>
                    <div className="rounded-xl bg-emerald-50/80 border border-emerald-100 p-2.5">
                      <span className="text-xs font-black text-emerald-600">
                        {formatRupiah(Math.max(0, paidAmount - grandTotal))}
                      </span>
                    </div>
                  </div>
                  {!isOnlinePayment &&
                    paidAmount > 0 &&
                    paidAmount < grandTotal && (
                      <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-xl p-2.5">
                        <span className="flex items-center gap-1.5">
                          <span>⚠</span>
                          <span>
                            Jumlah bayar kurang Rp{" "}
                            {formatRupiah(grandTotal - paidAmount)}
                          </span>
                        </span>
                      </div>
                    )}
                </div>
              ) : (
                <div className="py-6 text-center text-xs text-slate-400">
                  Metode pembayaran digital tidak memerlukan input tunai manual.
                </div>
              )}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
