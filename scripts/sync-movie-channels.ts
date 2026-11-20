import { syncChannelPlaylist } from "./iptv-utils";

syncChannelPlaylist("movies", [
  { id: "MovieSphere.us@US", label: "MovieSphere", language: "English", country: "United States" },
  { id: "MovieSphere.us@UK", label: "MovieSphere", language: "English", country: "United Kingdom" },
  { id: "GravitasMovies.us@SD", label: "Gravitas Movies", language: "English", country: "United States" },
  { id: "DUST.us@SD", label: "DUST", language: "English", country: "United States" },
  { id: "ARTFLIXMovieClassics.us@SD", label: "ARTFLIX Movie Classics", language: "English", country: "United States" },
  { id: "Cinevault80s.us@SD", label: "Cinevault 80s", language: "English", country: "United States" },
  { id: "HallmarkMoviesMore.us@SD", label: "Hallmark Movies & More", language: "English", country: "United States" },
  { id: "FrightFlix.us@SD", label: "FrightFlix", language: "English", country: "United States" },
  { id: "MadeInHollywood.us@SD", label: "Made In Hollywood", language: "English", country: "United States" },
  { id: "MaverickBlackCinema.us@SD", label: "Maverick Black Cinema", language: "English", country: "United States" },
]).catch((error) => { console.error(error instanceof Error ? error.message : "Movie channel sync failed"); process.exitCode = 1; });
