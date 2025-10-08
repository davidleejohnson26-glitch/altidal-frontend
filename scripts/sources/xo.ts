// scripts/sources/xo.ts
import axios from "axios";
import crypto from "crypto";

export type ScrapedLeg = {
  id: string; operator: string;
  fromIata?: string; toIata?: string;
  departureUtc?: string; arrivalUtc?: string | null;
  aircraft?: string | null; price?: number | null;
  url: string; sourceMeta?: any;
};

const XO_BASE = "https://flyxo.com";
const DEALS_API = "https://api.flyxo.com/getDealsList";
const FLIGHT_DEALS_URL = `${XO_BASE}/flight-deals/`;

// Public airports dataset (Algolia sample includes city + iata_code + coords)
const AIRPORTS_JSON =
  process.env.XO_AIRPORTS_JSON_URL ||
  "https://raw.githubusercontent.com/algolia/datasets/master/airports/airports.json";

const sha10 = (s: string) => crypto.createHash("sha1").update(s).digest("hex").slice(0, 10);
const toMidnightUTC = (d: string | Date | undefined) => {
  if (!d) return undefined;
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return undefined;
  return new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate())).toISOString();
};

const IATA = /^[A-Z]{3}$/;
const isIata = (x?: string) => !!x && IATA.test(x);

// ---------- helpers: robust IATA extraction ----------

function iatasFromRouteLikeString(s: string): { from?: string; to?: string } | null {
  const m = s.match(/\(([A-Z]{3})\)\s*(?:→|-|to)\s*\(([A-Z]{3})\)/);
  if (m && isIata(m[1]) && isIata(m[2])) return { from: m[1], to: m[2] };
  const all = Array.from(s.matchAll(/\(([A-Z]{3})\)/g)).map(x => x[1]);
  if (all.length >= 2 && isIata(all[0]) && isIata(all[1])) return { from: all[0], to: all[1] };
  return null;
}

function iatasFromNextJsonDeep(data: any): { from?: string; to?: string } {
  const stack = [data];
  const pick = (o: any, keys: string[]) => {
    for (const k of keys) {
      const v = o?.[k];
      if (typeof v === "string" && isIata(v.toUpperCase())) return v.toUpperCase();
      if (v && typeof v === "object") {
        const cand = v?.airportCode ?? v?.code ?? v?.iata ?? v?.iataCode ??
                     v?.airport?.code ?? v?.airport?.iataCode;
        if (typeof cand === "string" && isIata(cand.toUpperCase())) return cand.toUpperCase();
      }
    }
    return undefined;
  };

  while (stack.length) {
    const cur = stack.pop();
    if (!cur) continue;

    if (typeof cur === "object") {
      const from = pick(cur, ["origin", "from", "originAirport", "originAirportCode", "fromIata", "departureAirportCode"]);
      const to   = pick(cur, ["destination", "to", "destinationAirport", "destinationAirportCode", "toIata", "arrivalAirportCode"]);
      if (isIata(from) && isIata(to)) return { from, to };
      for (const k of Object.keys(cur)) stack.push((cur as any)[k]);
      continue;
    }

    if (typeof cur === "string") {
      const maybe = iatasFromRouteLikeString(cur.toUpperCase());
      if (maybe?.from && maybe?.to) return maybe;
      continue;
    }

    if (Array.isArray(cur)) {
      for (const v of cur) stack.push(v);
    }
  }
  return {};
}

async function getBuildId(): Promise<string> {
  const { data: html } = await axios.get(FLIGHT_DEALS_URL, {
    headers: {
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36",
      "accept-language": "en-US,en;q=0.9",
    },
    timeout: 20000,
  });
  const m = html.match(/"buildId":"([^"]+)"/);
  if (!m) throw new Error("XO: buildId not found");
  return m[1];
}

async function fetchDealIatas(buildId: string, id: string): Promise<{ from?: string; to?: string; source: string }> {
  const headers = { "user-agent": "Mozilla/5.0", "accept": "application/json" };
  const nextUrls = [
    `${XO_BASE}/_next/data/${buildId}/en-US/deals/${id}.json`,
    `${XO_BASE}/_next/data/${buildId}/deals/${id}.json`,
  ];
  for (const u of nextUrls) {
    try {
      const { data } = await axios.get(u, { headers, timeout: 20000 });
      const got = iatasFromNextJsonDeep(data);
      if (got.from && got.to) return { ...got, source: "next-json" };
    } catch { /* continue */ }
  }
  try {
    const html = await axios.get(`${XO_BASE}/deals/${id}`, {
      headers: { "user-agent": "Mozilla/5.0" },
      timeout: 20000
    }).then(r => r.data as string);
    const got = iatasFromRouteLikeString(html.toUpperCase());
    if (got?.from && got?.to) return { ...got, source: "html" };
  } catch { /* ignore */ }
  return { source: "none" } as any;
}

// ---------- city → IATA fallback (uses public dataset) ----------

type Airport = {
  name?: string;
  city?: string;
  country?: string;
  iata_code?: string;
  _geoloc?: { lat: number; lng: number };
};

let AIRPORTS_CACHE: Airport[] | null = null;

function norm(s?: string) {
  return (s || "").toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g, "").trim();
}

// Bizjet-preferred overrides by metro/label
const BIZJET_OVERRIDES: Record<string, string> = {
  // US
  "new york": "TEB", "nyc": "TEB", "teterboro": "TEB", "white plains": "HPN", "westchester": "HPN",
  "miami": "OPF", "opa locka": "OPF", "fort lauderdale": "FXE", "west palm": "PBI",
  "los angeles": "VNY", "van nuys": "VNY", "burbank": "BUR",
  "san francisco": "SJC", "san jose": "SJC", "oakland": "OAK",
  "chicago": "MDW",
  "dallas": "DAL", "love field": "DAL", "houston": "HOU",
  "denver": "APA",
  "boston": "BED",
  "las vegas": "LAS", "scottsdale": "SDL", "phoenix": "SDL",
  "seattle": "BFI",
  "washington": "IAD", "dc": "IAD",
  "atlanta": "PDK", "dekalb": "PDK",
  "austin": "AUS",
  // Europe / ME
  "london": "LTN", "farnborough": "FAB",
  "paris": "LBG",
  "geneva": "GVA",
  "zurich": "ZRH",
  "dubai": "DWC",
};

function bestIataForCity(city: string, countryHint?: string): string | undefined {
  const key = norm(city);
  if (BIZJET_OVERRIDES[key]) return BIZJET_OVERRIDES[key];

  if (!AIRPORTS_CACHE) return undefined;
  const nc = key;
  const nh = norm(countryHint);

  // exact city name match first
  let candidates = AIRPORTS_CACHE.filter(a => {
    const cityMatch = norm(a.city) === nc;
    const countryOk = nh ? norm(a.country) === nh : true;
    return cityMatch && isIata(a.iata_code);
  });

  // if none, allow airport name contains city
  if (!candidates.length) {
    candidates = AIRPORTS_CACHE.filter(a => isIata(a.iata_code) && norm(a.name).includes(nc));
  }

  if (!candidates.length) return undefined;

  // prefer typical bizjet relievers, then non-International, then lexical
  const relieverBoost = (name?: string) =>
    /van nuys|teterboro|opa.?locka|white plains|westchester|scottsdale|burbank|mdw|dal|pdk|bfi|fab|lbg/i.test(name || "") ? 2 :
    /international/i.test(name || "") ? 0 : 1;

  candidates.sort((a, b) => {
    const sa = relieverBoost(a.name);
    const sb = relieverBoost(b.name);
    if (sa !== sb) return sb - sa;
    return a.iata_code!.localeCompare(b.iata_code!);
  });

  return candidates[0].iata_code!;
}

async function ensureAirportsLoaded() {
  if (AIRPORTS_CACHE) return;
  const { data } = await axios.get(AIRPORTS_JSON, {
    headers: { "user-agent": "Mozilla/5.0", "accept": "application/json" },
    timeout: 30000,
  });
  AIRPORTS_CACHE = Array.isArray(data) ? data as Airport[] : [];
}

// ---------- distance sanity ----------

type LatLng = { lat: number; lng: number };
const R_NM = 3440.065; // nautical miles
const toRad = (x: number) => (x * Math.PI) / 180;
function haversineNm(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R_NM * Math.asin(Math.min(1, Math.sqrt(h)));
}
function coordsForIata(iata: string): LatLng | undefined {
  const ap = AIRPORTS_CACHE?.find(a => a.iata_code === iata && a._geoloc);
  return ap ? { lat: ap._geoloc!.lat, lng: ap._geoloc!.lng } : undefined;
}

// ---------------- MAIN ----------------

export async function scrapeXO(): Promise<ScrapedLeg[]> {
  // 1) Pull list of deals
  const { data: json } = await axios.get(DEALS_API, {
    headers: {
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36",
      "accept": "application/json,text/*;q=0.2,*/*;q=0.1",
    },
    timeout: 20000,
  });

  const deals: any[] = Array.isArray(json?.deals) ? json.deals : [];
  if (!deals.length) return [];

  // 2) Build id for Next data (for enrichment attempt)
  let buildId = "";
  try { buildId = await getBuildId(); } catch { /* continue without it */ }

  // 3) Load airports dataset for city→IATA fallback
  await ensureAirportsLoaded();

  // 4) Enrich with IATAs (limited concurrency)
  const limit = Math.max(1, Number(process.env.XO_ENRICH_CONCURRENCY ?? 8));
  const debug = process.env.DEBUG_XO === "1";
  const queue = deals.slice();
  const results: ScrapedLeg[] = [];

  async function worker() {
    while (queue.length) {
      const d = queue.shift()!;
      const id = String(d.id ?? d.dealId ?? "");
      const url = `${XO_BASE}/deals/${id}`;
      const depart = toMidnightUTC(d.date || d.departureDate);
      const price =
        typeof d.price === "number" ? Math.round(d.price) :
        (typeof d.price?.amount === "number" ? Math.round(d.price.amount) : null);

      let fromIata: string | undefined;
      let toIata: string | undefined;
      let source = "none";

      // (a) Try Next/HTML structured enrichment
      if (buildId) {
        const info = await fetchDealIatas(buildId, id);
        source = info.source || "none";
        fromIata = isIata(info.from) ? info.from : undefined;
        toIata   = isIata(info.to)   ? info.to   : undefined;
      }

      // (b) If still missing, map city → IATA (bizjet-aware)
      if (!fromIata || !toIata) {
        const cityFrom = typeof d.from === "string" ? d.from : undefined;
        const cityTo   = typeof d.to === "string" ? d.to   : undefined;
        if (cityFrom) fromIata = fromIata || bestIataForCity(cityFrom, d.fromCountry || d.countryFrom);
        if (cityTo)   toIata   = toIata   || bestIataForCity(cityTo,   d.toCountry   || d.countryTo);
        if (!source || source === "none") source = "city-map";
      }

      // Only emit if we have both codes
      if (!fromIata || !toIata) continue;
      if (fromIata === toIata) continue; // drop self routes

      // Distance sanity (requires geoloc in dataset)
      const A = coordsForIata(fromIata);
      const B = coordsForIata(toIata);
      if (!A || !B) continue;
      const distNm = haversineNm(A, B);
      if (distNm < 60 || distNm > 7000) continue; // filter obvious junk

      if (debug && results.length < 20) {
        console.log(`[xo:enrich] id=${id} src=${source} ${fromIata}->${toIata} dist=${Math.round(distNm)}nm cityFrom=${d.from} cityTo=${d.to}`);
      }

      results.push({
        id: id ? `xo:${id}:${depart ?? "na"}` : `xo:${sha10([d.from, d.to, depart, price].join("|"))}`,
        operator: "xo",
        fromIata,
        toIata,
        departureUtc: depart,
        arrivalUtc: null,
        aircraft: null,
        price,
        url,
        sourceMeta: {
          currency: d.currency ?? "USD",
          api: DEALS_API,
          enriched: true,
          enrichSource: source,
          fromCity: d.from ?? null,
          toCity: d.to ?? null,
          distNm,
        },
      });
    }
  }

  await Promise.all(Array.from({ length: limit }, worker));

  // 5) De-dupe and return
  const map = new Map<string, ScrapedLeg>();
  for (const l of results) map.set(l.id, l);
  return Array.from(map.values());
}