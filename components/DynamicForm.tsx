"use client";
import { useState } from "react";
import type { FieldDef, Opportunity } from "@/lib/types";
import { Button, Input, Label, Select } from "./ui";

type Vals = Opportunity["custom"];
/** Renders ANY set of custom fields from definitions — never hardcode fields. */
export function DynamicForm({ fields, values, onSave, saving }: { fields: FieldDef[]; values: Vals; onSave: (v: Vals) => void; saving?: boolean }) {
  const [v, setV] = useState<Vals>(values);
  const set = (k: string, val: string | number | boolean | null) => setV((p) => ({ ...p, [k]: val }));
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave(v); }} className="space-y-3">
      {fields.map((f) => (
        <div key={f.key}>
          {f.type !== "checkbox" && <Label>{f.label}</Label>}
          {f.type === "text" && <Input value={(v[f.key] as string) ?? ""} onChange={(e) => set(f.key, e.target.value)} />}
          {f.type === "number" && <Input type="number" value={(v[f.key] as number) ?? ""} onChange={(e) => set(f.key, e.target.value === "" ? null : Number(e.target.value))} />}
          {f.type === "date" && <Input type="date" value={(v[f.key] as string) ?? ""} onChange={(e) => set(f.key, e.target.value || null)} />}
          {f.type === "dropdown" && (
            <Select value={(v[f.key] as string) ?? ""} onChange={(e) => set(f.key, e.target.value || null)}>
              <option value="">Select…</option>{f.options?.map((o) => <option key={o}>{o}</option>)}
            </Select>
          )}
          {f.type === "checkbox" && <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4" checked={!!v[f.key]} onChange={(e) => set(f.key, e.target.checked)} />{f.label}</label>}
        </div>
      ))}
      <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save fields"}</Button>
    </form>
  );
}
