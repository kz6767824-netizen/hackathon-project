import type { Activity } from "@/lib/types";
import { Empty, ago } from "./ui";
const icon: Record<string, string> = { assignment: "👤", note: "📝", ack: "✅", stage: "➡️", field: "✏️", message: "💬", payment: "💳", appointment: "📅" };
export function Timeline({ items }: { items: Activity[] }) {
  if (!items.length) return <Empty>No activity yet.</Empty>;
  return (
    <ol className="space-y-3">
      {items.map((a) => (
        <li key={a.id} className="flex gap-3 text-sm">
          <span className="mt-0.5">{icon[a.type] ?? "•"}</span>
          <div><p className="text-slate-800">{a.text}</p><p className="text-xs text-slate-500">{a.actor} · {ago(a.at)}</p></div>
        </li>
      ))}
    </ol>
  );
}
