import { useRef, useEffect, useCallback } from "react";
import { C } from "../utils/constants.js";
import { haversine, formatDist, walkMin } from "../utils/geo.js";

export default function BottomSheet({ stop, userLocation, onClose }) {
  const sheetRef = useRef(null);
  const dragRef = useRef({ startY: 0, startHeight: 0, dragging: false });

  // Close on Escape
  useEffect(() => {
    if (!stop) return;
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [stop, onClose]);

  const onTouchStart = useCallback((e) => {
    const touch = e.touches[0];
    dragRef.current = {
      startY: touch.clientY,
      startHeight: sheetRef.current?.offsetHeight || 0,
      dragging: true,
    };
  }, []);

  const onTouchMove = useCallback((e) => {
    if (!dragRef.current.dragging || !sheetRef.current) return;
    const dy = e.touches[0].clientY - dragRef.current.startY;
    if (dy > 0) {
      sheetRef.current.style.transform = `translateY(${dy}px)`;
    }
  }, []);

  const onTouchEnd = useCallback((e) => {
    if (!dragRef.current.dragging || !sheetRef.current) return;
    const dy = e.changedTouches[0].clientY - dragRef.current.startY;
    dragRef.current.dragging = false;
    if (dy > 80) {
      onClose();
    }
    sheetRef.current.style.transform = "";
  }, [onClose]);

  if (!stop) return null;

  const dist = userLocation
    ? haversine(userLocation.lat, userLocation.lng, stop.lat, stop.lng)
    : null;

  const sbsRoutes = stop.routes.filter((r) => r.type === "SBS");
  const ltdRoutes = stop.routes.filter((r) => r.type === "Limited");

  // Generate MTA schedule URL slug
  const scheduleSlug = (routeId) => {
    return routeId.toLowerCase().replace("-sbs", "-sbs").replace("-ltd", "").replace("-", "");
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
          zIndex: 999, transition: "opacity 0.2s",
        }}
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{
          position: "fixed", bottom: 0, left: 0, right: 0,
          maxWidth: 480, margin: "0 auto",
          background: C.surface,
          borderTopLeftRadius: 16, borderTopRightRadius: 16,
          zIndex: 1000,
          boxShadow: "0 -4px 24px rgba(0,0,0,0.4)",
          transition: "transform 0.2s ease-out",
          maxHeight: "60vh",
          overflowY: "auto",
        }}
      >
        {/* Drag handle */}
        <div style={{ padding: "10px 0 6px", display: "flex", justifyContent: "center" }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: C.border }} />
        </div>

        <div style={{ padding: "0 16px 20px" }}>
          {/* Stop name */}
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 2 }}>{stop.street}</div>
          <div style={{ fontSize: 13, color: C.dim, marginBottom: 12 }}>{stop.location}</div>

          {/* Distance */}
          {dist != null && (
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "6px 12px", background: C.card, borderRadius: 8,
              fontSize: 13, marginBottom: 12,
            }}>
              <span style={{ fontWeight: 700, color: dist < 0.12 ? C.ok : dist < 0.25 ? C.accent : C.text }}>
                {formatDist(dist)}
              </span>
              <span style={{ color: C.dim }}>~{walkMin(dist)} min walk</span>
            </div>
          )}

          {/* Routes */}
          {sbsRoutes.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 11, color: C.dim, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
                SBS Routes
              </div>
              {sbsRoutes.map((r) => (
                <a
                  key={r.id}
                  href={`https://www.mta.info/schedules/bus/${scheduleSlug(r.id)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "8px 10px", background: C.sbsBg,
                    border: `1px solid ${C.sbs}33`, borderRadius: 8,
                    marginBottom: 4, textDecoration: "none", color: C.text,
                  }}
                >
                  <span style={{
                    padding: "2px 8px", borderRadius: 4, background: C.sbs,
                    color: "#fff", fontSize: 11, fontWeight: 800,
                  }}>{r.name}</span>
                  <span style={{ fontSize: 12, color: C.dim, flex: 1 }}>Schedule</span>
                  <span style={{ fontSize: 12, color: C.dim }}>&#8599;</span>
                </a>
              ))}
            </div>
          )}

          {ltdRoutes.length > 0 && (
            <div>
              <div style={{ fontSize: 11, color: C.dim, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
                Limited Routes
              </div>
              {ltdRoutes.map((r) => (
                <a
                  key={r.id}
                  href={`https://www.mta.info/schedules/bus/${scheduleSlug(r.id)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "8px 10px", background: C.ltdBg,
                    border: `1px solid ${C.ltd}33`, borderRadius: 8,
                    marginBottom: 4, textDecoration: "none", color: C.text,
                  }}
                >
                  <span style={{
                    padding: "2px 8px", borderRadius: 4, background: C.ltd,
                    color: "#fff", fontSize: 11, fontWeight: 800,
                  }}>{r.name}</span>
                  <span style={{ fontSize: 12, color: C.dim, flex: 1 }}>Schedule</span>
                  <span style={{ fontSize: 12, color: C.dim }}>&#8599;</span>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
