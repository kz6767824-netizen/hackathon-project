"use client";
import Link from "next/link";
import { useState } from "react";
import { getDashboard, getPrefs, setPrefs } from "@/lib/api";
import { useAsync, useSession } from "@/lib/hooks";
import { Button, Card, Page, State } from "@/components/ui";

export default function Dashboard() {
  const { role, meId, canViewValue } = useSession();
  const s = useAsync(() => getDashboard(role, meId, canViewValue), [role, meId, canViewValue], 5000);
  const [hidden, setHidden] = useState<string[]>(() => getPrefs().hidden);
  const [menu, setMenu] = useState(false);
  const toggle = (id: string) => { const h = hidden.includes(id) ? hidden.filter((x) => x !== id) : [...hidden, id]; setHidden(h); setPrefs({ hidden: h }); };
  return (
    <Page title={role === "User" ? "My dashboard" : "Company dashboard"} actions={<Button variant="ghost" onClick={() => setMenu(!menu)}>Customize ▾</Button>}>
      <State s={s} skeleton={6}>
        {(figs) => (
          <>
            {menu && (
              <Card className="mb-4" title="Show / hide figures">
                <div className="grid gap-2 sm:grid-cols-2">{figs.map((f) => <label key={f.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!hidden.includes(f.id)} onChange={() => toggle(f.id)} />{f.label}</label>)}</div>
              </Card>
            )}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {figs.filter((f) => !hidden.includes(f.id)).map((f) => (
                <Link key={f.id} href={f.href} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-indigo-400 hover:shadow">
                  <p className="text-xs font-medium uppercase text-slate-500">{f.label}</p>
                  <p className="mt-2 text-2xl font-bold text-slate-900">{f.value}</p>
                  {f.hint && <p className="mt-1 text-xs text-slate-500">{f.hint}</p>}
                </Link>
              ))}
            </div>
            <p className="mt-4 text-xs text-slate-500">Auto-refreshes every 5 seconds. Click a figure to see the records behind it.</p>
          </>
        )}
      </State>
    </Page>
  );
}
