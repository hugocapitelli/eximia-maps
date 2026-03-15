"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { authFetch } from "@/lib/gate";
import { Loader2 } from "lucide-react";

export default function NewMapPage() {
  const router = useRouter();

  useEffect(() => {
    async function create() {
      try {
        const res = await authFetch("/api/v1/maps", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: "Mapa sem titulo" }),
        });
        if (res.ok) {
          const data = await res.json();
          router.replace(`/admin/maps/${data.id}/edit`);
        } else {
          router.replace("/admin/maps");
        }
      } catch {
        router.replace("/admin/maps");
      }
    }
    create();
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="animate-spin text-[#82B4C4]" size={32} />
        <p className="text-sm text-muted">Criando mapa...</p>
      </div>
    </div>
  );
}
