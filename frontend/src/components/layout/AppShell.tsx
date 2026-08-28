import { useRef, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/app/auth/AuthContext";
import { useToast } from "@/components/ui/Toast";
import {
  BoxIcon,
  CoinsIcon,
  DashboardIcon,
  HistoryIcon,
  LogoutIcon,
  MenuIcon,
  PosIcon,
  ReportIcon,
  ServiceIcon,
  ShieldIcon,
  TagIcon,
  UserIcon,
  WrenchIcon,
  CloseIcon,
} from "@/components/shared/icons";
import { ROLE_LABEL } from "@/lib/constants";
import { Button } from "@/components/ui/Button";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { RightCartSidebar } from "@/features/pos/RightCartSidebar";
import { PosProvider } from "@/features/pos/PosContext";

interface NavItem {
  to: string;
  label: string;
  icon: (p: React.SVGProps<SVGSVGElement>) => JSX.Element;
  roles: Array<"ADMIN" | "CASHIER">;
}

const NAV_ITEMS: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: DashboardIcon, roles: ["ADMIN"] },
  { to: "/pos", label: "POS", icon: PosIcon, roles: ["ADMIN", "CASHIER"] },
  { to: "/produk", label: "Produk & Stok", icon: BoxIcon, roles: ["ADMIN", "CASHIER"] },
  { to: "/riwayat", label: "Riwayat Transaksi", icon: HistoryIcon, roles: ["ADMIN", "CASHIER"] },
  { to: "/jasa", label: "Jasa Servis", icon: ServiceIcon, roles: ["ADMIN"] },
  { to: "/pengeluaran", label: "Pengeluaran", icon: CoinsIcon, roles: ["ADMIN"] },
  { to: "/laporan", label: "Laporan", icon: ReportIcon, roles: ["ADMIN"] },
  { to: "/pengguna", label: "Pengguna", icon: TagIcon, roles: ["ADMIN"] },
  { to: "/audit", label: "Audit Log", icon: ShieldIcon, roles: ["ADMIN"] },
];

const PAGE_META: Array<{ path: string; title: string; description: string }> = [
  { path: "/dashboard", title: "Dashboard", description: "Ringkasan kondisi bengkel hari ini" },
  { path: "/pos", title: "POS", description: "Transaksi penjualan sparepart & jasa servis" },
  { path: "/riwayat", title: "Riwayat Transaksi", description: "Semua transaksi POS yang tercatat" },
  { path: "/produk", title: "Produk & Stok", description: "Manajemen sparepart, harga beli, harga jual, dan stok" },
  { path: "/jasa", title: "Jasa Servis", description: "Katalog harga jasa servis" },
  { path: "/pengeluaran", title: "Pengeluaran", description: "Pencatatan pengeluaran operasional bengkel" },
  { path: "/laporan", title: "Laporan", description: "Analisis dan evaluasi perkembangan bengkel" },
  { path: "/pengguna", title: "Pengguna", description: "Manajemen akun Admin & Kasir" },
  { path: "/audit", title: "Audit Log", description: "Riwayat aktivitas penting sistem" },
];

export function AppShell() {
  const { user, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isPosPage = location.pathname.startsWith("/pos");

  const pageMeta = PAGE_META.find(
    (m) => location.pathname === m.path || location.pathname.startsWith(`${m.path}/`),
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

  const visibleItems = user
    ? NAV_ITEMS.filter((item) => item.roles.includes(user.role))
    : [];

  const handleLogout = async () => {
    await logout();
    toast.info("Anda telah keluar.");
    navigate("/login");
  };

  const SidebarContent = (
    <div className="flex flex-col h-full bg-white">
      {/* Header Logo Brand tanpa garis */}
      <div className="flex h-16 items-center gap-3 px-5 shrink-0">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm shadow-blue-500/20">
          <WrenchIcon className="h-5 w-5" />
        </div>
        <div>
          <p className="font-bold leading-tight text-slate-900 text-sm tracking-tight">Bengkel Motor</p>
          <p className="text-[11px] font-medium text-slate-400">POS & Management</p>
        </div>
      </div>

      {/* Daftar Navigasi Menu */}
      <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={(e) => {
                e.preventDefault();
                handleNavClick(item.to);
              }}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-semibold transition-all duration-150 ${
                  isActive
                    ? "bg-blue-50 text-blue-600"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                } ${navLocked ? "pointer-events-none opacity-60" : ""}`
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Card Informasi User di Bagian Bawah tanpa garis */}
      <div className="p-3 bg-white shrink-0">
        <div className="flex items-center gap-2.5 rounded-xl p-2.5 bg-slate-50">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-600 shrink-0 font-bold text-xs">
            <UserIcon className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold text-slate-800 leading-tight">
              {user?.name}
            </p>
            <p className="truncate text-[10px] font-medium text-slate-400">
              {user ? ROLE_LABEL[user.role] : ""}
            </p>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            aria-label="Keluar"
            className="h-8 w-8 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg shrink-0"
          >
            <LogoutIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <PosProvider>
      <div className="h-screen w-screen overflow-hidden bg-slate-100/70 flex">
        {/* Sidebar Kiri Desktop tanpa border-r */}
        <aside className="hidden w-64 shrink-0 bg-white lg:block h-full">
          {SidebarContent}
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
              {SidebarContent}
            </aside>
          </div>
        )}

        {/* Konten Utama & Topbar */}
        <div className="flex flex-1 flex-col min-w-0 h-full overflow-hidden">
          {/* Header Atas tanpa border-b */}
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

        {/* Cart Panel Kanan (POS) */}
        {isPosPage && <RightCartSidebar />}
      </div>
    </PosProvider>
  );
}