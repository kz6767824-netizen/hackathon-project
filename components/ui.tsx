"use client";
import Link from "next/link";
import { useEffect, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from "react";

export const cx = (...a: (string | false | null | undefined)[]) => a.filter(Boolean).join(" ");

export function Button({ variant = "primary", className, ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "danger" }) {
  const v = { primary: "bg-indigo-600 text-white hover:bg-indigo-700", ghost: "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50", danger: "bg-red-600 text-white hover:bg-red-700" }[variant];
  return <button {...p} className={cx("rounded-lg px-3 py-2 text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed", v, className)} />;
}
export const Input = ({ className, ...p }: InputHTMLAttributes<HTMLInputElement>) => <input {...p} className={cx("w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200", className)} />;
export const Select = ({ className, ...p }: SelectHTMLAttributes<HTMLSelectElement>) => <select {...p} className={cx("w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none", className)} />;
export const Label = ({ children }: { children: ReactNode }) => <label className="mb-1 block text-xs font-medium text-slate-600">{children}</label>;

export function Card({ title, action, children, className }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cx("rounded-xl border border-slate-200 bg-white p-4 shadow-sm", className)}>
      {(title || action) && <div className="mb-3 flex items-center justify-between gap-2"><h2 className="font-semibold text-slate-800">{title}</h2>{action}</div>}
      {children}
    </section>
  );
}
const tones: Record<string, string> = {
  gray: "bg-slate-100 text-slate-700", green: "bg-emerald-100 text-emerald-800", red: "bg-red-100 text-red-800",
  amber: "bg-amber-100 text-amber-800", blue: "bg-blue-100 text-blue-800", indigo: "bg-indigo-100 text-indigo-800",
};
export const Badge = ({ tone = "gray", children }: { tone?: keyof typeof tones; children: ReactNode }) => <span className={cx("inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium", tones[tone])}>{children}</span>;

export const statusTone = (s: string) => ({ new: "blue", acknowledged: "green", escalated: "red", open: "gray", available: "green", away: "amber", offline: "gray", paid: "green", pending: "amber", failed: "red", expired: "gray", refunded: "indigo" } as Record<string, string>)[s] ?? "gray";

export function Page({ title, actions, children }: { title: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-6xl p-4 md:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><h1 className="text-xl font-bold text-slate-900 md:text-2xl">{title}</h1><div className="flex flex-wrap gap-2">{actions}</div></div>
      {children}
    </div>
  );
}
export const Skeleton = ({ rows = 4 }: { rows?: number }) => (
  <div className="animate-pulse space-y-2" aria-busy="true">{Array.from({ length: rows }, (_, i) => <div key={i} className="h-10 rounded-lg bg-slate-100" />)}</div>
);
export const ErrorBox = ({ message, retry }: { message: string; retry?: () => void }) => (
  <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{message}{retry && <Button variant="ghost" className="ml-3" onClick={retry}>Retry</Button>}</div>
);
export const Empty = ({ children }: { children: ReactNode }) => <p className="rounded-lg border border-dashed border-slate-300 p-4 text-center text-sm text-slate-500">{children}</p>;

/** Wrap async data states in one place so every screen gets loading/error/empty for free. */
export function State<T>({ s, children, skeleton = 4 }: { s: { data: T | null; error: string | null; loading: boolean; retry: () => void }; children: (d: T) => ReactNode; skeleton?: number }) {
  if (s.error) return <ErrorBox message={s.error} retry={s.retry} />;
  if (s.loading && !s.data) return <Skeleton rows={skeleton} />;
  return s.data ? <>{children(s.data)}</> : null;
}

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  useEffect(() => { if (!open) return; const k = (e: KeyboardEvent) => e.key === "Escape" && onClose(); window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div role="dialog" aria-label={title} className="max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:max-w-md sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-semibold">{title}</h2><button aria-label="Close" onClick={onClose} className="text-2xl leading-none text-slate-400 hover:text-slate-700">×</button></div>
        {children}
      </div>
    </div>
  );
}
/** Table that scrolls inside its box on phones (no page-level horizontal scroll). */
export const Table = ({ head, children }: { head: string[]; children: ReactNode }) => (
  <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
    <table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr>{head.map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{children}</tbody></table>
  </div>
);
export const Td = ({ children, className }: { children: ReactNode; className?: string }) => <td className={cx("px-3 py-2.5 align-middle", className)}>{children}</td>;
export const A = ({ href, children }: { href: string; children: ReactNode }) => <Link href={href} className="font-medium text-indigo-700 hover:underline">{children}</Link>;

export const ago = (iso: string) => { const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000); if (m < 1) return "just now"; if (m < 60) return `${m}m ago`; if (m < 1440) return `${Math.round(m / 60)}h ago`; return `${Math.round(m / 1440)}d ago`; };
export const money = (n: number | null, show: boolean, cur = "PKR") => (n === null ? "—" : show ? `${cur} ${n.toLocaleString()}` : "••••");
export const fmtDate = (iso: string) => new Date(iso).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
