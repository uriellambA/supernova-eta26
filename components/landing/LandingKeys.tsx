"use client";
import { useRouter } from "next/navigation";
import { useHotkeys } from "../ui";

export function LandingKeys() {
  const router = useRouter();
  useHotkeys({ d: () => router.push("/app"), r: () => router.push("/register") });
  return null;
}
