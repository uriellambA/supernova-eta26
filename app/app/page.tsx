import type { Metadata } from "next";
import { Growvia } from "@/components/Growvia";

export const metadata: Metadata = { title: "Dashboard · Growvia" };

/** The dashboard opens for everyone; Growwy (the SI) unlocks once the farm data is loaded. */
export default function DashboardPage() {
  return <Growvia />;
}
