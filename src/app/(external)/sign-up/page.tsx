import Image from "next/image";
import Link from "next/link";

import { Building2 } from "lucide-react";

import { SignUpForm } from "@/app/(main)/auth/_components/signup-form";
import { Separator } from "@/components/ui/separator";
import { APP_CONFIG } from "@/config/app-config";

export default function SignUpPage() {
  return (
    <main className="min-h-screen bg-[#051733]">
      <div className="grid min-h-screen lg:grid-cols-2">
        {/* Left side - Branding */}
        <div className="relative hidden bg-[#0a2444] lg:flex lg:flex-col lg:justify-between p-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Image
                src="/logos/buildsense-logo-cropped.png"
                alt="BuildSense"
                width={40}
                height={40}
              />
              <span className="font-semibold text-2xl text-[#f17b20]">{APP_CONFIG.name}</span>
            </div>
            <p className="text-white/70">Digital Building Compliance for Australian Construction</p>
          </div>

          <div className="space-y-8">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#f17b20]/10">
                <Building2 className="h-5 w-5 text-[#f17b20]" />
              </div>
              <div>
                <h3 className="font-medium text-white">Start Building Smarter</h3>
                <p className="mt-1 text-sm text-white/60">
                  Join builders across Australia who are saving time and reducing compliance risk with BuildSense.
                  Get instant access to NCC-filtered requirements based on your project location.
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-6 text-sm text-white/50">
            <Link href="/" className="hover:text-white">← Back to home</Link>
            <Separator orientation="vertical" className="h-auto" />
            <span>{APP_CONFIG.copyright}</span>
          </div>
        </div>

        {/* Right side - Sign Up Form */}
        <div className="flex items-center justify-center p-8">
          <div className="mx-auto w-full max-w-sm space-y-8">
            {/* Mobile logo */}
            <div className="flex flex-col items-center gap-2 lg:hidden">
              <Image
                src="/logos/buildsense-logo-cropped.png"
                alt="BuildSense"
                width={48}
                height={48}
              />
              <span className="font-semibold text-xl text-[#f17b20]">{APP_CONFIG.name}</span>
            </div>

            <div className="space-y-2 text-center">
              <h1 className="font-medium text-3xl text-white">Create your account</h1>
              <p className="text-white/60">Get started with BuildSense today</p>
            </div>

            <SignUpForm />

            <p className="text-center text-sm text-white/50">
              Already have an account?{" "}
              <Link href="/login" className="text-[#f17b20] hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

