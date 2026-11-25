import { ExternalLink, MapPin } from 'lucide-react'

// Keyless location preview: an OpenStreetMap embed (non-interactive) shown
// in the UI; clicking it opens the full map in Google Maps in a new tab.
// No API key, no map library, no directions — display only, by design.

export function googleMapsUrl(latitude: number, longitude: number): string {
  return `https://www.google.com/maps?q=${latitude},${longitude}`
}

export function osmEmbedUrl(latitude: number, longitude: number): string {
  const delta = 0.008
  const bbox = [longitude - delta, latitude - delta, longitude + delta, latitude + delta]
    .map(value => value.toFixed(6)).join('%2C')
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${latitude}%2C${longitude}`
}

// Extract coordinates from a pasted Google Maps link or a plain "lat, lng" pair.
// Supports full URLs: /@lat,lng · ?q=lat,lng · ?query=lat,lng · !3dlat!4dlng.
// Short links (maps.app.goo.gl) cannot be resolved in the browser — returns null.
export function parseLocationInput(raw: string): { latitude: number; longitude: number } | null {
  const text = raw.trim()
  if (!text) return null
  const pair = (lat: string, lng: string) => {
    const latitude = Number(lat), longitude = Number(lng)
    return Number.isFinite(latitude) && Number.isFinite(longitude) && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180
      ? { latitude, longitude } : null
  }
  const patterns = [
    /@(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)/,
    /!3d(-?\d{1,3}\.\d+)!4d(-?\d{1,3}\.\d+)/,
    /[?&](?:q|query|ll|center)=(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)/,
    /^(-?\d{1,3}\.\d+)[,\s]+(-?\d{1,3}\.\d+)$/,
  ]
  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match) { const result = pair(match[1], match[2]); if (result) return result }
  }
  return null
}

export function LocationMap({ latitude, longitude, label = 'Service location' }: {
  latitude: number
  longitude: number
  label?: string
}) {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null
  return <figure className="sf-locmap">
    <a href={googleMapsUrl(latitude, longitude)} target="_blank" rel="noreferrer"
      aria-label={`${label}: open in Google Maps (new tab)`} title="Open in Google Maps">
      <iframe title={`${label} map preview`} src={osmEmbedUrl(latitude, longitude)} loading="lazy" tabIndex={-1} aria-hidden="true" />
      <span className="sf-locmap-open"><ExternalLink size={13} aria-hidden="true" /> Open in Google Maps</span>
    </a>
    <figcaption>
      <MapPin size={13} aria-hidden="true" />
      <span className="sf-tabular">{latitude.toFixed(6)}, {longitude.toFixed(6)}</span>
      <span className="sf-locmap-credit">© OpenStreetMap contributors</span>
    </figcaption>
  </figure>
}
