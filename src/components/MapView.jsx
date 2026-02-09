import { useEffect, useRef, useCallback } from "react";
import { MapContainer, TileLayer, CircleMarker, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "../styles/leaflet-overrides.css";
import { STOPS } from "../data/stops.js";
import { C } from "../utils/constants.js";
import RouteOverlay from "./RouteOverlay.jsx";

// Manhattan center and bounds
const MANHATTAN_CENTER = [40.7589, -73.9851];
const DEFAULT_ZOOM = 13;

// ─── Locate control ──────────────────────────────────────────────
function LocateControl({ onLocate, locating }) {
  const map = useMap();

  useEffect(() => {
    const control = L.control({ position: "topright" });
    control.onAdd = () => {
      const btn = L.DomUtil.create("button", "locate-btn");
      btn.innerHTML = locating ? "..." : "&#9678;";
      btn.title = "Find my location";
      btn.onclick = (e) => {
        e.stopPropagation();
        onLocate();
      };
      L.DomEvent.disableClickPropagation(btn);
      return btn;
    };
    control.addTo(map);
    return () => control.remove();
  }, [map, onLocate, locating]);

  return null;
}

// ─── Fly to user location when it updates ────────────────────────
function FlyToLocation({ location }) {
  const map = useMap();
  const hasFlown = useRef(false);

  useEffect(() => {
    if (location && !hasFlown.current) {
      map.flyTo([location.lat, location.lng], 15, { duration: 1 });
      hasFlown.current = true;
    }
  }, [location, map]);

  return null;
}

// ─── User location marker ────────────────────────────────────────
function UserMarker({ location }) {
  const map = useMap();
  const markerRef = useRef(null);

  useEffect(() => {
    if (!location) return;

    if (markerRef.current) {
      markerRef.current.setLatLng([location.lat, location.lng]);
      return;
    }

    const icon = L.divIcon({
      className: "user-location-pulse",
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });

    markerRef.current = L.marker([location.lat, location.lng], { icon, interactive: false })
      .addTo(map);

    return () => {
      if (markerRef.current) {
        map.removeLayer(markerRef.current);
        markerRef.current = null;
      }
    };
  }, [location, map]);

  return null;
}

// ─── Stop markers ────────────────────────────────────────────────
function stopColor(stop) {
  const hasSBS = stop.routes.some((r) => r.type === "SBS");
  const hasLtd = stop.routes.some((r) => r.type === "Limited");
  if (hasSBS && hasLtd) return "#9c27b0"; // purple for both
  if (hasSBS) return C.sbs;
  return C.ltd;
}

function StopMarkers({ onStopClick, selectedRoute }) {
  return STOPS.map((stop) => {
    const isOnRoute = selectedRoute
      ? stop.routes.some((r) => r.id === selectedRoute)
      : false;
    const isDimmed = selectedRoute && !isOnRoute;

    return (
      <CircleMarker
        key={stop.id}
        center={[stop.lat, stop.lng]}
        radius={isOnRoute ? 9 : isDimmed ? 5 : 7}
        pathOptions={{
          fillColor: isDimmed ? "#555" : stopColor(stop),
          color: isDimmed ? "#444" : "#ffffff",
          weight: isDimmed ? 0.5 : isOnRoute ? 2.5 : 1.5,
          fillOpacity: isDimmed ? 0.3 : isOnRoute ? 1.0 : 0.85,
        }}
        eventHandlers={{
          click: () => onStopClick(stop),
        }}
      />
    );
  });
}

// ─── Main MapView ────────────────────────────────────────────────
export default function MapView({ userLocation, locating, onLocate, onStopClick, selectedRoute }) {
  const handleStopClick = useCallback((stop) => {
    onStopClick(stop);
  }, [onStopClick]);

  return (
    <div style={{ flex: 1, width: "100%" }}>
      <MapContainer
        center={MANHATTAN_CENTER}
        zoom={DEFAULT_ZOOM}
        style={{ height: "100%", width: "100%", background: C.bg }}
        zoomControl={true}
        attributionControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <RouteOverlay selectedRoute={selectedRoute} />
        <StopMarkers onStopClick={handleStopClick} selectedRoute={selectedRoute} />
        <UserMarker location={userLocation} />
        <FlyToLocation location={userLocation} />
        <LocateControl onLocate={onLocate} locating={locating} />
      </MapContainer>
    </div>
  );
}
