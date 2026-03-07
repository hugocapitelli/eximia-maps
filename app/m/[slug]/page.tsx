import { PublicMapView } from "./client";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  return {
    title: `Mapa Mental — eximIA Maps`,
    description: `Visualize este mapa mental interativo`,
  };
}

export default async function PublicMapPage({ params }: Props) {
  const { slug } = await params;
  return <PublicMapView slug={slug} />;
}
