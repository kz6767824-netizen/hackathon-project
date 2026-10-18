"use client";
import { use } from "react";
import { getCompany } from "@/lib/api";
import { useAsync } from "@/lib/hooks";
import { A, Badge, Card, Empty, Page, State, Table, Td, statusTone } from "@/components/ui";

export default function CompanyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const s = useAsync(() => getCompany(id), [id]);
  return (
    <Page title="Company">
      <State s={s}>{({ company, contacts }) => (
        <div className="space-y-4">
          <Card><h2 className="text-xl font-bold">{company.name}</h2><p className="text-sm text-slate-600">{company.industry}</p></Card>
          <Card title={`Contacts (${contacts.length})`}>
            {contacts.length === 0 ? <Empty>No contacts at this company.</Empty> : <Table head={["Name", "Phone", "Status"]}>{contacts.map((c) => <tr key={c.id}><Td><A href={`/contacts/${c.id}`}>{c.name}</A></Td><Td>{c.phone}</Td><Td><Badge tone={statusTone(c.status)}>{c.status}</Badge></Td></tr>)}</Table>}
          </Card>
        </div>
      )}</State>
    </Page>
  );
}
