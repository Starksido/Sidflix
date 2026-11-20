"use client";

import { useEffect } from "react";
import { authClient } from "@/lib/auth-client";
import { connectRecommendationAccount } from "@/lib/recommendation-store";
import { currentViewerIdentity, hydrateAccountWatching, setViewerAccount } from "@/lib/viewer-store";

export function AccountSession() {
  const { data, isPending, error } = authClient.useSession();
  const userId = data?.user.id, name = data?.user.name;
  useEffect(() => {
    if (isPending) return;
    setViewerAccount(userId ? { id: userId, name: name ?? "You" } : null);
    if (userId) return connectRecommendationAccount(currentViewerIdentity(), userId, hydrateAccountWatching);
  }, [userId, name, isPending]);
  useEffect(() => {
    if (isPending || error) return;
    let saved = false; try { saved = Boolean(localStorage.getItem("sidflix:downloads:viewer")); } catch {}
    if (userId || saved) void import("@/lib/download-manager").then(({ connectDownloadAccount }) => connectDownloadAccount(userId ? { id: userId, name: name ?? "You" } : null)).catch(() => {});
  }, [userId, name, isPending, error]);
  return null;
}
