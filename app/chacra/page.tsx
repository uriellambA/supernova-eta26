import type { Metadata } from "next";
import { Suspense } from "react";
import { Tablero } from "@/components/Tablero";
import { Cargando } from "@/components/ui";

export const metadata: Metadata = { title: "Mi chacra" };

export default function Page() {
  return (
    <Suspense fallback={<main className="mx-auto w-full max-w-6xl p-4"><Cargando texto="Abriendo tu chacra…" /></main>}>
      <Tablero />
    </Suspense>
  );
}
