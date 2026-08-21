import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/app/auth/AuthContext";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { WrenchIcon } from "@/components/shared/icons";

export function LoginPage() {
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
        const wait = apiError.retryAfter ? Math.ceil(apiError.retryAfter) : null;
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
    <div className="flex min-h-screen items-center justify-center bg-bg p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-white">
            <WrenchIcon className="h-7 w-7" />
          </div>
          <h1 className="mt-4 text-2xl font-bold text-text-primary">
            Bengkel POS & Monitoring
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Masuk untuk memulai pencatatan bengkel
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-4 p-6">
          <Input
            label="Email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="Masukkan email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            label="Password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="Masukkan password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <label className="flex items-center gap-2 text-sm text-text-primary">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
            />
            Ingat saya di perangkat ini
          </label>
          {error && (
            <p className="rounded-control bg-danger-subtle px-3 py-2 text-sm text-danger">
              {error}
            </p>
          )}
          <Button type="submit" className="w-full" loading={loading}>
            Masuk
          </Button>
        </form>
      </div>
    </div>
  );
}
