import { useMemo } from "react";
import { Polyline } from "react-leaflet";
import { getRoutePolylines, getRouteById } from "../utils/routeLines.js";
import { C } from "../utils/constants.js";

export default function RouteOverlay({ selectedRoute }) {
  const lines = useMemo(
    () => (selectedRoute ? getRoutePolylines(selectedRoute) : []),
    [selectedRoute]
  );
  const route = useMemo(
    () => (selectedRoute ? getRouteById(selectedRoute) : null),
    [selectedRoute]
  );

  if (!selectedRoute || !route) return null;

  const color = route.type === "SBS" ? C.sbs : C.ltd;
  const dashArray = route.type === "Limited" ? "8, 6" : undefined;

  return lines.map((line, i) => (
    <Polyline
      key={`${selectedRoute}-${i}`}
      positions={line.positions}
      pathOptions={{
        color,
        weight: 4,
        opacity: 0.8,
        dashArray,
        lineCap: "round",
        lineJoin: "round",
      }}
    />
  ));
}
