import { useState, useEffect, useMemo, useCallback } from "react";
import { ROUTES } from "../data/routes.js";
import { haversine, formatDist, walkMin } from "../utils/geo.js";
import { C } from "../utils/constants.js";

export default function ListView({ userLocation, onLocationUpdate }) {
  const [route, setRoute] = useState("");
  const [dir, setDir] = useState("");
  const [street, setStreet] = useState("");
  const [locating, setLocating] = useState(false);
  const [locErr, setLocErr] = useState("");
  const [tab, setTab] = useState("browse");

  const lat = userLocation?.lat ?? null;
  const lng = userLocation?.lng ?? null;

  const rObj = useMemo(() => ROUTES.find((r) => r.id === route), [route]);
  const dirs = useMemo(() => (rObj ? Object.keys(rObj.directions) : []), [rObj]);
  const stops = useMemo(() => (rObj && dir ? rObj.directions[dir] || [] : []), [rObj, dir]);
  const filtered = useMemo(() => {
    if (!street.trim()) return stops;
    const q = street.toLowerCase();
    return stops.filter((s) => s.street.toLowerCase().includes(q) || s.location.toLowerCase().includes(q));
  }, [stops, street]);

  useEffect(() => { setDir(dirs[0] || ""); setStreet(""); }, [route, dirs]);

  const getLoc = useCallback(() => {
    setLocating(true); setLocErr("");
    if (!navigator.geolocation) { setLocErr("Not supported"); setLocating(false); return; }
    navigator.geolocation.getCurrentPosition(
      (p) => {
        onLocationUpdate({ lat: p.coords.latitude, lng: p.coords.longitude });
        setLocating(false);
        setTab("nearby");
      },
      (e) => { setLocErr(e.message); setLocating(false); },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }, [onLocationUpdate]);

  const nearby = useMemo(() => {
    if (lat == null) return null;
    const all = [];
    for (const r of ROUTES)
      for (const [d, stps] of Object.entries(r.directions))
        for (const s of stps) all.push({ route: r, dir: d, stop: s, dist: haversine(lat, lng, s.lat, s.lng) });
    all.sort((a, b) => a.dist - b.dist);
    const byR = {};
    for (const x of all) if (!byR[x.route.id]) byR[x.route.id] = [];
    for (const x of all) byR[x.route.id].push(x);
    return Object.values(byR)
      .map((arr) => ({ ...arr[0], top3: arr.slice(0, 3) }))
      .filter((x) => x.dist < 0.6)
      .sort((a, b) => a.dist - b.dist);
  }, [lat, lng]);

  const Badge = ({ type }) => (
    <span style={{ padding: "2px 7px", borderRadius: 4, background: type === "SBS" ? C.sbs : C.ltd, color: "#fff", fontSize: 10, fontWeight: 800, letterSpacing: 0.5 }}>{type}</span>
  );

  const sel = {
    width: "100%", padding: "12px 36px 12px 14px", background: C.card, color: C.text,
    border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 15, fontWeight: 500, outline: "none",
    appearance: "none", WebkitAppearance: "none", boxSizing: "border-box",
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12'%3E%3Cpath d='M6 8L1 3h10z' fill='%238a92a6'/%3E%3C/svg%3E")`,
    backgroundRepeat: "no-repeat", backgroundPosition: "right 14px center",
  };

  return (
    <div>
      {/* Sub-tabs for browse/nearby within list mode */}
      <div style={{ display: "flex", gap: 4, padding: "12px 16px 0" }}>
        {[{ id: "browse", l: "Browse" }, { id: "nearby", l: "Near Me" }].map((t) => (
          <button key={t.id} onClick={() => { setTab(t.id); if (t.id === "nearby" && lat == null) getLoc(); }}
            style={{ flex: 1, padding: "8px 0", border: "none", borderRadius: 8, background: tab === t.id ? C.accent : C.card, color: tab === t.id ? C.bg : C.dim, fontWeight: tab === t.id ? 700 : 500, fontSize: 14, cursor: "pointer" }}>{t.l}</button>
        ))}
      </div>

      {/* BROWSE */}
      {tab === "browse" && (
        <div style={{ padding: "12px 16px" }}>
          <div style={{ fontSize: 11, color: C.dim, marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>Bus Line</div>
          <select value={route} onChange={(e) => setRoute(e.target.value)} style={{ ...sel, marginBottom: 10 }}>
            <option value="">-- Select a bus line --</option>
            <optgroup label="SBS (Select Bus Service)">{ROUTES.filter((r) => r.type === "SBS").map((r) => <option key={r.id} value={r.id}>{r.name} -- {r.corridor}</option>)}</optgroup>
            <optgroup label="Limited (Rush Hours)">{ROUTES.filter((r) => r.type === "Limited").map((r) => <option key={r.id} value={r.id}>{r.name} -- {r.corridor}</option>)}</optgroup>
          </select>

          {rObj && (
            <div style={{ padding: "10px 12px", background: rObj.type === "SBS" ? C.sbsBg : C.ltdBg, border: `1px solid ${(rObj.type === "SBS" ? C.sbs : C.ltd) + "33"}`, borderRadius: 10, marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}><Badge type={rObj.type} /><span style={{ fontSize: 12, color: C.dim }}>{rObj.hours}</span></div>
              <div style={{ fontSize: 13, lineHeight: 1.4 }}>{rObj.desc}</div>
            </div>
          )}

          {dirs.length > 0 && (<>
            <div style={{ fontSize: 11, color: C.dim, marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>Direction</div>
            <div style={{ display: "flex", gap: 4, marginBottom: 10, flexWrap: "wrap" }}>
              {dirs.map((d) => (
                <button key={d} onClick={() => { setDir(d); setStreet(""); }}
                  style={{ flex: "1 1 auto", padding: "8px 8px", border: dir === d ? `2px solid ${C.accent}` : `1px solid ${C.border}`, borderRadius: 8, background: dir === d ? C.accent + "18" : C.card, color: dir === d ? C.accent : C.dim, fontSize: 12, fontWeight: dir === d ? 700 : 500, cursor: "pointer", textAlign: "center", lineHeight: 1.3, minWidth: 0 }}>{d}</button>
              ))}
            </div>
          </>)}

          {stops.length > 0 && (<>
            <div style={{ fontSize: 11, color: C.dim, marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>Filter by Street</div>
            <input value={street} onChange={(e) => setStreet(e.target.value)} placeholder="e.g. 72nd, Broadway, 5th Ave..."
              style={{ width: "100%", padding: "11px 14px", background: C.card, color: C.text, border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 15, outline: "none", marginBottom: 8, boxSizing: "border-box" }} />
            <div style={{ fontSize: 12, color: C.dim, marginBottom: 6 }}>{filtered.length} stop{filtered.length !== 1 ? "s" : ""}{street && ` matching "${street}"`}{lat != null && " - distance shown"}</div>
          </>)}

          {filtered.map((s, i) => {
            const d = lat != null ? haversine(lat, lng, s.lat, s.lng) : null;
            return (
              <div key={i} style={{ padding: "11px 12px", background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, marginBottom: 5 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 700 }}>
                      <span style={{ display: "inline-block", width: 22, height: 22, borderRadius: "50%", background: rObj?.type === "SBS" ? C.sbs : C.ltd, color: "#fff", fontSize: 10, fontWeight: 700, textAlign: "center", lineHeight: "22px", marginRight: 7 }}>{i + 1}</span>
                      {s.street}
                    </div>
                    <div style={{ fontSize: 12, color: C.dim, marginTop: 2, marginLeft: 29, lineHeight: 1.3 }}>{s.location}</div>
                  </div>
                  {d != null && <div style={{ fontSize: 13, fontWeight: 700, color: d < 0.12 ? C.ok : d < 0.25 ? C.accent : C.dim, whiteSpace: "nowrap", marginLeft: 6 }}>{formatDist(d)}<div style={{ fontSize: 9, fontWeight: 400, textAlign: "right", color: C.dim }}>{walkMin(d)} min</div></div>}
                </div>
              </div>
            );
          })}

          {!route && (
            <div style={{ textAlign: "center", padding: "36px 20px", color: C.dim }}>
              <div style={{ fontSize: 44, marginBottom: 10 }}>🚌</div>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>Select a bus line above</div>
              <div style={{ fontSize: 13, lineHeight: 1.5 }}>Find all Limited and SBS stops in Manhattan.<br />SBS = Select Bus Service (runs all day).<br />Limited = rush hour / specific hours only.</div>
            </div>
          )}
        </div>
      )}

      {/* NEARBY */}
      {tab === "nearby" && (
        <div style={{ padding: "12px 16px" }}>
          <button onClick={getLoc} disabled={locating}
            style={{ width: "100%", padding: "13px", background: locating ? C.card : `linear-gradient(135deg,${C.sbs},${C.accent})`, color: locating ? C.dim : "#fff", border: "none", borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: locating ? "wait" : "pointer", marginBottom: 10 }}>
            {locating ? "Getting location..." : "Update My Location"}
          </button>
          {locErr && <div style={{ padding: "8px 12px", background: "#3a1818", border: "1px solid #d32f2f33", borderRadius: 10, color: "#ef9a9a", fontSize: 13, marginBottom: 10 }}>{locErr}</div>}

          {lat != null && nearby && (<>
            <div style={{ fontSize: 11, color: C.dim, padding: "5px 8px", background: C.card, borderRadius: 8, marginBottom: 10 }}>{lat.toFixed(5)}, {lng.toFixed(5)}</div>
            {nearby.length === 0 && <div style={{ textAlign: "center", padding: "28px 20px", color: C.dim }}><div style={{ fontSize: 36, marginBottom: 6 }}>No nearby stops</div><div style={{ fontSize: 14 }}>No Limited/SBS routes within 0.6 miles.<br />Try closer to a major avenue or crosstown street.</div></div>}

            {nearby.map((nr, idx) => (
              <div key={idx} style={{ padding: "12px", background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, marginBottom: 7 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <span style={{ padding: "3px 7px", borderRadius: 6, background: nr.route.type === "SBS" ? C.sbs : C.ltd, color: "#fff", fontSize: 12, fontWeight: 800 }}>{nr.route.name}</span>
                  <span style={{ fontSize: 11, color: C.dim, flex: 1 }}>{nr.route.corridor}</span>
                </div>
                {nr.top3.map((s, si) => (
                  <div key={si} style={{ padding: "7px 9px", background: si === 0 ? C.ok + "12" : "transparent", border: si === 0 ? `1px solid ${C.ok}33` : "1px solid transparent", borderRadius: 8, marginBottom: 3 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>{si === 0 && <span style={{ color: C.ok }}>* </span>}{s.stop.street}</div>
                        <div style={{ fontSize: 11, color: C.dim }}>{s.stop.location}</div>
                        <div style={{ fontSize: 10, color: C.dim, fontStyle: "italic" }}>{s.dir}</div>
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: s.dist < 0.1 ? C.ok : s.dist < 0.2 ? C.accent : C.dim, textAlign: "right", whiteSpace: "nowrap", marginLeft: 6 }}>
                        {formatDist(s.dist)}<div style={{ fontSize: 10, fontWeight: 400 }}>~{walkMin(s.dist)} min</div>
                      </div>
                    </div>
                  </div>
                ))}
                {nr.top3[0].dist > 0.15 && (
                  <div style={{ marginTop: 4, padding: "6px 8px", background: C.accent + "12", border: `1px solid ${C.accent}33`, borderRadius: 8, fontSize: 11, color: C.accent, lineHeight: 1.4 }}>
                    Nearest {nr.route.type} stop is ~{walkMin(nr.top3[0].dist)} min walk.
                    {nr.route.type === "SBS" && " SBS is frequent - may be faster than waiting for a local."}
                  </div>
                )}
              </div>
            ))}
          </>)}

          {lat == null && !locating && !locErr && (
            <div style={{ textAlign: "center", padding: "36px 20px", color: C.dim }}>
              <div style={{ fontSize: 44, marginBottom: 10 }}>📍</div>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>Find stops near you</div>
              <div style={{ fontSize: 13, lineHeight: 1.5 }}>Tap the button above to see nearby<br />Limited & SBS routes with walk times.</div>
            </div>
          )}
        </div>
      )}

      <div style={{ padding: "16px", textAlign: "center", fontSize: 10, color: C.dim, lineHeight: 1.5 }}>
        Data: MTA Manhattan Bus Map. Locations approximate.<br />Check MTA.info for current service alerts.
      </div>
    </div>
  );
}
