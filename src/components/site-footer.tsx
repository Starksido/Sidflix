import Link from "next/link";

export function SiteFooter() {
  return <footer className="px-gutter border-line border-t py-9 text-xs text-fg-subtle">
    <div className="flex flex-wrap items-center justify-between gap-5">
      <div><p className="font-display text-sm font-semibold tracking-wide text-fg-muted">Sidflix</p>
        <p className="mt-2">Stories worth staying in for.</p></div>
      <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-3">
        <Link href="/movies" className="hover:text-fg">Movies</Link>
        <Link href="/tv-shows" className="hover:text-fg">TV shows</Link>
        <Link href="/anime" className="hover:text-fg">Anime</Link>
        <Link href="/credits" className="hover:text-fg">Credits</Link>
      </nav>
    </div>
  </footer>;
}
