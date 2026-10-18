"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";

export default function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const signup = mode === "signup";
  const locked = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (locked.current) return;
    const form = event.currentTarget;
    const values = new FormData(form);
    const password = String(values.get("password") ?? "");
    if (signup && password !== values.get("confirmPassword")) {
      setError("Passwords do not match."); return;
    }
    locked.current = true;
    setBusy(true); setError(""); setNotice("");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const payload = {
        email: String(values.get("email") ?? "").trim(),
        password,
        ...(signup ? {
          fullName: String(values.get("fullName") ?? "").trim(),
          workspaceName: String(values.get("workspaceName") ?? "").trim()
        } : {})
      };
      if (signup && (!payload.fullName || !payload.workspaceName)) {
        throw new Error("Enter your name and workspace name.");
      }
      const response = await fetch("/api/auth/" + mode, {
        method: "POST", credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload), signal: controller.signal
      });
      if (response.status === 404 || response.status === 405 || response.status === 503) {
        throw new Error("Sign-in service is not available yet. Please try again later.");
      }
      const result: unknown = await response.json().catch(() => null);
      const data = result && typeof result === "object"
        ? result as Record<string, unknown> : {};
      if (!response.ok) {
        throw new Error(typeof data.error === "string" ? data.error : "Unable to continue. Check your details and try again.");
      }
      if (signup && data.requiresEmailConfirmation === true) {
        form.reset();
        setNotice("Check your email to confirm your account, then return to log in.");
        return;
      }
      if (data.authenticated !== true) {
        throw new Error("The server did not confirm a signed-in session. Please try again.");
      }
      router.replace("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error && err.name === "AbortError"
        ? "The request timed out. Please try again."
        : err instanceof Error ? err.message : "Connection failed. Please try again.");
    } finally {
      clearTimeout(timeout); locked.current = false; setBusy(false);
    }
  }

  const input = "mt-2 block w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200";
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="mb-6 text-lg font-bold text-indigo-700">LeadGuard CRM</p>
        <h1 className="text-3xl font-bold tracking-tight">{signup ? "Create your workspace" : "Welcome back"}</h1>
        <p className="mt-2 text-sm text-slate-600">{signup ? "Bring your team and customer conversations together." : "Sign in to manage your leads and customers."}</p>
        <form onSubmit={submit} className="mt-7 space-y-4" aria-busy={busy}>
          <fieldset disabled={busy} className="space-y-4 disabled:opacity-70">
            {signup && <>
              <label className="block text-sm font-medium">Full name<input className={input} name="fullName" autoComplete="name" required maxLength={100} /></label>
              <label className="block text-sm font-medium">Company / workspace name<input className={input} name="workspaceName" autoComplete="organization" required maxLength={120} /></label>
            </>}
            <label className="block text-sm font-medium">Email address<input className={input} name="email" type="email" autoComplete="email" required maxLength={254} /></label>
            <label className="block text-sm font-medium">Password<input className={input} name="password" type={showPassword ? "text" : "password"} autoComplete={signup ? "new-password" : "current-password"} required minLength={signup ? 8 : undefined} /></label>
            {signup && <p className="text-xs text-slate-500">Use at least 8 characters.</p>}
            {signup && <label className="block text-sm font-medium">Confirm password<input className={input} name="confirmPassword" type={showPassword ? "text" : "password"} autoComplete="new-password" required minLength={8} /></label>}
            <label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={showPassword} onChange={e => setShowPassword(e.target.checked)} /> Show password</label>
            <button className="w-full rounded-xl bg-indigo-600 px-4 py-3 font-semibold text-white hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-wait" type="submit">{busy ? "Please wait…" : signup ? "Create account" : "Log in"}</button>
          </fieldset>
          {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          {notice && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
        </form>
        <p className="mt-6 text-center text-sm text-slate-600">{signup ? "Already have an account? " : "New to LeadGuard? "}<Link className="font-semibold text-indigo-700 underline underline-offset-4" href={signup ? "/login" : "/signup"}>{signup ? "Log in" : "Create an account"}</Link></p>
      </section>
    </main>
  );
}
