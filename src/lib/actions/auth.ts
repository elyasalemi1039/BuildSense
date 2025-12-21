"use server";

import { redirect } from "next/navigation";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

/**
 * Sign up a new user with email and password
 */
export async function signUp(formData: FormData) {
  const supabase = await createClient();

  const data = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
    options: {
      data: {
        full_name: formData.get("full_name") as string,
      },
      // Disable email confirmation for now (can enable later in Supabase dashboard)
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/auth/callback`,
    },
  };

  const { error, data: signUpData } = await supabase.auth.signUp(data);

  if (error) {
    return { error: error.message };
  }

  // Check if email confirmation is required
  if (signUpData.user && !signUpData.session) {
    return {
      success: true,
      requiresEmailConfirmation: true,
      message: "Please check your email to confirm your account.",
    };
  }

  revalidatePath("/", "layout");
  return { success: true, requiresEmailConfirmation: false };
}

/**
 * Sign in an existing user
 */
export async function signIn(email: string, password: string, rememberMe?: boolean) {
  const supabase = await createClient();

  const { error, data } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  // If rememberMe is true, extend the session (Supabase handles this automatically with cookies)
  // The session duration is controlled by Supabase settings (JWT expiry)

  revalidatePath("/", "layout");
  return { success: true };
}

/**
 * Sign out the current user
 */
export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}

/**
 * Get the current user
 */
export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/**
 * Get the current user's profile
 */
export async function getCurrentProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();

  return profile;
}
