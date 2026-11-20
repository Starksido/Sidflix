import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { MovieTrial } from "@/components/movie-trial";

export const metadata: Metadata = { title: "Movie streaming trial · Sidflix", robots: { index: false, follow: false } };

export default function MovieTrialPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <><SiteHeader /><MovieTrial /></>;
}
