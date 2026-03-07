import { SharedEditView } from "./client";

export default async function SharedEditPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <SharedEditView token={token} />;
}
