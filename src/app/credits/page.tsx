import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = { title: "Credits · Sidflix" };

export default function CreditsPage() {
  return <><SiteHeader /><main className="px-gutter mx-auto w-full max-w-4xl flex-1 pt-36 pb-16 md:pt-28">
    <Link href="/" className="mb-6 inline-block text-sm text-fg-muted hover:text-fg">← Back to Sidflix</Link>
    <h1 className="font-display text-3xl font-bold">Credits</h1>
    <div className="mt-8 space-y-6 text-sm leading-relaxed text-fg-muted">
      <p>With thanks to the artists, filmmakers and contributors behind the stories and artwork on Sidflix.</p>
      <p>Contains data from <a href="https://introdb.app/" className="underline underline-offset-4">IntroDB (introdb.app)</a>, available under the <a href="https://opendatacommons.org/licenses/odbl/1-0/" className="underline underline-offset-4">ODbL</a>.</p>
      <p>This product uses the TMDB API but is not endorsed or certified by TMDB.</p>
      <p><a href="https://www.themoviedb.org/" className="underline underline-offset-4">TMDB</a> · <a href="https://www.thesportsdb.com/" className="underline underline-offset-4">TheSportsDB</a> · <a href="https://github.com/iptv-org/iptv" className="underline underline-offset-4">iptv-org</a> · <a href="https://archive.org/" className="underline underline-offset-4">Internet Archive</a></p>
      <p><a href="https://durian.blender.org/" className="underline underline-offset-4">Sintel</a> and <a href="https://peach.blender.org/" className="underline underline-offset-4">Big Buck Bunny</a> © Blender Foundation, licensed under <a href="https://creativecommons.org/licenses/by/3.0/" className="underline underline-offset-4">CC BY 3.0</a>.</p>
      <p><a href="https://www.caminandes.com/" className="underline underline-offset-4">Caminandes: Llama Drama</a> and <a href="https://studio.blender.org/films/caminandes-llamigos/" className="underline underline-offset-4">Caminandes: Llamigos</a> © Blender Foundation, licensed under <a href="https://creativecommons.org/licenses/by/3.0/" className="underline underline-offset-4">CC BY 3.0</a>. With thanks to their filmmakers and artists.</p>
    </div>
  </main><SiteFooter /></>;
}
