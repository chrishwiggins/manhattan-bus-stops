export function haversine(lat1, lng1, lat2, lng2) {
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

export function formatDist(miles) {
  const ft = Math.round(miles * 5280);
  if (ft < 1000) return `${ft} ft`;
  return `${miles.toFixed(2)} mi`;
}

export function walkMin(miles) {
  return Math.max(1, Math.ceil(miles / 0.047));
}
