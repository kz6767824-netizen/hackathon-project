"use client";
import { getEmployees, getRecovery } from "@/lib/api";
import { useAsync } from "@/lib/hooks";
import { A, Badge, Empty, Page, State, Table, Td, ago, statusTone } from "@/components/ui";

export default function Recovery() {
  const s = useAsync(getRecovery, [], 5000); const emps = useAsync(getEmployees, []);
  return (
    <Page title="Recovery queue">
      <p className="mb-3 text-sm text-slate-600">Leads that are unacknowledged past their window, escalated more than once, or untouched. Updates live.</p>
      <State s={s} skeleton={6}>{(items) => items.length === 0 ? <Empty>🎉 Nothing needs recovery.</Empty> : (
        <Table head={["Lead", "Reason", "Owner", "Status", "Last touch"]}>
          {items.map(({ contact: c, reasons }) => (
            <tr key={c.id}>
              <Td><A href={`/contacts/${c.id}`}>{c.name}</A></Td>
              <Td><div className="flex flex-wrap gap-1">{reasons.map((r) => <Badge key={r} tone="red">{r}</Badge>)}</div></Td>
              <Td>{emps.data?.find((e) => e.id === c.ownerId)?.name ?? "…"}</Td>
              <Td><Badge tone={statusTone(c.status)}>{c.status}</Badge></Td><Td>{ago(c.lastTouch)}</Td>
            </tr>
          ))}
        </Table>
      )}</State>
    </Page>
  );
}
