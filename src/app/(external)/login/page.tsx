import Image from "next/image";
import Link from "next/link";

import { Building2 } from "lucide-react";

import { LoginForm } from "@/components/auth/login-form";
import { Separator } from "@/components/ui/separator";
import { APP_CONFIG } from "@/config/app-config";

export default function LoginPage() {
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
                <h3 className="font-medium text-white">Compliance Made Simple</h3>
                <p className="mt-1 text-sm text-white/60">
                  Stop flipping through PDFs. BuildSense automatically filters NCC rules based on your project's
                  location, building class, and construction stage.
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

        {/* Right side - Login Form */}
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
              <h1 className="font-medium text-3xl text-white">Welcome back</h1>
              <p className="text-white/60">Enter your credentials to access your account</p>
            </div>

            <LoginForm />

            <p className="text-center text-sm text-white/50">
              Don't have an account?{" "}
              <Link href="/login" className="text-[#f17b20] hover:underline">
                Contact us
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

