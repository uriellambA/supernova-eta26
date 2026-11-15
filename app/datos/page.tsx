import type { Metadata } from "next";
import { RegisterForm } from "@/components/RegisterForm";

export const metadata: Metadata = { title: "Farm data · Growvia" };

export default function RegisterPage() {
  return <RegisterForm />;
}
