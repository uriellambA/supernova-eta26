import type { Metadata } from "next";
import { GrowwyIntro } from "@/components/landing/GrowwyIntro";
import { SiteFooter, SiteHeader } from "@/components/landing/SiteChrome";

export const metadata: Metadata = { title: "About Growwy · Growvia", description: "Growwy, Growvia's SI inspired by the Pachamama: what she does and how she helps each farmer decide." };

/** "About Growwy": who Growwy is and how she helps. */
export default function GrowwyPage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main>
        <GrowwyIntro />
      </main>
      <SiteFooter />
    </div>
  );
}
