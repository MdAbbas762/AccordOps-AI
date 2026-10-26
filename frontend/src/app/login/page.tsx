import { Suspense } from "react";
import LoginForm from "@/components/login-form";

export default function LoginPage() {
  return (
    <main className="login-shell min-h-dvh px-4 py-6 sm:px-6">
      <div className="relative z-10 mx-auto flex min-h-[calc(100dvh-3rem)] w-full max-w-md flex-col justify-center">
        <Suspense fallback={<div className="text-sm text-slate-500">Loading secure sign in…</div>}>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
