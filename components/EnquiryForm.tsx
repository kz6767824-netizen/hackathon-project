"use client";
import { useRef, useState, type FormEvent } from "react";
export default function EnquiryForm({ workspaceSlug }: { workspaceSlug: string }) {
  const locked = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [received, setReceived] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (locked.current) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const payload = { workspaceSlug, name: String(data.get("name") || "").trim(),
      email: String(data.get("email") || "").trim(), phone: String(data.get("phone") || "").trim(),
      message: String(data.get("message") || "").trim() };
    if (!payload.email && !payload.phone) { setError("Enter an email address or phone number."); return; }
    locked.current = true; setBusy(true); setError("");
    try {
      const response = await fetch("/api/leads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok || !result.id) throw new Error(result.error || "Unable to submit your enquiry.");
      setReceived(true); form.reset();
    } catch (err) { setError(err instanceof Error ? err.message : "Connection failed."); }
    finally { locked.current = false; setBusy(false); }
  }
  const input = "mt-1 block w-full rounded-lg border border-slate-300 p-3";
  return <main className="flex min-h-screen items-center justify-center bg-slate-50 p-5">
    <section className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
      <p className="font-semibold text-indigo-700">LeadGuard</p><h1 className="mt-3 text-2xl font-bold">Send an enquiry</h1>
      <p className="mt-2 text-sm text-slate-600">Tell us what you need and how we can contact you.</p>
      {received ? <p role="status" className="mt-6 rounded-lg bg-green-50 p-4 text-green-800">Your enquiry has been received. Thank you.</p> :
      <form onSubmit={submit} className="mt-6 space-y-4">
        <fieldset disabled={busy} className="space-y-4">
          <label className="block">Name<input name="name" autoComplete="name" required maxLength={120} className={input} /></label>
          <label className="block">Email<input name="email" type="email" autoComplete="email" maxLength={254} className={input} /></label>
          <label className="block">Phone<input name="phone" type="tel" autoComplete="tel" maxLength={40} className={input} /></label>
          <label className="block">Message<textarea name="message" required maxLength={5000} rows={4} className={input} /></label>
          <button type="submit" className="w-full rounded-lg bg-indigo-600 px-4 py-3 font-semibold text-white disabled:opacity-60">{busy ? "Sending…" : "Send enquiry"}</button>
        </fieldset>{error && <p role="alert" className="text-red-700">{error}</p>}
      </form>}
    </section>
  </main>;
}
