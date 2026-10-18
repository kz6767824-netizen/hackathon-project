"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
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

interface Session { role: Role; setRole: (r: Role) => void; canViewValue: boolean; meId: string }
const Ctx = createContext<Session>({ role: "Owner", setRole: () => {}, canViewValue: true, meId: "e1" });
export function SessionProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<Role>("Owner");
  useEffect(() => { try { const r = localStorage.getItem("demoRole") as Role | null; if (r) setRoleState(r); } catch {} }, []);
  const setRole = (r: Role) => { setRoleState(r); try { localStorage.setItem("demoRole", r); } catch {} };
  // Replace with the real logged-in user + permission set from Kashif's auth
  return <Ctx.Provider value={{ role, setRole, canViewValue: role !== "User", meId: role === "User" ? "e5" : "e1" }}>{children}</Ctx.Provider>;
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
