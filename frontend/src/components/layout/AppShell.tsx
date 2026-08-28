import { useRef, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { MenuIcon, CloseIcon } from "@/components/shared/icons";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { PosProvider } from "@/features/pos/PosContext";
import { Sidebar } from "@/components/layout/Sidebar";

const PAGE_META: Array<{ path: string; title: string; description: string }> = [
  {
    path: "/dashboard",
    title: "Dashboard",
    description: "Ringkasan kondisi bengkel hari ini",
  },
  {
    path: "/pos",
    title: "POS",
    description: "Transaksi penjualan sparepart & jasa servis",
  },
  {
    path: "/riwayat",
    title: "Riwayat Transaksi",
    description: "Semua transaksi POS yang tercatat",
  },
  {
    path: "/produk",
    title: "Produk & Stok",
    description: "Manajemen sparepart, harga beli, harga jual, dan stok",
  },
  {
    path: "/jasa",
    title: "Jasa Servis",
    description: "Katalog harga jasa servis",
  },
  {
    path: "/pengeluaran",
    title: "Pengeluaran",
    description: "Pencatatan pengeluaran operasional bengkel",
  },
  {
    path: "/laporan",
    title: "Laporan",
    description: "Analisis dan evaluasi perkembangan bengkel",
  },
  {
    path: "/pengguna",
    title: "Pengguna",
    description: "Manajemen akun Admin & Kasir",
  },
  {
    path: "/audit",
    title: "Audit Log",
    description: "Riwayat aktivitas penting sistem",
  },
];

export function AppShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const pageMeta = PAGE_META.find(
    (m) =>
      location.pathname === m.path ||
      location.pathname.startsWith(`${m.path}/`),
  );

  const navLockedRef = useRef(false);
  const [navLocked, setNavLocked] = useState(false);

  const handleNavClick = (to: string) => {
    if (navLockedRef.current) return;
    navLockedRef.current = true;
    setNavLocked(true);
    setMobileOpen(false);
    navigate(to);
    window.setTimeout(() => {
      navLockedRef.current = false;
      setNavLocked(false);
    }, 200);
  };

  return (
    <PosProvider>
      <div className="h-screen w-screen overflow-hidden bg-slate-100/70 flex">
        {/* Sidebar Desktop */}
        <aside className="hidden w-64 shrink-0 bg-white lg:block h-full">
          <Sidebar onNavClick={handleNavClick} navLocked={navLocked} />
        </aside>

        {/* Drawer Mobile */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
              onClick={() => setMobileOpen(false)}
            />
            <aside className="absolute left-0 top-0 h-full w-64 bg-white shadow-2xl">
              <div className="flex justify-end p-2">
                <button
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  onClick={() => setMobileOpen(false)}
                  aria-label="Tutup menu"
                >
                  <CloseIcon className="h-5 w-5" />
                </button>
              </div>
              <Sidebar onNavClick={handleNavClick} navLocked={navLocked} />
            </aside>
          </div>
        )}

        {/* Konten Utama & Topbar */}
        <div className="flex flex-1 flex-col min-w-0 h-full overflow-hidden">
          {/* Header Atas */}
          <header className="flex h-16 shrink-0 items-center justify-between bg-white px-4 md:px-6">
            <div className="flex items-center gap-3 min-w-0">
              <button
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden shrink-0"
                onClick={() => setMobileOpen(true)}
                aria-label="Buka menu"
              >
                <MenuIcon className="h-6 w-6" />
              </button>
              <div className="min-w-0">
                <h1 className="truncate text-base font-bold text-slate-900 tracking-tight">
                  {pageMeta?.title ?? "Bengkel"}
                </h1>
                {pageMeta?.description && (
                  <p className="truncate text-xs font-medium text-slate-400 hidden sm:block">
                    {pageMeta.description}
                  </p>
                )}
              </div>
            </div>

            {/* Notification Bell */}
            <div className="flex items-center gap-3 shrink-0">
              <NotificationBell />
            </div>
          </header>

          {/* Area Halaman */}
          <main className="flex-1 overflow-y-auto p-4 md:p-6 hide-scrollbar">
            <Outlet />
          </main>
        </div>
      </div>
    </PosProvider>
  );
}
