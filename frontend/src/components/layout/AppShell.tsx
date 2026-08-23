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

interface NavItem {
  to: string;
  label: string;
  icon: (p: React.SVGProps<SVGSVGElement>) => JSX.Element;
  roles: Array<"ADMIN" | "CASHIER">;
}

const NAV_ITEMS: NavItem[] = [
  {
    to: "/dashboard",
    label: "Dashboard",
    icon: DashboardIcon,
    roles: ["ADMIN"],
  },
  { to: "/pos", label: "POS", icon: PosIcon, roles: ["ADMIN", "CASHIER"] },
  { to: "/produk", label: "Produk & Stok", icon: BoxIcon, roles: ["ADMIN", "CASHIER"] },
  {
    to: "/riwayat",
    label: "Riwayat Transaksi",
    icon: HistoryIcon,
    roles: ["ADMIN", "CASHIER"],
  },
  { to: "/jasa", label: "Jasa Servis", icon: ServiceIcon, roles: ["ADMIN"] },
  {
    to: "/pengeluaran",
    label: "Pengeluaran",
    icon: CoinsIcon,
    roles: ["ADMIN"],
  },
  { to: "/laporan", label: "Laporan", icon: ReportIcon, roles: ["ADMIN"] },
  { to: "/pengguna", label: "Pengguna", icon: TagIcon, roles: ["ADMIN"] },
  { to: "/audit", label: "Audit Log", icon: ShieldIcon, roles: ["ADMIN"] },
];

// Page title + description rendered ONLY in the sticky topbar (single H1 per
// page). Keyed by route path; matched exactly or by directory prefix so
// detail routes (e.g. /produk/:id) inherit their parent page's header.
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

  const pageMeta = PAGE_META.find(
    (m) => location.pathname === m.path || location.pathname.startsWith(`${m.path}/`),
  );

  // Throttle rapid navigation: the first click navigates immediately, then the
  // nav is locked for 200ms so frantic menu tapping cannot mount several pages
  // back-to-back and blast the API with redundant requests.
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
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 border-b border-border px-5 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-white">
          <WrenchIcon className="h-5 w-5" />
        </div>
        <div>
          <p className="font-bold leading-tight text-text-primary">Bengkel</p>
          <p className="text-xs text-text-secondary">POS & Monitoring</p>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto p-3">
        <ul className="space-y-1">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  onClick={(e) => {
                    e.preventDefault();
                    handleNavClick(item.to);
                  }}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-control px-3 py-2 text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-primary-subtle text-primary"
                        : "text-text-secondary hover:bg-surface-2 hover:text-text-primary"
                    } ${navLocked ? "pointer-events-none opacity-60" : ""}`
                  }
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="border-t border-border p-3">
        <div className="flex items-center gap-3 rounded-control px-2 py-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-subtle text-primary">
            <UserIcon className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-text-primary">
              {user?.name}
            </p>
            <p className="text-xs text-text-secondary">
              {user ? ROLE_LABEL[user.role] : ""}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            aria-label="Keluar"
          >
            <LogoutIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen lg:flex">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-border bg-surface lg:block">
        <div className="sticky top-0 h-screen">{SidebarContent}</div>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute left-0 top-0 h-full w-64 bg-surface">
            <div className="flex justify-end p-2">
              <button
                className="rounded p-1 text-text-secondary hover:bg-surface-2"
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

      <div className="flex min-h-screen flex-1 flex-col">
        {/* Desktop topbar */}
        <header className="sticky top-0 z-40 hidden items-center justify-between gap-3 border-b border-border bg-surface px-6 py-3 lg:flex">
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold text-text-primary">
              {pageMeta?.title ?? "Bengkel"}
            </h1>
            {pageMeta?.description && (
              <p className="truncate text-xs text-text-secondary">
                {pageMeta.description}
              </p>
            )}
          </div>
          <NotificationBell />
        </header>

        {/* Mobile topbar */}
        <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-border bg-surface px-4 py-3 lg:hidden">
          <button
            className="rounded p-1 text-text-secondary hover:bg-surface-2"
            onClick={() => setMobileOpen(true)}
            aria-label="Buka menu"
          >
            <MenuIcon className="h-6 w-6" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-bold leading-tight text-text-primary">
              {pageMeta?.title ?? "Bengkel"}
            </h1>
            {pageMeta?.description && (
              <p className="truncate text-xs text-text-secondary">
                {pageMeta.description}
              </p>
            )}
          </div>
          <div className="shrink-0">
            <NotificationBell />
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
