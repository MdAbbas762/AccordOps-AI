import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export type CurrentUserContext = {
  userId: string;
  email: string;
  fullName: string;
  role: string;
  organizationId: string | null;
  organizationName: string;
  organizationSlug: string;
};

export async function getCurrentUserContext(): Promise<CurrentUserContext> {
  const supabase = await createClient();

  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();

  const userId = claimsData?.claims?.sub;

  if (claimsError || !userId) {
    redirect("/login");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, organization_id")
    .eq("id", userId)
    .single();

  if (profileError || !profile) {
    throw new Error("Authenticated user profile could not be loaded.");
  }

  let organizationName = "No organization assigned";
  let organizationSlug = "";

  if (profile.organization_id) {
    const { data: organization, error: organizationError } = await supabase
      .from("organizations")
      .select("name, slug")
      .eq("id", profile.organization_id)
      .single();

    if (!organizationError && organization) {
      organizationName = organization.name;
      organizationSlug = organization.slug;
    }
  }

  return {
    userId,
    email: profile.email ?? "",
    fullName: profile.full_name?.trim() || profile.email || "AccordOps User",
    role: profile.role,
    organizationId: profile.organization_id,
    organizationName,
    organizationSlug,
  };
}
