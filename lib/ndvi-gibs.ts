// Server side of the NASA GIBS vegetation reading: tiles are downloaded and decoded with pngjs.
import { ndviFromGibs } from "./ndvi-core";
import { getPng } from "./smap-server";

export const ndviGibs = (lat: number, lon: number, budgetMs = 25_000) => ndviFromGibs(lat, lon, getPng, budgetMs);
