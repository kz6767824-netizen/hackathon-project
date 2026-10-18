"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase";

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
      const supabase = getSupabaseBrowserClient();
      if (!supabase) {
        throw new Error("Supabase is not configured. Add the project URL and publishable key to .env.local, then restart the dev server.");
      }

      if (signup) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: payload.email,
          password: payload.password,
          options: {
            emailRedirectTo: window.location.origin,
            data: {
              full_name: payload.fullName,
              workspace_name: payload.workspaceName,
            },
          },
        });
        if (signUpError) throw signUpError;
        if (!data.session) {
          form.reset();
          setNotice("Account created. Check your email to confirm your address, then log in.");
          return;
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: payload.email,
          password: payload.password,
        });
        if (signInError) throw signInError;
      }

      if (!signup || (await supabase.auth.getSession()).data.session) {
        router.replace("/");
        router.refresh();
        return;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to continue. Please try again.");
    } finally {
      locked.current = false; setBusy(false);
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
