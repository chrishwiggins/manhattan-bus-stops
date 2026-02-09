import { createContext, useContext, useState, useCallback } from "react";

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [viewMode, setViewMode] = useState("map");
  const [selectedStop, setSelectedStop] = useState(null);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [locating, setLocating] = useState(false);

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

  return (
    <AppContext.Provider value={{
      viewMode, setViewMode,
      selectedStop, setSelectedStop,
      selectedRoute, setSelectedRoute,
      userLocation, setUserLocation,
      locating, requestLocation,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
