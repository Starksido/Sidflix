"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { MagnifyingGlassIcon, DotsThreeIcon } from "@phosphor-icons/react";
import { ProfileSwitcher } from "@/components/profile-switcher";
import { SHOW_LOCAL_LIBRARY } from "@/lib/library-visibility";

const links = [{ href: "/", label: "Home" }, { href: "/tv-shows", label: "Shows" }, { href: "/movies", label: "Movies" }, { href: "/#continue", label: "My Sidflix" }, { href: "/#live-tv", label: "Live TV" }];

export function SiteHeader() {
  const pathname = usePathname();
  return <header className="cinema-header">
    <div className="header-profile"><ProfileSwitcher /></div>
    <nav aria-label="Browse" className="cinema-nav scrollbar-none">
      <Link prefetch={false} href="/search" aria-label="Search" className={`nav-search ${pathname === "/search" ? "is-active" : ""}`}><MagnifyingGlassIcon size={23} weight="bold" aria-hidden /></Link>
      {links.map(link => <Link prefetch={false} key={link.label} href={link.href} aria-current={link.href === pathname ? "page" : undefined} className={link.href === pathname ? "is-active" : ""}>{link.label}</Link>)}
      <details className="nav-more"><summary aria-label="More categories"><DotsThreeIcon size={26} weight="bold" aria-hidden /></summary><div><Link prefetch={false} href="/downloads" aria-current={pathname === "/downloads" ? "page" : undefined}>Downloads</Link><Link prefetch={false} href="/#genres">Genres</Link><Link prefetch={false} href="/anime" aria-current={pathname === "/anime" ? "page" : undefined}>Anime</Link><Link prefetch={false} href="/#indie">Indie films</Link>{SHOW_LOCAL_LIBRARY && <Link prefetch={false} href="/#library">On this laptop</Link>}<Link prefetch={false} href="/search?tv=1">TV browsing</Link></div></details>
    </nav>
    <Link prefetch={false} href="/" className="cinema-brand" aria-label="Sidflix home"><Image src="/brand/sidflix-greek-sky.png" alt="Sidflix" width={2160} height={720} sizes="(max-width: 600px) 140px, 176px" priority /></Link>
  </header>;
}
