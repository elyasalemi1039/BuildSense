"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

/**
 * Sign up a new user with email and password
 */
export async function signUp(formData: FormData) {
  try {
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
      return { error: error.message, success: false };
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
  } catch (error) {
    console.error("SignUp error:", error);
    return { error: "An unexpected error occurred", success: false };
  }
}

/**
 * Sign in an existing user
 */
export async function signIn(email: string, password: string, rememberMe?: boolean) {
  try {
    const supabase = await createClient();

    const { error, data } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { error: error.message, success: false };
    }

    revalidatePath("/", "layout");
    return { success: true };
  } catch (error) {
    console.error("SignIn error:", error);
    return { error: "An unexpected error occurred", success: false };
  }
}

/**
 * Sign out the current user
 */
export async function signOut() {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
    revalidatePath("/", "layout");
    return { success: true };
  } catch (error) {
    console.error("SignOut error:", error);
    return { error: "Failed to sign out", success: false };
  }
}

/**
 * Get the current user
 */
export async function getCurrentUser() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user;
  } catch (error) {
    console.error("GetCurrentUser error:", error);
    return null;
  }
}

/**
 * Get the current user's profile
 */
export async function getCurrentProfile() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();

    return profile;
  } catch (error) {
    console.error("GetCurrentProfile error:", error);
    return null;
  }
}
