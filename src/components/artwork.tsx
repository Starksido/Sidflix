import Image from "next/image";
import type { CSSProperties } from "react";
import type { Title } from "@/lib/catalog";

// Real artwork when a source supplies it, over generated key art that shows while it
// loads and stands in for titles without any. Each niche has its own visual language;
// the title id seeds small variations.

type ArtworkProps = {
  title: Title;
  /** Show the title as a wordmark inside the art. */
  showTitle?: boolean;
  /** Fill the nearest positioned ancestor instead of sizing itself. */
  fill?: boolean;
  /** Which source image suits the frame: 5:7 poster or 16:9 backdrop. */
  shape?: "poster" | "wide";
  /** Rendered width hint for the image, as in next/image `sizes`. */
  sizes?: string;
  /** Above the fold: load the image immediately at high priority. */
  eager?: boolean;
  className?: string;
};

function seed(id: string, salt: number): number {
  let h = salt;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return (h % 1000) / 1000;
}

export function Artwork({
  title,
  showTitle = false,
  fill = false,
  shape = "wide",
  sizes,
  eager = false,
  className = "",
}: ArtworkProps) {
  const { from, to, image } = title.art;
  const src = shape === "poster" ? (image?.poster ?? image?.backdrop) : (image?.backdrop ?? image?.poster);
  const x = 20 + seed(title.id, 7) * 60;
  const y = 18 + seed(title.id, 13) * 40;

  return (
    <div
      aria-hidden
      className={`@container isolate overflow-hidden ${fill ? "absolute inset-0" : "relative"} ${className}`}
      style={{ "--art-from": from, "--art-to": to } as CSSProperties}
    >
      {title.niche === "anime" && <AnimeMotif x={x} y={y} />}
      {title.niche === "sports" && <SportsMotif />}
      {title.niche === "indie" && <IndieMotif x={x} y={y} horizon={!fill} />}
      {title.niche === "gaming" && <GamingMotif />}
      {src ? (
        <>
          <Image
            src={src}
            alt=""
            fill
            sizes={sizes ?? (shape === "poster" ? "(min-width: 37.5rem) 11rem, 38vw" : "(min-width: 37.5rem) 24rem, 78vw")}
            loading={eager ? "eager" : "lazy"}
            fetchPriority={eager ? "high" : undefined}
            className="object-cover"
          />
          <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent to-50%" />
        </>
      ) : (
        <>
          <div className="grain absolute inset-0" />
          {showTitle && title.niche !== "sports" && <Wordmark title={title} />}
        </>
      )}
    </div>
  );
}

function AnimeMotif({ x, y }: { x: number; y: number }) {
  return (
    <>
      <div className="absolute inset-0 bg-[linear-gradient(165deg,var(--art-to)_20%,color-mix(in_oklab,var(--art-to),black_45%))]" />
      <div
        className="absolute inset-0 opacity-60"
        style={{
          background: `repeating-conic-gradient(from 0deg at ${x}% ${y}%, rgb(255 255 255 / .14) 0deg 1.2deg, transparent 1.2deg 8deg)`,
          maskImage: `radial-gradient(circle at ${x}% ${y}%, black 10%, transparent 75%)`,
        }}
      />
      <div
        className="absolute aspect-square w-[58%] -translate-x-1/2 -translate-y-1/2 rounded-full shadow-[0_0_80px_10px_var(--art-from)]"
        style={{
          left: `${x}%`,
          top: `${y}%`,
          background:
            "radial-gradient(circle at 35% 30%, color-mix(in oklab, var(--art-from), white 45%), var(--art-from) 60%)",
        }}
      />
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-linear-to-t from-black/70 to-transparent" />
    </>
  );
}

function SportsMotif() {
  return (
    <>
      <div className="absolute inset-0 bg-[linear-gradient(115deg,var(--art-from)_0_50%,var(--art-to)_50%_100%)]" />
      <div className="absolute inset-0 bg-[repeating-linear-gradient(90deg,rgb(255_255_255/.07)_0_6%,transparent_6%_12%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_-20%,rgb(255_255_255/.45),transparent_60%)]" />
      <div className="absolute inset-y-0 left-1/2 w-px bg-white/35" />
      <div className="absolute top-1/2 left-1/2 aspect-square w-[34%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/35" />
      <div className="absolute inset-0 bg-[linear-gradient(to_top,rgb(0_0_0/.75),transparent_55%)]" />
    </>
  );
}

function IndieMotif({ x, y, horizon }: { x: number; y: number; horizon: boolean }) {
  return (
    <>
      <div className="absolute inset-0 bg-[linear-gradient(180deg,color-mix(in_oklab,var(--art-to),black_20%),color-mix(in_oklab,var(--art-to),black_70%))]" />
      <div
        className="absolute inset-0 blur-2xl"
        style={{
          background: `radial-gradient(circle at ${x}% ${y}%, var(--art-from), transparent 38%),
            radial-gradient(circle at ${100 - x}% ${y + 30}%, color-mix(in oklab, var(--art-from), transparent 40%), transparent 30%)`,
        }}
      />
      {horizon && <div className="absolute inset-x-0 top-[62%] h-px bg-white/25" />}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,rgb(0_0_0/.65))]" />
    </>
  );
}

function GamingMotif() {
  return (
    <>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_100%,var(--art-from),var(--art-to)_65%)]" />
      <div className="absolute inset-x-[-50%] bottom-[-10%] h-[70%] origin-bottom transform-[perspective(300px)_rotateX(62deg)] bg-[linear-gradient(to_right,color-mix(in_oklab,var(--art-from),white_30%)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_oklab,var(--art-from),white_30%)_1px,transparent_1px)] bg-size-[40px_40px] opacity-50 mask-[linear-gradient(to_top,black,transparent)]" />
      <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,rgb(0_0_0/.22)_0_2px,transparent_2px_4px)]" />
    </>
  );
}

function Wordmark({ title }: { title: Title }) {
  const base = "absolute inset-x-[7%] bottom-[7%] text-balance leading-[0.92] text-white";
  if (title.niche === "indie") {
    return (
      <p className={`${base} font-serif text-[15cqi] italic leading-[0.95]`}>{title.title}</p>
    );
  }
  if (title.niche === "gaming") {
    return (
      <p
        className={`${base} font-display text-[12cqi] font-extrabold tracking-tight`}
        style={{ textShadow: "0 0 18px var(--art-from)" }}
      >
        {title.title}
      </p>
    );
  }
  return (
    <p className={`${base} font-display text-[13cqi] font-extrabold uppercase tracking-tight font-stretch-condensed`}>
      {title.title}
    </p>
  );
}
