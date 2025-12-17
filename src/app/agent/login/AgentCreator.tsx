"use client";

import { useState } from "react";

export default function AgentCreator() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/agent/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Failed to create agent");
      }
      setMessage("Agent created. You can now sign in with this email.");
    } catch (e: any) {
      setError(e?.message || "Failed to create agent");
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-6 w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-800 hover:bg-gray-100"
      >
        Create agent
      </button>
    );
  }

  return (
    <div className="mt-6 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-2 text-sm font-semibold text-gray-900">Create agent</div>
      <div className="space-y-2">
        <div>
          <label className="text-xs font-semibold text-gray-600">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-[#1EC8C8] focus:outline-none"
            placeholder="Agent name"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-[#1EC8C8] focus:outline-none"
            placeholder="agent@example.com"
          />
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleCreate}
            disabled={saving}
            className="rounded-lg bg-[#1EC8C8] px-4 py-2 text-sm font-semibold text-white shadow hover:bg-[#19b3b3] disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save agent"}
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-sm font-semibold text-gray-600 hover:underline"
          >
            Cancel
          </button>
        </div>
        {message && <div className="text-sm text-green-700">{message}</div>}
        {error && <div className="text-sm text-red-700">{error}</div>}
      </div>
    </div>
  );
}
