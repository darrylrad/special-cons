"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function validateInputs(): string | null {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return "Please enter a valid email address.";
    if (password.length < 8) return "Password must be at least 8 characters.";
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);

    const validationError = validateInputs();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      if (mode === "signup") {
        const { error: signUpError } = await supabase.auth.signUp({ email, password });
        if (signUpError) throw signUpError;
        setMessage("Account created — check your email to confirm, then log in.");
        setMode("login");
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        router.push("/");
        router.refresh();
      }
    } catch (err: unknown) {
      setError((err as { message?: string }).message ?? "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#080a12] p-4">
      <div className="w-full max-w-sm">
        {/* Logo / wordmark */}
        <div className="mb-8 text-center">
          <div className="mono text-[10px] uppercase tracking-[0.3em] text-slate-600">Acqment</div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-100">
            {mode === "login" ? "Welcome back" : "Create account"}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {mode === "login" ? "Sign in to continue." : "Get started with Acqment."}
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-6 shadow-panel backdrop-blur-sm"
        >
          <div className="space-y-1">
            <label className="mono text-[10px] uppercase tracking-[0.16em] text-slate-500" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-600 outline-none transition focus:border-accent-500/50 focus:ring-1 focus:ring-accent-500/30"
              placeholder="you@example.com"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="mono text-[10px] uppercase tracking-[0.16em] text-slate-500" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-600 outline-none transition focus:border-accent-500/50 focus:ring-1 focus:ring-accent-500/30"
              placeholder="Min. 8 characters"
              required
            />
          </div>

          {error && (
            <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3.5 py-2.5 text-[12px] text-red-400">
              {error}
            </p>
          )}

          {message && (
            <p className="rounded-lg border border-verdict-proceed/20 bg-verdict-proceed/10 px-3.5 py-2.5 text-[12px] text-verdict-proceed">
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mono w-full rounded-lg bg-accent-500 px-4 py-2.5 text-[11px] uppercase tracking-[0.18em] text-white transition hover:bg-accent-400 active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-slate-500">
          {mode === "login" ? "Don't have an account?" : "Already have an account?"}{" "}
          <button
            onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(null); setMessage(null); }}
            className="text-accent-300 transition hover:text-accent-200 underline underline-offset-2"
          >
            {mode === "login" ? "Sign up" : "Sign in"}
          </button>
        </p>
      </div>
    </div>
  );
}
