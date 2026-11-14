import type { Metadata } from "next";
import { Growvia } from "@/components/Growvia";

export const metadata: Metadata = { title: "Dashboard · Growvia" };

export default function DashboardPage() {
  return <Growvia />;
}
