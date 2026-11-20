import { SiteFooter } from "@/components/site-footer";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GenreBrowser } from "@/components/genre-browser";
import { SiteHeader } from "@/components/site-header";
import { SeriesDialog } from "@/components/series-dialog";
import { PlayerDialog } from "@/components/player-dialog";
import { NoticeToast } from "@/components/notice-toast";
import { genreDefinition, genreDefinitions } from "@/lib/genres";

export function generateStaticParams() { return genreDefinitions.map(genre => ({ genre: genre.key })); }

export async function generateMetadata({ params }: { params: Promise<{ genre: string }> }): Promise<Metadata> {
  const definition = genreDefinition((await params).genre);
  return { title: `${definition?.label ?? "Genres"} · Sidflix` };
}

export default async function GenrePage({ params }: { params: Promise<{ genre: string }> }) {
  const definition = genreDefinition((await params).genre);
  if (!definition) notFound();
  return <><SiteHeader /><main className="px-gutter mx-auto w-full max-w-7xl flex-1 pt-36 pb-16 md:pt-28"><Link href="/#genres" className="mb-6 inline-block text-sm text-fg-muted hover:text-fg">← All collections</Link><GenreBrowser key={definition.key} genre={definition.key} /></main><SiteFooter /><SeriesDialog /><PlayerDialog /><NoticeToast /></>;
}
