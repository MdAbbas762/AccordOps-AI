import AppShell from "@/components/app-shell";
import { getCurrentUserContext } from "@/lib/auth/current-user";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const currentUser = await getCurrentUserContext();
  return <AppShell organizationName={currentUser.organizationName} fullName={currentUser.fullName} email={currentUser.email} role={currentUser.role}>{children}</AppShell>;
}
