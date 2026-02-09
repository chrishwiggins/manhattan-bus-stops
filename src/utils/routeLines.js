import { ROUTES } from "../data/routes.js";

/**
 * Get polyline coordinate arrays for a route (both directions).
 * Returns [{ directionName, positions: [[lat, lng], ...] }]
 */
export function getRoutePolylines(routeId) {
  const route = ROUTES.find((r) => r.id === routeId);
  if (!route) return [];
  return Object.entries(route.directions).map(([directionName, stops]) => ({
    directionName,
    positions: stops.map((s) => [s.lat, s.lng]),
  }));
}

/**
 * Look up a route object by ID.
 */
export function getRouteById(routeId) {
  return ROUTES.find((r) => r.id === routeId) || null;
}
