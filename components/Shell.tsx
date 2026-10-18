"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useSession } from "@/lib/hooks";
import type { Role } from "@/lib/types";
import { cx } from "./ui";

const nav = [
  { href: "/", label: "Dashboard", icon: "📊" },
  { href: "/contacts", label: "Contacts", icon: "👥" },
  { href: "/companies", label: "Companies", icon: "🏢" },
  { href: "/pipeline", label: "Pipeline", icon: "🧲" },
  { href: "/recovery", label: "Recovery", icon: "🚨" },
  { href: "/employees", label: "Employees", icon: "🧑‍💼" },
  { href: "/settings/fields", label: "Custom fields", icon: "🧩" },
  { href: "/settings/pipelines", label: "Pipeline stages", icon: "⚙️" },
];
export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const { role, setRole } = useSession();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  async function logout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      setLoggingOut(false);
      router.replace("/login");
      router.refresh();
    }
  }
  if (path === "/login" || path === "/signup") return <>{children}</>;
  const active = (h: string) => (h === "/" ? path === "/" : path.startsWith(h));
  const links = (
    <nav className="flex flex-col gap-1 p-3">
      {nav.map((n) => (
        <Link key={n.href} href={n.href} onClick={() => setOpen(false)} className={cx("flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium", active(n.href) ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-100")}>
          <span>{n.icon}</span>{n.label}
        </Link>
      ))}
    </nav>
  );
  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-56 shrink-0 border-r border-slate-200 bg-white md:block">
        <div className="px-5 py-4 text-lg font-bold text-indigo-700">LeadGuard CRM</div>{links}
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3">
          <button aria-label="Menu" className="text-2xl md:hidden" onClick={() => setOpen(true)}>☰</button>
          <span className="font-bold text-indigo-700 md:hidden">LeadGuard</span>
          <div className="ml-auto flex items-center gap-2 text-sm">
            <span className="hidden text-slate-500 sm:inline">Viewing as</span>
            <select aria-label="Demo role" value={role} onChange={(e) => setRole(e.target.value as Role)} className="rounded-lg border border-slate-300 bg-white px-2 py-1">
              <option>Owner</option><option>Admin</option><option>User</option>
            </select>
            <button type="button" onClick={logout} disabled={loggingOut} className="rounded-lg border border-slate-300 bg-white px-3 py-1 font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-60">
              {loggingOut ? "Logging out…" : "Log out"}
            </button>
          </div>
        </header>
        {open && (
          <div className="fixed inset-0 z-40 md:hidden" onClick={() => setOpen(false)}>
            <div className="absolute inset-0 bg-black/40" />
            <div className="relative h-full w-64 bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
              <div className="px-5 py-4 text-lg font-bold text-indigo-700">LeadGuard CRM</div>{links}
            </div>
          </div>
        )}
        <main className="min-w-0 flex-1 bg-slate-50">{children}</main>
      </div>
    </div>
  );
}
