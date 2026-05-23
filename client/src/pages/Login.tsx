import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { LogIn, UserPlus } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function Login() {
  const { isAuthenticated, loading, refresh } = useAuth();
  const [, navigate] = useLocation();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: async () => {
      await refresh();
      navigate("/");
    },
    onError: (error) => toast.error(error.message),
  });

  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: async () => {
      await refresh();
      navigate("/");
    },
    onError: (error) => toast.error(error.message),
  });

  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate("/");
    }
  }, [loading, isAuthenticated, navigate]);

  const isSubmitting = loginMutation.isPending || registerMutation.isPending;

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (mode === "register") {
      await registerMutation.mutateAsync({ name, email, password });
      return;
    }
    await loginMutation.mutateAsync({ email, password });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="absolute inset-0 opacity-5">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      <div className="relative z-10 w-full max-w-md mx-4">
        <div className="bg-white rounded-xl shadow-2xl p-8 border border-slate-100">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 rounded-xl bg-primary flex items-center justify-center mb-4 shadow-lg">
              <span className="text-white font-bold text-2xl font-display">
                QQ
              </span>
            </div>
            <h1 className="text-2xl font-bold font-display text-slate-900">
              Quick Quartz
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Countertops Management Platform
            </p>
          </div>

          <div className="grid grid-cols-2 rounded-lg bg-slate-100 p-1 mb-6">
            <button
              type="button"
              className={`h-9 rounded-md text-sm font-medium transition-colors ${
                mode === "login"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500"
              }`}
              onClick={() => setMode("login")}
            >
              Sign in
            </button>
            <button
              type="button"
              className={`h-9 rounded-md text-sm font-medium transition-colors ${
                mode === "register"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500"
              }`}
              onClick={() => setMode("register")}
            >
              Register
            </button>
          </div>

          <form className="space-y-4" onSubmit={onSubmit}>
            {mode === "register" && (
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-slate-700">
                  Name
                </Label>
                <Input
                  id="name"
                  autoComplete="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-slate-700">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-slate-700">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                autoComplete={mode === "register" ? "new-password" : "current-password"}
                minLength={mode === "register" ? 12 : 1}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>

            <Button
              className="w-full h-11 text-base font-medium"
              disabled={isSubmitting}
              type="submit"
            >
              {mode === "register" ? (
                <UserPlus className="w-4 h-4 mr-2" />
              ) : (
                <LogIn className="w-4 h-4 mr-2" />
              )}
              {isSubmitting
                ? "Working..."
                : mode === "register"
                  ? "Create account"
                  : "Sign in"}
            </Button>
          </form>

          <p className="text-center text-xs text-slate-400 mt-6">
            Quick Quartz Countertops · Greater Toronto Area
          </p>
        </div>
      </div>
    </div>
  );
}
