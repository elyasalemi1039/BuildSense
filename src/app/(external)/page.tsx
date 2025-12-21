import Image from "next/image";
import Link from "next/link";

import { ArrowRight, CheckCircle2, Building2, FileText, Shield, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";

const features = [
  {
    icon: Building2,
    title: "Smart Project Setup",
    description:
      "Enter an address and we automatically detect climate zone, wind region, bushfire status, and state-specific NCC variations.",
  },
  {
    icon: FileText,
    title: "Filtered NCC Rules",
    description:
      "See only the rules that matter for your building class, stage, and location. No more wading through irrelevant clauses.",
  },
  {
    icon: CheckCircle2,
    title: "Compliance Checklists",
    description:
      "Smart checklists with photo evidence, timestamps, and geo-tags. Create a digital audit trail for every inspection.",
  },
  {
    icon: Sparkles,
    title: "AI Copilot",
    description:
      "Ask compliance questions in plain English. Every answer is backed by real NCC clauses—no guessing, just facts.",
  },
];

const benefits = [
  "Reduce guesswork and rework",
  "Catch compliance issues early",
  "Create defensible audit trails",
  "Save hours of manual checking",
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#051733]">
      {/* Header */}
      <header className="border-b border-white/10">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/logos/buildsense-logo-cropped.png"
              alt="BuildSense"
              width={32}
              height={32}
              className="h-8 w-8"
            />
            <span className="font-semibold text-xl text-[#f17b20]">BuildSense</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost" className="text-white hover:text-[#f17b20]">
                Log in
              </Button>
            </Link>
            <Link href="/sign-up">
              <Button className="bg-[#f17b20] text-white hover:bg-[#f17b20]/90">
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 sm:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="font-bold text-4xl text-white sm:text-5xl lg:text-6xl">
              Building Compliance,{" "}
              <span className="text-[#f17b20]">Simplified</span>
            </h1>
            <p className="mt-6 text-lg text-white/70 sm:text-xl">
              The digital building surveyor that helps Australian builders, designers, and certifiers
              instantly check NCC compliance. Stop flipping through PDFs—let BuildSense do the thinking.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/sign-up">
                <Button size="lg" className="bg-[#f17b20] text-white hover:bg-[#f17b20]/90">
                  Start Free Trial
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="border-white/20 text-white hover:bg-white/10">
                Watch Demo
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Bar */}
      <section className="border-y border-white/10 bg-[#0a2444] py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {benefits.map((benefit) => (
              <div key={benefit} className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-[#22c55e]" />
                <span className="text-sm text-white">{benefit}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="font-semibold text-3xl text-white sm:text-4xl">
              Everything you need for <span className="text-[#f17b20]">NCC compliance</span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-white/70">
              BuildSense turns complex building codes into clear, actionable guidance.
            </p>
          </div>
          <div className="mt-16 grid gap-8 md:grid-cols-2">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="rounded-xl border border-white/10 bg-[#0a2444] p-6"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#f17b20]/10">
                  <feature.icon className="h-6 w-6 text-[#f17b20]" />
                </div>
                <h3 className="mt-4 font-semibold text-lg text-white">{feature.title}</h3>
                <p className="mt-2 text-white/70">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-t border-white/10 bg-[#0a2444] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <Shield className="mx-auto h-12 w-12 text-[#f17b20]" />
            <h2 className="mt-6 font-semibold text-3xl text-white">
              Ready to simplify compliance?
            </h2>
            <p className="mt-4 text-white/70">
              Join builders across Australia who are saving time and reducing risk with BuildSense.
            </p>
            <Link href="/sign-up" className="mt-8 inline-block">
              <Button size="lg" className="bg-[#f17b20] text-white hover:bg-[#f17b20]/90">
                Get Started Free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2">
              <Image
                src="/logos/buildsense-logo-cropped.png"
                alt="BuildSense"
                width={24}
                height={24}
              />
              <span className="text-sm text-white/50">© 2025 BuildSense. All rights reserved.</span>
            </div>
            <div className="flex gap-6 text-sm text-white/50">
              <Link href="#" className="hover:text-white">Privacy</Link>
              <Link href="#" className="hover:text-white">Terms</Link>
              <Link href="#" className="hover:text-white">Contact</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
