import { syncChannelPlaylist } from "./iptv-utils";
const choices = [
  { id: "RedBullTV.at@SD", label: "Red Bull TV", language: "English", country: "Austria" },
  { id: "RedBullTV.at@EUMENA", label: "Red Bull TV", language: "English", country: "Austria" },
  { id: "FUELTV.pt@EMEA", label: "FUEL TV", language: "English", country: "Portugal" },
  { id: "WorldofFreesports.de@SD", label: "World of Freesports", language: "English", country: "Germany" },
  { id: "beINSPORTSXTRA.us@SD", label: "beIN SPORTS XTRA", language: "English", country: "United States" },
  { id: "CBSSportsGolazoNetwork.us@SD", label: "CBS Sports Golazo", language: "English", country: "United States" },
  { id: "FIFAPlus.uk@UnitedStates", label: "FIFA+", language: "English", country: "United States" },
  { id: "FIFAPlusWomen.uk@English", label: "FIFA+ Women", language: "English", country: "United Kingdom" },
  { id: "CricketGold.au@SD", label: "Cricket Gold", language: "English", country: "Australia" },
  { id: "FuboSportsNetwork.us@SD", label: "Fubo Sports Network", language: "English", country: "United States" },
  { id: "FloRacing.us@HD", label: "FloRacing", language: "English", country: "United States" },
  { id: "ACCDigitalNetwork.us@SD", label: "ACC Digital Network", language: "English", country: "United States" },
  { id: "Strongman.us@UK", label: "Strongman", language: "English", country: "United Kingdom" },
  { id: "Africa24Sport.fr@SD", label: "Africa 24 Sport", language: "French", country: "France" },
];
syncChannelPlaylist("sports", choices).catch((error) => {
  console.error(error instanceof Error ? error.message : "Sports stream sync failed");
  process.exitCode = 1;
});
