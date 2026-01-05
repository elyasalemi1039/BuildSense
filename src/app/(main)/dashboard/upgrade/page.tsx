"use client";

import { Check, Crown, Zap, FolderKanban, CheckSquare, Users, Shield } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const FREE_FEATURES = [
  "NCC Search & Browse",
  "AI-powered clause summaries",
  "Basic bookmarks",
  "Single user access",
];

const PRO_FEATURES = [
  "Everything in Free",
  "Unlimited Projects",
  "Checklist Templates",
  "Step Dependencies & Blocking",
  "Photo & Document Uploads",
  "Tradie Notifications",
  "Team Collaboration",
  "Priority Support",
];

export default function UpgradePage() {
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="text-center mb-12">
        <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 mb-4">
          <Crown className="h-3 w-3 mr-1" />
          Upgrade to Pro
        </Badge>
        <h1 className="text-4xl font-bold text-white mb-4">
          Unlock the Full Power of BuildSense
        </h1>
        <p className="text-xl text-slate-400 max-w-2xl mx-auto">
          Manage projects, track compliance with checklists, and collaborate with your team.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-12">
        {/* Free Plan */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              Free
            </CardTitle>
            <CardDescription className="text-slate-400">
              For individual exploration
            </CardDescription>
            <div className="pt-4">
              <span className="text-4xl font-bold text-white">$0</span>
              <span className="text-slate-400">/month</span>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {FREE_FEATURES.map((feature) => (
                <li key={feature} className="flex items-center gap-3 text-slate-300">
                  <Check className="h-5 w-5 text-slate-500 flex-shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>
            <Button 
              variant="outline" 
              className="w-full mt-6 border-slate-600 text-slate-300"
              disabled
            >
              Current Plan
            </Button>
          </CardContent>
        </Card>

        {/* Pro Plan */}
        <Card className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/50 relative">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0">
              <Zap className="h-3 w-3 mr-1" />
              Most Popular
            </Badge>
          </div>
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Crown className="h-5 w-5 text-amber-400" />
              Pro
            </CardTitle>
            <CardDescription className="text-slate-400">
              For builders & professionals
            </CardDescription>
            <div className="pt-4">
              <span className="text-4xl font-bold text-white">$49</span>
              <span className="text-slate-400">/month</span>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {PRO_FEATURES.map((feature) => (
                <li key={feature} className="flex items-center gap-3 text-slate-300">
                  <Check className="h-5 w-5 text-amber-400 flex-shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>
            <Button 
              className="w-full mt-6 bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600"
            >
              <Crown className="h-4 w-4 mr-2" />
              Upgrade to Pro
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Features Grid */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">What's Included in Pro</h2>
        <p className="text-slate-400">Powerful features to streamline your compliance workflow</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="pt-6">
            <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-amber-500/20 mb-4">
              <FolderKanban className="h-6 w-6 text-amber-400" />
            </div>
            <h3 className="font-semibold text-white mb-2">Project Management</h3>
            <p className="text-sm text-slate-400">
              Create unlimited projects and track compliance progress across all your builds.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="pt-6">
            <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-amber-500/20 mb-4">
              <CheckSquare className="h-6 w-6 text-amber-400" />
            </div>
            <h3 className="font-semibold text-white mb-2">Smart Checklists</h3>
            <p className="text-sm text-slate-400">
              Use admin-created templates with step dependencies. Steps block until prerequisites pass.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="pt-6">
            <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-amber-500/20 mb-4">
              <Users className="h-6 w-6 text-amber-400" />
            </div>
            <h3 className="font-semibold text-white mb-2">Tradie Notifications</h3>
            <p className="text-sm text-slate-400">
              Automatically notify tradies when steps fail and require rework via email.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

