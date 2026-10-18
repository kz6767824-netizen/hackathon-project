"use client";
import { getCompanies } from "@/lib/api";
import { useAsync } from "@/lib/hooks";
import { A, Page, State, Table, Td } from "@/components/ui";

export default function Companies() {
  const s = useAsync(getCompanies, []);
  return (
    <Page title="Companies">
      <State s={s}>{(cs) => <Table head={["Company", "Industry", "Contacts"]}>{cs.map((c) => <tr key={c.id}><Td><A href={`/companies/${c.id}`}>{c.name}</A></Td><Td>{c.industry}</Td><Td>{c.contacts}</Td></tr>)}</Table>}</State>
    </Page>
  );
}
