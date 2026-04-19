"use client";

import {
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type Ref,
} from "react";
import type { GlobePin, GlobeHandle } from "./Globe";

interface CityMapProps {
    pins: GlobePin[];
    forwardedRef?: Ref<GlobeHandle>;
    center?: { lat: number; lng: number; zoom?: number };
  }



// -----------------------------------------------------------------------------
// CityMap — Leaflet-backed street-level view used in detail mode.
// Exposes the same GlobeHandle interface as Globe.tsx so page.tsx doesn't care
// which is mounted. Uses CARTO Dark Matter tiles to match the mission-control
// aesthetic. Leaflet is loaded dynamically because it references `window`.
// -----------------------------------------------------------------------------
export default function CityMap({ pins, forwardedRef, center }: CityMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [ready, setReady] = useState(false);

  // Initialize Leaflet once the container is mounted.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const L = (await import("leaflet")).default;
      // Also load the CSS — Leaflet doesn't work without it.

      if (cancelled || !containerRef.current) return;

      // Default NYC view — covers all five boroughs nicely.
      const map = L.map(containerRef.current, {
        center: center ? [center.lat, center.lng] : [40.7128, -74.006],
        zoom: center?.zoom ?? 14,
        zoomControl: false,
        attributionControl: false,
        preferCanvas: true,
      });

      // CARTO Dark Matter — beautiful dark theme, free, no API key.
      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
        {
          maxZoom: 19,
          subdomains: "abcd",
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        }
      ).addTo(map);

      // Custom zoom control, bottom-right, styled to match the rest of the UI.
      L.control.zoom({ position: "bottomright" }).addTo(map);

      // Attribution as a subtle corner thing.
      L.control
        .attribution({ position: "bottomleft", prefix: false })
        .addTo(map);

      mapRef.current = map;
      setReady(true);
    })();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Render pins whenever they change.
  useEffect(() => {
    if (!ready || !mapRef.current) return;

    (async () => {
      const L = (await import("leaflet")).default;
      const map = mapRef.current;

      // Clear previous markers.
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];

      pins.forEach((pin) => {
        const isTarget = pin.kind === "target";
        const pulsing = pin.pulseAt && Date.now() - pin.pulseAt < 1500;

        const html = isTarget
          ? `
            <div style="position:relative;width:40px;height:40px;display:flex;align-items:center;justify-content:center;pointer-events:none;">
              <div style="position:absolute;inset:0;border-radius:9999px;border:1.5px solid rgba(0,183,255,0.8);animation:pulseRing 2s ease-out infinite;"></div>
              <div style="position:absolute;inset:6px;border-radius:9999px;border:1.5px solid rgba(0,183,255,0.5);animation:pulseRing 2s ease-out 0.6s infinite;"></div>
              <div style="width:14px;height:14px;border-radius:9999px;background:#38d1ff;box-shadow:0 0 18px rgba(56,209,255,0.9),0 0 4px rgba(255,255,255,0.9);border:2px solid rgba(255,255,255,0.9);"></div>
            </div>
          `
          : `
            <div style="position:relative;width:20px;height:20px;display:flex;align-items:center;justify-content:center;pointer-events:none;">
              ${
                pulsing
                  ? `<div style="position:absolute;inset:-4px;border-radius:9999px;border:1.5px solid rgba(245,181,68,0.9);animation:pulseRing 1.5s ease-out 2;"></div>`
                  : ""
              }
              <div style="width:8px;height:8px;border-radius:9999px;background:${
                pulsing ? "#f5b544" : "rgba(255,255,255,0.7)"
              };box-shadow:${
                pulsing
                  ? "0 0 12px rgba(245,181,68,0.9)"
                  : "0 0 6px rgba(255,255,255,0.4)"
              };border:1.5px solid ${
                pulsing ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.8)"
              };"></div>
            </div>
          `;

        const icon = L.divIcon({
          html,
          className: "gapmap-pin",
          iconSize: [isTarget ? 40 : 20, isTarget ? 40 : 20],
          iconAnchor: [isTarget ? 20 : 10, isTarget ? 20 : 10],
        });

        const marker = L.marker([pin.lat, pin.lng], {
          icon,
          // Target renders above competitors.
          zIndexOffset: isTarget ? 1000 : 0,
        }).addTo(map);

        // Optional label on the target pin.
        if (isTarget && pin.label) {
          marker
            .bindTooltip(pin.label, {
              permanent: true,
              direction: "bottom",
              offset: [0, 12],
              className: "gapmap-target-label",
            })
            .openTooltip();
        }

        markersRef.current.push(marker);
      });
    })();
  }, [pins, ready]);

  // Imperative handle — flyTo/resetView translate Globe's altitude into Leaflet zoom.
  useImperativeHandle(
    forwardedRef,
    () => ({
      flyTo(lat, lng, altitude = 0.5) {
        if (!mapRef.current) return;
        const zoom =
          altitude <= 0.15 ? 16 : altitude <= 0.3 ? 15 : altitude <= 0.5 ? 14 : 13;
        mapRef.current.flyTo([lat, lng], zoom, {
          duration: 1.5,
          easeLinearity: 0.25,
        });
      },
      resetView() {
        if (!mapRef.current) return;
        mapRef.current.flyTo([40.7128, -74.006], 11, { duration: 1.2 });
      },
      // No-op on map — the zoom happens on the globe before we mount.
      async zoomToLocation() {
        return;
      },
    }),
    []
  );

  return (
    <>
      <div
        ref={containerRef}
        className="h-full w-full"
        style={{ background: "#0a0a0f" }}
      />

      {/* Style overrides for Leaflet's built-in controls so they match our UI.
          Scoped via :global so we can hit Leaflet's generated classNames. */}
      <style jsx global>{`
        .gapmap-pin {
          background: transparent !important;
          border: none !important;
        }
        .gapmap-target-label {
          background: rgba(15, 15, 22, 0.9) !important;
          backdrop-filter: blur(8px);
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
          color: #d5faff !important;
          font-size: 10px !important;
          font-weight: 500;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          padding: 4px 8px !important;
          border-radius: 4px;
          font-family: var(--font-jetbrains), ui-monospace, monospace !important;
          box-shadow: none !important;
          white-space: nowrap;
        }
        .gapmap-target-label::before {
          display: none !important;
        }
        .leaflet-container {
          background: #0a0a0f !important;
          font-family: var(--font-inter), sans-serif;
        }
        .leaflet-control-zoom {
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
          border-radius: 8px !important;
          overflow: hidden;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
        }
        .leaflet-control-zoom a {
          background: rgba(15, 15, 22, 0.85) !important;
          backdrop-filter: blur(8px);
          color: #d5faff !important;
          border: none !important;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05) !important;
          transition: all 0.15s;
        }
        .leaflet-control-zoom a:hover {
          background: rgba(0, 183, 255, 0.15) !important;
          color: #38d1ff !important;
        }
        .leaflet-control-attribution {
          background: rgba(15, 15, 22, 0.7) !important;
          backdrop-filter: blur(8px);
          color: rgba(255, 255, 255, 0.4) !important;
          font-size: 9px !important;
          padding: 2px 8px !important;
          border-radius: 4px 0 0 0;
        }
        .leaflet-control-attribution a {
          color: rgba(56, 209, 255, 0.6) !important;
        }
      `}</style>
    </>
  );
}