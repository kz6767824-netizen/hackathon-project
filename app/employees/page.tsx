"use client";
import { getEmployees, setEmployeeStatus } from "@/lib/api";
import { useAsync, useToast } from "@/lib/hooks";
import type { Availability } from "@/lib/types";
import { Badge, Page, Select, State, Table, Td, statusTone } from "@/components/ui";

export default function Employees() {
  const s = useAsync(getEmployees, [], 5000); const toast = useToast();
  return (
    <Page title="Employees">
      <State s={s}>{(es) => (
        <Table head={["Name", "Role", "Open leads", "Availability"]}>
          {es.map((e) => (
            <tr key={e.id}>
              <Td className="font-medium">{e.name}</Td><Td><Badge tone="indigo">{e.role}</Badge></Td><Td>{e.openLeads}</Td>
              <Td><div className="flex items-center gap-2"><Badge tone={statusTone(e.status)}>{e.status}</Badge>
                <Select className="w-28" aria-label="Set availability" value={e.status} onChange={async (ev) => { await setEmployeeStatus(e.id, ev.target.value as Availability); toast(`${e.name} is now ${ev.target.value}`); s.reload(); }}>
                  <option>available</option><option>away</option><option>offline</option>
                </Select></div></Td>
            </tr>
          ))}
        </Table>
      )}</State>
    </Page>
  );
}
