import { NextResponse } from "next/server";

import { signOut } from "@/lib/actions/auth";

export async function GET() {
  try {
    await signOut();
    return NextResponse.redirect(new URL("/", process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"));
  } catch (error) {
    console.error("Signout error:", error);
    return NextResponse.redirect(new URL("/", process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"));
  }
}


