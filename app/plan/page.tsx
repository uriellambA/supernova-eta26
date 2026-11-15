import type { Metadata } from "next";
import { PlanView } from "@/components/PlanView";

export const metadata: Metadata = { title: "Action plan · Growvia" };

export default function PlanPage() {
  return <PlanView />;
}
