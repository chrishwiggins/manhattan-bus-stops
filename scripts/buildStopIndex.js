/**
 * Build a stop-centric index from route-centric ROUTES data.
 *
 * Deduplication uses semantic keys (avenue + cross street + normalized direction)
 * rather than pure lat/lng proximity. Manhattan's grid means two stops at
 * the same cross street but on different avenues (1st vs 2nd) are physically
 * separate stops ~300ft apart, while the same intersection served by multiple
 * routes is one stop.
 *
 * Usage: node scripts/buildStopIndex.js
 */

import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROUTES_PATH = join(__dirname, "../src/data/routes.js");
const OUTPUT_PATH = join(__dirname, "../src/data/stops.js");

// Parse routes.js by extracting the array literal
const routesSrc = readFileSync(ROUTES_PATH, "utf-8");
const ROUTES = eval(
  routesSrc.replace("export const ROUTES =", "const _R_ =") + "; _R_"
);

// ─── Haversine (miles) ────────────────────────────────────────────
function haversine(lat1, lng1, lat2, lng2) {
  const R = 3958.8;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Direction parsing ────────────────────────────────────────────
function parseDirection(directionName) {
  const lower = directionName.toLowerCase();
  if (lower.includes("northbound")) return "north";
  if (lower.includes("southbound")) return "south";
  if (lower.includes("eastbound")) return "east";
  if (lower.includes("westbound")) return "west";
  // Manhattan-specific labels
  if (lower.includes("toward") && lower.includes("harlem")) return "north";
  if (lower.includes("toward") && lower.includes("south ferry")) return "south";
  if (lower.includes("toward") && lower.includes("fdr")) return "east";
  if (lower.includes("toward") && lower.includes("east end")) return "east";
  if (lower.includes("toward") && lower.includes("york")) return "east";
  if (lower.includes("toward") && lower.includes("ave c")) return "east";
  if (lower.includes("toward") && lower.includes("waterside")) return "east";
  if (lower.includes("toward") && lower.includes("delancey")) return "east";
  if (lower.includes("toward") && lower.includes("chelsea")) return "west";
  if (lower.includes("toward") && lower.includes("javits")) return "west";
  if (lower.includes("toward") && lower.includes("riverside")) return "west";
  if (lower.includes("toward") && lower.includes("west end")) return "west";
  if (lower.includes("toward") && lower.includes("abingdon")) return "west";
  if (lower.includes("toward") && lower.includes("port authority")) return "west";
  if (lower.includes("toward") && lower.includes("cabrini")) return "north";
  if (lower.includes("toward") && lower.includes("e 67")) return "south";
  if (lower.includes("manhattan stops")) return lower.includes("east") ? "east" : "west";
  // AM/PM rush patterns
  if (lower.includes("5th ave") && lower.includes("am")) return "south";
  if (lower.includes("madison") && lower.includes("pm")) return "north";
  if (lower.includes("6th ave")) return "south";
  if (lower.includes("3rd ave")) return "south";
  if (lower.includes("lexington") || lower.includes("lex")) return "north";
  return directionName;
}

// ─── Location parsing ─────────────────────────────────────────────
// Extracts both parts from a location string for keying.
// Returns { part1, part2 } where the order is canonical (sorted).
function parseLocationParts(location) {
  const clean = location.replace(/\s*\([^)]*\)/g, "").trim();

  // "X at Y" -> two parts
  const atParts = clean.split(/\s+at\s+/i);
  if (atParts.length === 2) {
    return { part1: atParts[0].trim(), part2: atParts[1].trim() };
  }

  // "X betw Y & Z" -> use X and "betw Y & Z"
  const betwMatch = clean.match(/^(.+?)\s+(betw\s+.+)$/i);
  if (betwMatch) {
    return { part1: betwMatch[1].trim(), part2: betwMatch[2].trim() };
  }

  // Single location (terminal, loop, etc.)
  return { part1: clean, part2: "" };
}

// ─── Normalize for keying ─────────────────────────────────────────
function normalize(s) {
  return s
    .toLowerCase()
    .replace(/\s*\([^)]*\)/g, "")     // strip parentheticals
    .replace(/[\/\-]/g, " ")           // normalize separators
    .replace(/\s+/g, " ")             // collapse whitespace
    .replace(/\bst\b\.?/g, "st")
    .replace(/\bave\b\.?/g, "ave")
    .replace(/\bblvd\b\.?/g, "blvd")
    .trim();
}

// ─── Crosstown route check ────────────────────────────────────────
const CROSSTOWN_IDS = new Set([
  "M14A-SBS", "M14D-SBS", "M23-SBS", "M34-SBS", "M34A-SBS",
  "M60-SBS", "M79-SBS", "M86-SBS",
]);

// ─── Build stop key ──────────────────────────────────────────────
function createStopKey(rawStop) {
  const { part1, part2 } = parseLocationParts(rawStop.location);
  // Sort both parts to create a canonical key regardless of "X at Y" vs "Y at X"
  const parts = [normalize(part1), normalize(part2)].filter(Boolean).sort();
  const locationKey = parts.join("::");

  // For crosstown routes, merge EB/WB at the same intersection.
  // A rider stands at the same corner regardless of which direction the bus goes.
  if (CROSSTOWN_IDS.has(rawStop.routeId)) {
    return `${locationKey}::crosstown`;
  }

  return `${locationKey}::${rawStop.direction}`;
}

// ─── Main pipeline ───────────────────────────────────────────────
function buildStopIndex(routes) {
  // Step 1: Extract all raw stops
  const rawStops = [];
  for (const route of routes) {
    for (const [directionName, stops] of Object.entries(route.directions)) {
      const direction = parseDirection(directionName);
      for (const stop of stops) {
        rawStops.push({
          lat: stop.lat,
          lng: stop.lng,
          street: stop.street,
          location: stop.location,
          routeId: route.id,
          routeName: route.name,
          routeType: route.type,
          direction,
          directionName,
        });
      }
    }
  }
  console.log(`Extracted ${rawStops.length} raw stop entries from ${routes.length} routes`);

  // Step 2: Cluster by semantic key
  const clusters = new Map();
  for (const raw of rawStops) {
    const key = createStopKey(raw);
    if (!clusters.has(key)) clusters.set(key, []);
    clusters.get(key).push(raw);
  }
  console.log(`Clustered into ${clusters.size} unique keys`);

  // Step 3: Merge clusters into stop records
  const stops = [];
  let id = 1;
  const warnings = [];

  for (const [key, members] of clusters.entries()) {
    // Centroid
    const avgLat = members.reduce((s, m) => s + m.lat, 0) / members.length;
    const avgLng = members.reduce((s, m) => s + m.lng, 0) / members.length;

    // Use the most descriptive street name and location
    const street = mostCommon(members.map((m) => m.street));
    const location = mostCommon(members.map((m) => m.location));

    // Deduplicate routes by route ID.
    // At a crosstown-merged stop, the same route appears for EB and WB - keep only one.
    const routeSet = new Set();
    const routes = [];
    for (const m of members) {
      if (!routeSet.has(m.routeId)) {
        routeSet.add(m.routeId);
        routes.push({
          id: m.routeId,
          name: m.routeName,
          type: m.routeType,
        });
      }
    }

    // Validate cluster span
    if (members.length > 1) {
      let maxDist = 0;
      for (let i = 0; i < members.length; i++) {
        for (let j = i + 1; j < members.length; j++) {
          const d = haversine(members[i].lat, members[i].lng, members[j].lat, members[j].lng);
          maxDist = Math.max(maxDist, d);
        }
      }
      const maxFt = Math.round(maxDist * 5280);
      if (maxFt > 400) {
        warnings.push(`WARNING: Stop "${street}" (${key}) spans ${maxFt} ft across ${members.length} entries`);
      }
    }

    stops.push({
      id: `stop_${String(id).padStart(3, "0")}`,
      lat: Math.round(avgLat * 10000) / 10000,
      lng: Math.round(avgLng * 10000) / 10000,
      street,
      location,
      routes,
    });
    id++;
  }

  // Step 4: Spatial merge pass
  // Merge stops within 200ft of each other. This catches NB/SB duplicates
  // on two-way roads (Riverside Dr, Broadway, Amsterdam Ave, etc.) where
  // the semantic key splits by direction but the physical stop is the same.
  const merged = spatialMerge(stops);

  // Sort by latitude (south to north) for predictable ordering
  merged.sort((a, b) => a.lat - b.lat);
  // Re-assign IDs after sorting
  merged.forEach((s, i) => { s.id = `stop_${String(i + 1).padStart(3, "0")}`; });

  return { stops: merged, warnings };
}

function spatialMerge(stops) {
  const MERGE_THRESHOLD = 0.038; // ~200 ft in miles
  const used = new Set();
  const result = [];

  for (let i = 0; i < stops.length; i++) {
    if (used.has(i)) continue;

    const group = [stops[i]];
    for (let j = i + 1; j < stops.length; j++) {
      if (used.has(j)) continue;
      const d = haversine(stops[i].lat, stops[i].lng, stops[j].lat, stops[j].lng);
      if (d < MERGE_THRESHOLD) {
        group.push(stops[j]);
        used.add(j);
      }
    }

    if (group.length === 1) {
      result.push(stops[i]);
      continue;
    }

    // Merge the group: combine routes, average coordinates
    const avgLat = group.reduce((s, g) => s + g.lat, 0) / group.length;
    const avgLng = group.reduce((s, g) => s + g.lng, 0) / group.length;

    const routeSet = new Set();
    const routes = [];
    for (const g of group) {
      for (const r of g.routes) {
        if (!routeSet.has(r.id)) {
          routeSet.add(r.id);
          routes.push(r);
        }
      }
    }

    // Use the entry with the most routes as the "primary" for naming
    const primary = group.sort((a, b) => b.routes.length - a.routes.length)[0];
    result.push({
      id: primary.id,
      lat: Math.round(avgLat * 10000) / 10000,
      lng: Math.round(avgLng * 10000) / 10000,
      street: primary.street,
      location: primary.location,
      routes,
    });
  }

  return result;
}

function mostCommon(arr) {
  const counts = {};
  for (const v of arr) counts[v] = (counts[v] || 0) + 1;
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

// ─── Run ─────────────────────────────────────────────────────────
const { stops, warnings } = buildStopIndex(ROUTES);

warnings.forEach((w) => console.warn(w));

// Stats
const multiRouteStops = stops.filter((s) => s.routes.length > 1);
console.log(`\nGenerated ${stops.length} unique stops`);
console.log(`  ${multiRouteStops.length} stops served by multiple routes`);
console.log(`  Most routes at one stop: ${Math.max(...stops.map((s) => s.routes.length))}`);

// Spot checks
const spot34_5th = stops.find((s) => s.street.includes("34th") && s.location.toLowerCase().includes("5th"));
if (spot34_5th) console.log(`  34th & 5th Ave: ${spot34_5th.routes.length} routes (${spot34_5th.routes.map((r) => r.name).join(", ")})`);

const spot86_lex = stops.find((s) => s.street.includes("86th") && s.location.toLowerCase().includes("lex"));
if (spot86_lex) console.log(`  86th & Lex: ${spot86_lex.routes.length} routes (${spot86_lex.routes.map((r) => r.name).join(", ")})`);

// Write output
const output = `// AUTO-GENERATED by scripts/buildStopIndex.js - do not edit manually
// ${stops.length} unique stops from ${ROUTES.length} routes
// Run: node scripts/buildStopIndex.js

export const STOPS = ${JSON.stringify(stops, null, 2)};
`;

writeFileSync(OUTPUT_PATH, output);
console.log(`\nWrote ${OUTPUT_PATH}`);
