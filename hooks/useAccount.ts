"use client";
import { useSyncExternalStore } from "react";
import { accountSnapshot, subscribeAccount, type AccountState } from "@/lib/account";

const SERVER: AccountState = { session: null, sync: { status: "off" }, ready: false, enabled: false };
/** Who is signed in and how the sync is going (updates by itself). */
export const useAccount = () => useSyncExternalStore(subscribeAccount, accountSnapshot, () => SERVER);
