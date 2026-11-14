import type { Metadata } from "next";
import { SharedSession } from "@/components/SharedSession";

export const metadata: Metadata = { title: "Shared report · Growvia" };

export default function SharedPage() {
  return <SharedSession />;
}
