import { useState, useCallback } from "react";
import { C } from "./utils/constants.js";
import { getRouteById } from "./utils/routeLines.js";
import MapView from "./components/MapView.jsx";
import BottomSheet from "./components/BottomSheet.jsx";
import ListView from "./components/ListView.jsx";

export default function App() {
  const [viewMode, setViewMode] = useState("map");
  const [selectedStop, setSelectedStop] = useState(null);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [locating, setLocating] = useState(false);

  const selectedRouteObj = selectedRoute ? getRouteById(selectedRoute) : null;

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setUserLocation({ lat: p.coords.latitude, lng: p.coords.longitude });
        setLocating(false);
      },
      () => { setLocating(false); },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }, []);

  const handleLocationUpdate = useCallback((loc) => {
    setUserLocation(loc);
  }, []);

  return (
    <div style={{
      height: "100vh",
      display: "flex",
      flexDirection: "column",
      background: C.bg,
      color: C.text,
      fontFamily: "'SF Pro Display',-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif",
      WebkitFontSmoothing: "antialiased",
    }}>
      {/* Header */}
      <div style={{
        background: C.surface,
        padding: "12px 16px 8px",
        position: viewMode === "list" ? "sticky" : "relative",
        top: 0,
        zIndex: 100,
        borderBottom: `1px solid ${C.border}`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, maxWidth: 480, margin: "0 auto 6px" }}>
          <div style={{
            width: 30, height: 30, borderRadius: 6,
            background: `linear-gradient(135deg,${C.accent},${C.sbs})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 15, fontWeight: 900, color: "#fff", flexShrink: 0,
          }}>M</div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: -0.3 }}>Manhattan Limited Stops</div>
            <div style={{ fontSize: 9, color: C.dim, letterSpacing: 0.4, textTransform: "uppercase" }}>SBS & Limited Bus Stop Finder</div>
          </div>
        </div>

        {/* Mode tabs */}
        <div style={{ display: "flex", gap: 4, maxWidth: 480, margin: "0 auto" }}>
          {[
            { id: "map", l: "Map" },
            { id: "list", l: "List" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setViewMode(t.id)}
              style={{
                flex: 1, padding: "7px 0", border: "none", borderRadius: 8,
                background: viewMode === t.id ? C.accent : C.card,
                color: viewMode === t.id ? C.bg : C.dim,
                fontWeight: viewMode === t.id ? 700 : 500,
                fontSize: 13, cursor: "pointer",
              }}
            >{t.l}</button>
          ))}
        </div>
      </div>

      {/* Route banner */}
      {selectedRouteObj && viewMode === "map" && (
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "6px 16px",
          background: selectedRouteObj.type === "SBS" ? C.sbsBg : C.ltdBg,
          borderBottom: `1px solid ${(selectedRouteObj.type === "SBS" ? C.sbs : C.ltd)}44`,
        }}>
          <span style={{
            padding: "2px 8px", borderRadius: 4,
            background: selectedRouteObj.type === "SBS" ? C.sbs : C.ltd,
            color: "#fff", fontSize: 11, fontWeight: 800,
          }}>{selectedRouteObj.name}</span>
          <span style={{ flex: 1, fontSize: 12, color: C.dim }}>{selectedRouteObj.corridor}</span>
          <button
            onClick={() => setSelectedRoute(null)}
            style={{
              background: "none", border: "none", color: C.dim,
              fontSize: 18, cursor: "pointer", padding: "0 4px",
              fontFamily: "inherit", lineHeight: 1,
            }}
          >&#x2715;</button>
        </div>
      )}

      {/* Map Mode */}
      {viewMode === "map" && (
        <>
          <MapView
            userLocation={userLocation}
            locating={locating}
            onLocate={requestLocation}
            onStopClick={setSelectedStop}
            selectedRoute={selectedRoute}
          />
          <BottomSheet
            stop={selectedStop}
            userLocation={userLocation}
            onClose={() => setSelectedStop(null)}
            selectedRoute={selectedRoute}
            onRouteSelect={setSelectedRoute}
          />
        </>
      )}

      {/* List Mode */}
      {viewMode === "list" && (
        <div style={{ flex: 1, overflowY: "auto" }}>
          <div style={{ maxWidth: 480, margin: "0 auto", paddingBottom: 80 }}>
            <ListView userLocation={userLocation} onLocationUpdate={handleLocationUpdate} />
          </div>
        </div>
      )}
    </div>
  );
}
