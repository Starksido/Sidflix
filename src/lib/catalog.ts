// Demo catalogue for the storefront. All titles are fictional except the two
// Blender Foundation open movies (Sintel, Big Buck Bunny), used under CC BY 3.0.
// Live sources in src/lib/sources replace a niche's demo titles when they respond;
// these stay as the fallback and so seeded watch history still resolves.

export type Niche = "anime" | "sports" | "indie" | "gaming";

export type Maturity = "all" | "7+" | "13+" | "16+";

export const maturityOrder: Maturity[] = ["all", "7+", "13+", "16+"];

export type Art = {
  /** Primary and secondary artwork colours. Sports use home and away team colours. */
  from: string;
  to: string;
  /** Real artwork from a source. Without it, artwork is generated from the colours. */
  image?: { poster?: string; backdrop?: string };
};

type BaseTitle = {
  id: string;
  title: string;
  niche: Niche;
  maturity: Maturity;
  synopsis: string;
  art: Art;
  /** Where the data comes from, for attribution. Absent on demo titles. */
  source?: { label: string; href: string };
};

export type SeriesTitle = BaseTitle & {
  kind: "series";
  year: number;
  seasons: number;
  episodeMinutes: number;
};

export type FilmTitle = BaseTitle & {
  kind: "film";
  year: number;
  minutes: number;
  director?: string;
};

export type LiveEvent = BaseTitle & {
  kind: "live";
  competition: string;
  /** Match clock or start time, e.g. "62'" or "Starts 18:00". */
  status: string;
  isLive: boolean;
  score?: string;
};

export type Channel = BaseTitle & {
  kind: "channel";
  game: string;
  host: string;
  viewers: number;
};

export type Title = SeriesTitle | FilmTitle | LiveEvent | Channel;

export type Trailer = {
  src: string;
  credit: string;
  creditHref: string;
};

export const niches: Record<
  Niche,
  { label: string; heading: string; description: string }
> = {
  anime: {
    label: "Anime",
    heading: "Anime",
    description: "New episodes every week, subbed and dubbed.",
  },
  sports: {
    label: "Live sports",
    heading: "Live and upcoming",
    description: "Matches in progress and kicking off today.",
  },
  indie: {
    label: "Indie films",
    heading: "Indie films",
    description: "Small crews, singular voices, and public-domain classics.",
  },
  gaming: {
    label: "Gaming",
    heading: "Gaming streams",
    description: "Live channels from speedruns to cozy builds.",
  },
};

export const nicheOrder: Niche[] = ["anime", "sports", "indie", "gaming"];

const titles = [
  // Anime
  {
    id: "afterglow-rail",
    kind: "series",
    title: "Afterglow Rail",
    niche: "anime",
    maturity: "13+",
    year: 2026,
    seasons: 2,
    episodeMinutes: 24,
    synopsis:
      "A night-train crew ferries lost passengers between cities that only exist after sunset. Season two follows the conductor's search for the last stop.",
    art: { from: "#ff5fa2", to: "#2a1458" },
  },
  {
    id: "hollow-moon-academy",
    kind: "series",
    title: "Hollow Moon Academy",
    niche: "anime",
    maturity: "13+",
    year: 2025,
    seasons: 1,
    episodeMinutes: 23,
    synopsis: "Students at a lunar boarding school learn the moon is hollow, and occupied.",
    art: { from: "#c9d6ff", to: "#1b1f4b" },
  },
  {
    id: "kitsune-delivery",
    kind: "series",
    title: "Kitsune Delivery Co.",
    niche: "anime",
    maturity: "7+",
    year: 2024,
    seasons: 3,
    episodeMinutes: 22,
    synopsis: "A fox spirit runs the fastest courier service in a rain-soaked mountain town.",
    art: { from: "#ff9f43", to: "#5b1a1a" },
  },
  {
    id: "steel-bloom",
    kind: "series",
    title: "Steel Bloom",
    niche: "anime",
    maturity: "16+",
    year: 2026,
    seasons: 1,
    episodeMinutes: 25,
    synopsis: "Mech pilots on a dying colony ship fight over the last working greenhouse.",
    art: { from: "#7ee8c4", to: "#102a2b" },
  },
  {
    id: "tidecaller",
    kind: "series",
    title: "Tidecaller",
    niche: "anime",
    maturity: "7+",
    year: 2023,
    seasons: 2,
    episodeMinutes: 24,
    synopsis: "An island girl who can hear the sea sets out to find where the waves come from.",
    art: { from: "#4cc9f0", to: "#0b2545" },
  },
  {
    id: "ninth-floor-dojo",
    kind: "series",
    title: "Ninth Floor Dojo",
    niche: "anime",
    maturity: "13+",
    year: 2022,
    seasons: 4,
    episodeMinutes: 24,
    synopsis: "Office workers by day, sparring partners after hours in a dojo hidden above the payroll department.",
    art: { from: "#ffd166", to: "#3b1f0e" },
  },
  {
    id: "paper-comet",
    kind: "series",
    title: "Paper Comet",
    niche: "anime",
    maturity: "all",
    year: 2025,
    seasons: 1,
    episodeMinutes: 12,
    synopsis: "Two siblings fold a paper comet that actually flies, and has opinions.",
    art: { from: "#ffe3f1", to: "#6a3fb5" },
  },
  {
    id: "ronin-exe",
    kind: "series",
    title: "Ronin.exe",
    niche: "anime",
    maturity: "16+",
    year: 2026,
    seasons: 1,
    episodeMinutes: 26,
    synopsis: "A masterless AI takes contracts in a city where every wall is a screen.",
    art: { from: "#ff4d6d", to: "#120a1f" },
  },
  {
    id: "lantern-street",
    kind: "series",
    title: "Lantern Street Diaries",
    niche: "anime",
    maturity: "7+",
    year: 2024,
    seasons: 2,
    episodeMinutes: 22,
    synopsis: "Shopkeepers on one narrow street share a year of festivals, floods and good noodles.",
    art: { from: "#ffb38a", to: "#4a1c3a" },
  },
  {
    id: "skyward-brass",
    kind: "series",
    title: "Skyward Brass",
    niche: "anime",
    maturity: "all",
    year: 2023,
    seasons: 2,
    episodeMinutes: 23,
    synopsis: "A school marching band rebuilds an airship to play at the cloud festival.",
    art: { from: "#f9f871", to: "#2d5d7b" },
  },

  // Live sports
  {
    id: "harbour-vs-lakeside",
    kind: "live",
    title: "Harbour City FC vs Lakeside United",
    niche: "sports",
    maturity: "all",
    competition: "Coastal Premier League",
    status: "62'",
    isLive: true,
    score: "2–1",
    synopsis: "Second-placed Harbour City host the league leaders in the coastal derby.",
    art: { from: "#0077b6", to: "#e63946" },
  },
  {
    id: "rift-valley-marathon",
    kind: "live",
    title: "Rift Valley Marathon",
    niche: "sports",
    maturity: "all",
    competition: "Highland Road Series",
    status: "Km 31",
    isLive: true,
    synopsis: "The lead pack of six is inside course-record pace with eleven kilometres to go.",
    art: { from: "#2a9d8f", to: "#e9c46a" },
  },
  {
    id: "coastline-t20",
    kind: "live",
    title: "Kilifi Sharks vs Malindi Dhows",
    niche: "sports",
    maturity: "all",
    competition: "Coastline T20",
    status: "14.2 overs",
    isLive: true,
    score: "118/3",
    synopsis: "Kilifi chase 171 under lights.",
    art: { from: "#023e8a", to: "#ffb703" },
  },
  {
    id: "sevens-cup-final",
    kind: "live",
    title: "Capital Sevens: Cup final",
    niche: "sports",
    maturity: "all",
    competition: "Capital Sevens",
    status: "Starts 18:00",
    isLive: false,
    synopsis: "The two unbeaten sides meet for the cup.",
    art: { from: "#386641", to: "#f2e8cf" },
  },
  {
    id: "courtside-night",
    kind: "live",
    title: "Eastside Kites vs Uptown Herons",
    niche: "sports",
    maturity: "all",
    competition: "Courtside Night",
    status: "Starts 21:00",
    isLive: false,
    synopsis: "Game six. The Herons need a win to force a decider.",
    art: { from: "#7b2cbf", to: "#ff9e00" },
  },
  {
    id: "ring-of-ten",
    kind: "live",
    title: "Ring of Ten: Welterweight title",
    niche: "sports",
    maturity: "16+",
    competition: "Ring of Ten",
    status: "Starts 22:30",
    isLive: false,
    synopsis: "The champion's third defence, against a southpaw who has never been knocked down.",
    art: { from: "#9d0208", to: "#111111" },
  },

  // Indie films
  {
    id: "sintel",
    kind: "film",
    title: "Sintel",
    niche: "indie",
    maturity: "13+",
    year: 2010,
    minutes: 15,
    director: "Colin Levy",
    synopsis:
      "A lone traveller searches a frozen world for the baby dragon she raised and lost. An open movie from the Blender Foundation.",
    art: { from: "#c08552", to: "#1d2a33" },
  },
  {
    id: "quiet-harbour",
    kind: "film",
    title: "The Quiet Harbour",
    niche: "indie",
    maturity: "13+",
    year: 2025,
    minutes: 98,
    director: "Neema Achieng",
    synopsis: "A ferry pilot's last week on the job, told one crossing at a time.",
    art: { from: "#9ad1c4", to: "#1f3b4d" },
  },
  {
    id: "salt-and-saffron",
    kind: "film",
    title: "Salt & Saffron",
    niche: "indie",
    maturity: "13+",
    year: 2024,
    minutes: 112,
    director: "Idris Farah",
    synopsis: "Two rival cooks share a kitchen for one wedding season.",
    art: { from: "#f4a259", to: "#5b2333" },
  },
  {
    id: "matatu-nights",
    kind: "film",
    title: "Matatu Nights",
    niche: "indie",
    maturity: "16+",
    year: 2026,
    minutes: 101,
    director: "Kamau Otieno",
    synopsis: "A driver and his conductor work the late route through a city that never quite sleeps.",
    art: { from: "#f72585", to: "#3a0ca3" },
  },
  {
    id: "small-hours",
    kind: "film",
    title: "Small Hours",
    niche: "indie",
    maturity: "13+",
    year: 2023,
    minutes: 87,
    director: "Lena Morales",
    synopsis: "A radio host takes calls from the same stranger every night at 3 a.m.",
    art: { from: "#b8c0ff", to: "#22223b" },
  },
  {
    id: "glasshouse-summer",
    kind: "film",
    title: "Glasshouse Summer",
    niche: "indie",
    maturity: "all",
    year: 2025,
    minutes: 94,
    director: "Ama Mensah",
    synopsis: "Three cousins try to save their grandmother's greenhouse before the end of the holidays.",
    art: { from: "#cdeac0", to: "#386641" },
  },
  {
    id: "what-the-river-kept",
    kind: "film",
    title: "What the River Kept",
    niche: "indie",
    maturity: "16+",
    year: 2024,
    minutes: 118,
    director: "Tomás Reyes",
    synopsis: "A drought exposes a village that was flooded fifty years ago, and the secret drowned with it.",
    art: { from: "#a3b18a", to: "#2b2d42" },
  },
  {
    id: "big-buck-bunny",
    kind: "film",
    title: "Big Buck Bunny",
    niche: "indie",
    maturity: "all",
    year: 2008,
    minutes: 10,
    director: "Sacha Goedegebure",
    synopsis:
      "A gentle giant rabbit gets even with three bullying rodents. An open movie from the Blender Foundation.",
    art: { from: "#a7c957", to: "#386fa4" },
  },

  // Gaming streams
  {
    id: "speedrun-weekend",
    kind: "channel",
    title: "Speedrun Weekend",
    niche: "gaming",
    maturity: "7+",
    game: "Charity marathon",
    host: "Relay Club",
    viewers: 48200,
    synopsis: "Forty-eight hours of world-record attempts, live for charity.",
    art: { from: "#9b8cff", to: "#0b0630" },
  },
  {
    id: "pixel-siege-league",
    kind: "channel",
    title: "Pixel Siege League",
    niche: "gaming",
    maturity: "13+",
    game: "Pixel Siege",
    host: "PSL Official",
    viewers: 31400,
    synopsis: "Grand finals day: the top eight teams, best of five.",
    art: { from: "#ff006e", to: "#1a0033" },
  },
  {
    id: "frame-perfect",
    kind: "channel",
    title: "Frame Perfect",
    niche: "gaming",
    maturity: "13+",
    game: "Fighting games",
    host: "Juma Plays",
    viewers: 12900,
    synopsis: "Ranked grind and frame-data breakdowns.",
    art: { from: "#fb5607", to: "#200d00" },
  },
  {
    id: "drift-kings",
    kind: "channel",
    title: "Drift Kings Arena",
    niche: "gaming",
    maturity: "all",
    game: "Racing",
    host: "Apex Lane",
    viewers: 6100,
    synopsis: "Community drift battles, judged live.",
    art: { from: "#3a86ff", to: "#020c26" },
  },
  {
    id: "lofi-dungeon",
    kind: "channel",
    title: "Lo-fi Dungeon",
    niche: "gaming",
    maturity: "7+",
    game: "Roguelike",
    host: "Moss & Lantern",
    viewers: 3300,
    synopsis: "Slow runs, soft music, no rush.",
    art: { from: "#80ffdb", to: "#10002b" },
  },
  {
    id: "night-shift-builds",
    kind: "channel",
    title: "Night Shift Builds",
    niche: "gaming",
    maturity: "all",
    game: "City builder",
    host: "Wren Builds",
    viewers: 2400,
    synopsis: "Building a whole city from one road, one night at a time.",
    art: { from: "#ffbe0b", to: "#1b1b3a" },
  },
] as const satisfies Title[];

export type TitleId = (typeof titles)[number]["id"];

export const demoTitles: readonly Title[] = titles;

export function titlesInNiche(niche: Niche): Title[] {
  return titles.filter((t) => t.niche === niche);
}

export const featured: { id: TitleId; trailer?: Trailer }[] = [
  {
    id: "sintel",
    trailer: {
      src: "https://download.blender.org/durian/trailer/sintel_trailer-720p.mp4",
      credit: "Sintel trailer © Blender Foundation, CC BY 3.0",
      creditHref: "https://durian.blender.org/",
    },
  },
  { id: "afterglow-rail" },
  { id: "harbour-vs-lakeside" },
  { id: "speedrun-weekend" },
  {
    id: "big-buck-bunny",
    trailer: {
      src: "https://download.blender.org/peach/trailer/trailer_iphone.m4v",
      credit: "Big Buck Bunny trailer © Blender Foundation, CC BY 3.0",
      creditHref: "https://peach.blender.org/",
    },
  },
];

export const topTen: TitleId[] = [
  "steel-bloom",
  "quiet-harbour",
  "kitsune-delivery",
  "afterglow-rail",
  "matatu-nights",
  "paper-comet",
  "salt-and-saffron",
  "tidecaller",
  "glasshouse-summer",
  "ronin-exe",
];

/** Everything the home page renders, assembled on the server from live sources and demo data. */
export type HomeCatalog = {
  rails: Record<Niche, Title[]>;
  featured: { id: string; trailer?: Trailer }[];
  topTen: string[];
  /** Every title the client may need to resolve, including those in watch history. */
  titles: Title[];
};

export type Profile = {
  id: string;
  name: string;
  maxMaturity: Maturity;
  color: string;
  isKids?: boolean;
};

export const profiles: Profile[] = [
  { id: "sam", name: "Sam", maxMaturity: "16+", color: "#ffb224" },
  { id: "amani", name: "Amani", maxMaturity: "16+", color: "#4cc9f0" },
  { id: "leo", name: "Leo", maxMaturity: "13+", color: "#9b8cff" },
  { id: "kids", name: "Kids", maxMaturity: "7+", color: "#ff5fa2", isKids: true },
];

export type WatchEntry = {
  titleId: string;
  /** 0–1 */
  progress: number;
  /** Series only: season and episode in progress. */
  season?: number;
  episode?: number;
};

/** Starting watch history per profile, before any local changes. */
export const seedWatching: Record<string, WatchEntry[]> = {
  sam: [
    { titleId: "steel-bloom", progress: 0.64, season: 1, episode: 7 },
    { titleId: "quiet-harbour", progress: 0.38 },
    { titleId: "afterglow-rail", progress: 0.82, season: 2, episode: 3 },
    { titleId: "ronin-exe", progress: 0.15, season: 1, episode: 2 },
    { titleId: "what-the-river-kept", progress: 0.47 },
  ],
  amani: [
    { titleId: "salt-and-saffron", progress: 0.52 },
    { titleId: "hollow-moon-academy", progress: 0.71, season: 1, episode: 10 },
    { titleId: "small-hours", progress: 0.23 },
    { titleId: "lantern-street", progress: 0.33, season: 2, episode: 4 },
  ],
  leo: [
    { titleId: "ninth-floor-dojo", progress: 0.4, season: 3, episode: 4 },
    { titleId: "kitsune-delivery", progress: 0.88, season: 1, episode: 5 },
    { titleId: "sintel", progress: 0.3 },
  ],
  kids: [
    { titleId: "paper-comet", progress: 0.45, season: 1, episode: 6 },
    { titleId: "big-buck-bunny", progress: 0.7 },
    { titleId: "skyward-brass", progress: 0.12, season: 2, episode: 1 },
  ],
};

export function isAllowed(maturity: Maturity, max: Maturity): boolean {
  return maturityOrder.indexOf(maturity) <= maturityOrder.indexOf(max);
}

/** Minutes of a film or the current episode. */
export function runtimeMinutes(title: Title): number | null {
  if (title.kind === "film") return title.minutes;
  if (title.kind === "series") return title.episodeMinutes;
  return null;
}

export function formatRuntime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? `${h}h ${m}m` : `${m}m`;
}

export function formatViewers(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K` : String(n);
}
