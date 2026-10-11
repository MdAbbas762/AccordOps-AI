import AppSidebar from "@/components/app-sidebar";
import Topbar from "@/components/topbar";

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-screen bg-slate-950 text-white">
      <AppSidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 bg-slate-950 px-6 py-6">{children}</main>
      </div>
    </div>
  );
}
