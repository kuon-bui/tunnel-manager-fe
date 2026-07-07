import { DomainDetail } from "@/components/domain-detail";

export default async function DomainDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <DomainDetail id={id} />;
}
