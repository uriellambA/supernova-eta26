import type { Metadata } from "next";
import { DownloadView } from "@/components/DownloadView";

export const metadata: Metadata = { title: "Download · Growvia", description: "Official Growvia apps for Windows, macOS, Linux and Android." };

export default function DownloadPage() {
  return <DownloadView />;
}
