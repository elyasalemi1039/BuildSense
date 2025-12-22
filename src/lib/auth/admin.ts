import { createClient } from "@/lib/supabase/server";

/**
 * Check if the current user is an admin
 */
export async function isAdmin(): Promise<boolean> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return false;

    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    return profile?.is_admin === true;
  } catch {
    return false;
  }
}

/**
 * Get current admin user or throw error
 */
export async function requireAdmin(): Promise<{ userId: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error("Not authenticated");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    throw new Error("Admin access required");
  }

  return { userId: user.id };
}

/**
 * API response helper for unauthorized access
 */
export function unauthorizedResponse(message = "Unauthorized") {
  return Response.json({ error: message }, { status: 401 });
}

/**
 * API response helper for forbidden access
 */
export function forbiddenResponse(message = "Admin access required") {
  return Response.json({ error: message }, { status: 403 });
}

/**
 * API response helper for errors
 */
export function errorResponse(message: string, status = 500) {
  return Response.json({ error: message }, { status });
}

/**
 * API response helper for success
 */
export function successResponse<T>(data: T, status = 200) {
  return Response.json(data, { status });
}


