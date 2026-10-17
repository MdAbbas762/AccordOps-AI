import LoginForm from "@/components/login-form";

export default function LoginPage() {
  return (
    <main className="min-h-dvh bg-slate-950 px-4 py-4 sm:px-6 sm:py-5">
      <div className="mx-auto flex min-h-[calc(100dvh-2rem)] w-full max-w-md flex-col justify-center sm:min-h-[calc(100dvh-2.5rem)]">
        <LoginForm />
      </div>
    </main>
  );
}
