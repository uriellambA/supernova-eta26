import type { Metadata } from "next";
import { Growvia } from "@/components/Growvia";
import { RequireFarm } from "@/components/RequireFarm";

export const metadata: Metadata = { title: "Dashboard · Growvia" };

export default function DashboardPage() {
  return (
    <RequireFarm>
      <Growvia />
    </RequireFarm>
  );
}
