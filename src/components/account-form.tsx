"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export function AccountForm() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const [visible, setVisible] = useState(false);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if (busy) return;
    const values = new FormData(event.currentTarget), email = String(values.get("email") ?? "").trim();
    const password = String(values.get("password") ?? ""), name = String(values.get("name") ?? "").trim();
    setBusy(true); setError("");
    try {
      const result = mode === "signup" ? await authClient.signUp.email({ name, email, password }) : await authClient.signIn.email({ email, password, rememberMe: true });
      if (result.error) { setError(result.error.status === 429 ? "A few too many attempts. Please wait a moment and try again."
        : mode === "signin" ? "The email or password doesn’t match. Please try again." : "We couldn’t create that account. Try signing in if you already have one."); return; }
      router.push(new URLSearchParams(window.location.search).get("next") === "downloads" ? "/downloads" : "/#recommended"); router.refresh();
    } catch { setError("We couldn’t connect. Please try again."); }
    finally { setBusy(false); }
  };
  if (!isPending && session) return <div className="account-panel"><p className="recommendation-eyebrow">YOUR SIDFLIX</p><h1 className="font-display mt-3 text-3xl font-semibold">Welcome back, {session.user.name}.</h1>
    <p className="mt-3 text-fg-muted">Your next favourite is waiting.</p><Link href="/#recommended" className="mt-6 inline-flex rounded-xl bg-accent px-6 py-3 font-semibold text-accent-ink">Explore your picks</Link></div>;
  return <div className="account-panel"><p className="recommendation-eyebrow">A LITTLE MORE YOU</p>
    <h1 className="font-display mt-3 text-3xl font-semibold">{mode === "signup" ? "Make yourself at home." : "Welcome back."}</h1>
    <p className="mt-3 text-sm leading-relaxed text-fg-muted">Sign in for personal picks and viewing history that follow you from screen to screen.</p>
    <form onSubmit={submit} className="mt-7 space-y-5" aria-label={mode === "signup" ? "Create account" : "Sign in"}>
      {mode === "signup" && <label className="block text-sm">Your name<input name="name" required minLength={1} maxLength={24} autoComplete="name" className="account-input" /></label>}
      <label className="block text-sm">Email<input name="email" type="email" required maxLength={254} autoComplete="email" className="account-input" /></label>
      <label className="block text-sm">Password<span className="relative block"><input name="password" type={visible ? "text" : "password"} required minLength={mode === "signup" ? 10 : 1} maxLength={128} autoComplete={mode === "signup" ? "new-password" : "current-password"} aria-describedby={mode === "signup" ? "password-hint" : undefined} className="account-input pr-16" />
        <button type="button" aria-label={visible ? "Hide password" : "Show password"} onClick={() => setVisible(value => !value)} className="absolute inset-y-0 right-3 mt-2 text-xs text-fg-muted">{visible ? "Hide" : "Show"}</button></span></label>
      {mode === "signup" && <p id="password-hint" className="text-xs text-fg-subtle">Use at least 10 characters.</p>}
      {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
      <button type="submit" disabled={busy || isPending} className="w-full rounded-xl bg-accent px-5 py-3 font-semibold text-accent-ink disabled:opacity-50">{busy ? "One moment…" : mode === "signup" ? "Create account" : "Sign in"}</button>
    </form>
    <p className="mt-6 text-sm text-fg-muted">{mode === "signup" ? "Already at home here?" : "New to Sidflix?"} <button type="button" onClick={() => { setMode(value => value === "signup" ? "signin" : "signup"); setError(""); }} className="font-semibold text-accent">{mode === "signup" ? "Sign in" : "Create an account"}</button></p>
    <Link href="/" className="mt-5 inline-block text-xs text-fg-subtle hover:text-fg">Back to browsing</Link>
  </div>;
}
