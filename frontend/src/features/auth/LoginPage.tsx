import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/app/auth/AuthContext";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { WrenchIcon } from "@/components/shared/icons";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  TrendingUp,
  Package,
  ShieldCheck,
  Headphones,
  Shield,
} from "lucide-react";

export function LoginPage() {
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Email dan password wajib diisi.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const user = await login(email, password, remember);
      toast.success("Selamat datang, " + user.name + "!");
      navigate(user.role === "ADMIN" ? "/dashboard" : "/pos");
    } catch (err) {
      const apiError = err as {
        message?: string;
        status?: number;
        retryAfter?: number;
        errors?: Record<string, string[]>;
      };
      if (apiError.status === 429) {
        const wait = apiError.retryAfter
          ? Math.ceil(apiError.retryAfter)
          : null;
        setError(
          wait
            ? `Terlalu banyak percobaan login. Mohon tunggu sekitar ${wait} detik sebelum mencoba lagi.`
            : "Terlalu banyak percobaan login. Mohon tunggu beberapa saat sebelum mencoba lagi.",
        );
      } else if (apiError.errors && Object.keys(apiError.errors).length) {
        setError(Object.values(apiError.errors).flat().join(" "));
      } else {
        setError(
          apiError.message ||
            "Login gagal. Periksa kembali username dan password.",
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans">
      {/* Kolom Kiri - Informasi & Visual (Hidden on mobile, visible on desktop) */}
      <div className="relative hidden w-full max-w-md flex-col justify-between overflow-hidden bg-[#1a4f9c] text-white lg:flex xl:max-w-xl 2xl:max-w-2xl">
        {/* Background Image Overlay */}
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&q=80"
            alt="Bengkel Background"
            className="h-full w-full object-cover opacity-20 mix-blend-overlay"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#1a4f9c]/90 to-[#0d2a5c]/95 mix-blend-multiply"></div>
        </div>

        {/* Konten Kolom Kiri */}
        <div className="relative z-10 flex h-full flex-col p-12 lg:p-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/30 backdrop-blur-sm">
              <WrenchIcon className="h-6 w-6 text-white" />
            </div>
            <div className="leading-tight">
              <p className="font-bold">Bengkel</p>
              <p className="text-xs font-normal text-blue-200">
                POS & Monitoring
              </p>
            </div>
          </div>

          {/* Headline */}
          <div className="mt-16">
            <h1 className="text-3xl font-bold leading-tight xl:text-4xl">
              Kelola transaksi bengkel <br /> lebih mudah & efisien
            </h1>
            <p className="mt-5 text-sm leading-relaxed text-blue-100/90 xl:w-4/5 xl:text-base">
              Catat penjualan, pantau stok, dan kelola layanan bengkel dalam
              satu sistem yang terintegrasi.
            </p>
          </div>

          {/* Features */}
          <div className="mt-12 flex flex-col gap-8">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-white text-[#1a4f9c] shadow-sm">
                <TrendingUp className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Pantau Penjualan</h3>
                <p className="mt-1 text-sm leading-relaxed text-blue-100/80 xl:w-4/5">
                  Lihat laporan penjualan secara real-time dan akurat.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-white text-[#1a4f9c] shadow-sm">
                <Package className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Kelola Stok</h3>
                <p className="mt-1 text-sm leading-relaxed text-blue-100/80 xl:w-4/5">
                  Kontrol stok sparepart dan jasa dengan mudah.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-white text-[#1a4f9c] shadow-sm">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Aman & Terpercaya</h3>
                <p className="mt-1 text-sm leading-relaxed text-blue-100/80 xl:w-4/5">
                  Data tersimpan aman dan hanya dapat diakses oleh pengguna
                  terdaftar.
                </p>
              </div>
            </div>
          </div>

          <div className="flex-grow"></div>

          {/* Bantuan Support */}
          <div className="flex items-center gap-4">
            <Headphones className="h-7 w-7 text-white/90" />
            <div>
              <p className="text-sm font-semibold text-white">Butuh bantuan?</p>
              <p className="text-xs text-blue-100/80">
                Hubungi admin atau tim support.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Kolom Kanan - Form Login */}
      <div className="relative flex flex-1 flex-col items-center justify-center p-6 lg:p-12">
        {/* Dekorasi Pola Titik (Dotted Pattern) di Pojok Kanan Atas */}
        <div
          className="absolute right-0 top-0 hidden h-64 w-64 lg:block"
          style={{
            backgroundImage: "radial-gradient(#d1d5db 2px, transparent 2px)",
            backgroundSize: "20px 20px",
            opacity: 0.4,
            maskImage:
              "radial-gradient(ellipse at top right, black, transparent)",
          }}
        ></div>

        <div className="z-10 w-full max-w-[440px]">
          {/* Header Form */}
          <div className="mb-8 flex flex-col items-center text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#2563eb] text-white shadow-lg shadow-blue-600/20">
              <WrenchIcon className="h-8 w-8" />
            </div>
            <h2 className="mt-6 text-2xl font-bold text-gray-900">
              Bengkel POS & Monitoring
            </h2>
            <p className="mt-2 text-sm text-gray-500">
              Masuk untuk melanjutkan ke sistem
            </p>
          </div>

          {/* Kotak Form */}
          <div className="rounded-[20px] bg-white p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100">
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Input Email */}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    required
                    className="w-full rounded-xl border border-gray-300 py-2.5 pl-11 pr-4 text-sm text-gray-900 transition-colors focus:border-[#2563eb] focus:outline-none focus:ring-1 focus:ring-[#2563eb]"
                    placeholder="Masukkan email Anda"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              {/* Input Password */}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    className="w-full rounded-xl border border-gray-300 py-2.5 pl-11 pr-11 text-sm text-gray-900 transition-colors focus:border-[#2563eb] focus:outline-none focus:ring-1 focus:ring-[#2563eb]"
                    placeholder="Masukkan password Anda"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Remember Me & Lupa Password */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-[#2563eb] focus:ring-[#2563eb]"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                  />
                  Ingat saya di perangkat ini
                </label>
                <a
                  href="#"
                  className="text-sm font-semibold text-[#2563eb] hover:underline"
                >
                  Lupa password?
                </a>
              </div>

              {/* Pesan Error */}
              {error && (
                <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 border border-red-100">
                  {error}
                </div>
              )}

              {/* Tombol Masuk */}
              <Button
                type="submit"
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#2563eb] py-3 text-white hover:bg-blue-700 transition-all font-semibold"
                loading={loading}
              >
                {!loading && <ArrowRight className="h-5 w-5" />}
                Masuk
              </Button>

              {/* Divider */}
              <div className="relative flex items-center py-2">
                <div className="flex-grow border-t border-gray-200"></div>
                <span className="flex-shrink-0 px-4 text-xs text-gray-400">
                  atau masuk dengan
                </span>
                <div className="flex-grow border-t border-gray-200"></div>
              </div>

              {/* Tombol Login Sebagai Kasir */}
              <button
                type="button"
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Shield className="h-5 w-5 text-gray-500" />
                Login sebagai Kasir
              </button>
            </form>
          </div>

          {/* Footer Text */}
          <p className="mt-8 text-center text-sm text-gray-500">
            Belum punya akun?{" "}
            <a
              href="#"
              className="font-semibold text-[#2563eb] hover:underline"
            >
              Hubungi administrator
            </a>{" "}
            sistem.
          </p>
        </div>
      </div>
    </div>
  );
}
