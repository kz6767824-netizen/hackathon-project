"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import type { Role } from "./types";

export function useAsync<T>(fn: () => Promise<T>, deps: unknown[], pollMs?: number) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const fnRef = useRef(fn); fnRef.current = fn;
  const run = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try { setData(await fnRef.current()); setError(null); }
    catch (e) { setError(e instanceof Error ? e.message : "Something went wrong"); }
    finally { setLoading(false); }
  }, []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { run(); }, deps);
  useEffect(() => { if (!pollMs) return; const t = setInterval(() => run(true), pollMs); return () => clearInterval(t); }, [pollMs, run]);
  return { data, error, loading, reload: () => run(true), retry: () => run() };
}

interface Session { role: Role; canViewValue: boolean; meId: string; name: string; loading: boolean; error: string | null; workspaceSlug: string }
const defaultSession: Session = { role: "User", canViewValue: false, meId: "", name: "", loading: true, error: null, workspaceSlug: "" };
const Ctx = createContext<Session>(defaultSession);
export function SessionProvider({ children }: { children: ReactNode }) {
  const path = usePathname();
  const [session, setSession] = useState<Session>(defaultSession);
  useEffect(() => {
    if (path === "/login" || path === "/signup" || path.startsWith("/enquiry/")) return;
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch("/api/me", { cache: "no-store", signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Unable to load your workspace.");
        if (!["Owner", "Admin", "User"].includes(data.role)) throw new Error("Invalid account role.");
        setSession({ role: data.role, meId: data.id, name: data.name,
          canViewValue: Array.isArray(data.permissions) && data.permissions.includes("view_value"),
          loading: false, error: null, workspaceSlug: data.workspace?.slug || "" });
      } catch (error) {
        if (!controller.signal.aborted) setSession({ ...defaultSession, loading: false, error: error instanceof Error ? error.message : "Session unavailable." });
      }
    }
    void load();
    return () => controller.abort();
  }, [path]);
  return <Ctx.Provider value={session}>{children}</Ctx.Provider>;
}
export const useSession = () => useContext(Ctx);

const ToastCtx = createContext<(msg: string, kind?: "ok" | "err") => void>(() => {});
export function ToastProvider({ children }: { children: ReactNode }) {
  const [t, setT] = useState<{ msg: string; kind: "ok" | "err" } | null>(null);
  const show = useCallback((msg: string, kind: "ok" | "err" = "ok") => { setT({ msg, kind }); setTimeout(() => setT(null), 4000); }, []);
  return (
    <ToastCtx.Provider value={show}>
      {children}
      {t && <div role="status" className={`fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-50 max-w-[92vw] rounded-lg px-4 py-3 text-sm shadow-lg text-white ${t.kind === "err" ? "bg-red-600" : "bg-emerald-600"}`}>{t.msg}</div>}
    </ToastCtx.Provider>
  );
}
export const useToast = () => useContext(ToastCtx);
