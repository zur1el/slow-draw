import { GroupHub } from "@/components/GroupHub";

type Props = { params: Promise<{ groupId: string }> };

export default async function GroupPage({ params }: Props) {
  const { groupId } = await params;
  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-5 pb-16 pt-8">
      <GroupHub groupId={groupId} />
    </main>
  );
}