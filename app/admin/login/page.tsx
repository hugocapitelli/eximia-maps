"use client";

import { Suspense, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { login } from "./actions";
import { Button, Input } from "@/components/ui";
import { ArrowRight, Lock } from "lucide-react";
import Image from "next/image";

function LoginForm() {
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/admin";

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    const formData = new FormData(e.currentTarget);
    formData.set("redirect", redirectTo);

    startTransition(async () => {
      const result = await login(formData);
      if (result?.error) {
        setError(result.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="mb-1.5 block text-sm font-medium text-primary/80">
          Email
        </label>
        <Input
          type="email"
          name="email"
          placeholder="seu@email.com"
          required
        />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-primary/80">
          Senha
        </label>
        <Input
          type="password"
          name="password"
          placeholder="••••••••"
          required
        />
      </div>

      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <Button type="submit" disabled={isPending} className="w-full gap-2">
        {isPending ? (
          "Entrando..."
        ) : (
          <>
            Entrar
            <ArrowRight size={16} />
          </>
        )}
      </Button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-bg p-4 overflow-hidden">
      {/* Background decorative elements */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-[#82B4C4]/5 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-[#82B4C4]/5 blur-3xl" />
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-[#82B4C4]/[0.02] blur-3xl" />
      </div>

      {/* Grid pattern overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative z-10 w-full max-w-sm">
        {/* Logo + branding */}
        <div className="mb-10 flex flex-col items-center">
          <Image
            src="/logo-horizontal.svg"
            alt="eximIA"
            width={220}
            height={47}
            priority
          />
          <div className="mt-4 flex items-center gap-2">
            <div className="h-px w-8 bg-border" />
            <span className="text-xs font-medium tracking-widest uppercase text-muted">
              Maps
            </span>
            <div className="h-px w-8 bg-border" />
          </div>
        </div>

        {/* Login card */}
        <div className="rounded-2xl border border-border/60 bg-surface/80 backdrop-blur-sm p-6 sm:p-8 shadow-2xl shadow-black/20">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#82B4C4]/10">
              <Lock size={18} className="text-[#82B4C4]" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">Bem-vindo</h1>
              <p className="text-xs text-muted">Entre para acessar o dashboard</p>
            </div>
          </div>

          <Suspense
            fallback={
              <div className="text-center text-sm text-muted py-8">
                Carregando...
              </div>
            }
          >
            <LoginForm />
          </Suspense>
        </div>

        {/* Footer */}
        <p className="mt-8 text-center text-xs text-muted/50">
          eximIA Maps &middot; AI-powered mind maps
        </p>
      </div>
    </div>
  );
}
