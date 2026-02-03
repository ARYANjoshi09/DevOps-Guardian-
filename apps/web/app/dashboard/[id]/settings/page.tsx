"use client";

import { SlackSettings } from "@/components/SlackSettings";

export default function SettingsPage({ params }: { params: { id: string } }) {
  return (
    <div className="min-h-screen bg-black text-white p-8 font-sans">
      <div className="max-w-4xl mx-auto">
        <header className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Project Settings</h1>
          <p className="text-zinc-400">Manage integrations and configuration for this project.</p>
        </header>

        <div className="grid gap-8">
          <section>
            <h2 className="text-xl font-semibold mb-4 text-zinc-200">Integrations</h2>
            <div className="max-w-2xl">
              <SlackSettings projectId={params.id} />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
