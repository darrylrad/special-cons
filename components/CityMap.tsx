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
  // Which competitor pin should have its popup auto-opened right now.
  // Set from page.tsx when the user clicks a competitor row in the detail panel.
  activePopupId?: string | null;
  // Callback fired when the user clicks a pin directly on the map.
  onPinClick?: (pinId: string) => void;
}

// Render the popup HTML string with inline styles — Leaflet won't accept React.
function buildPopupHtml(pin: GlobePin): string {
  const p = pin.popup;
  if (!p) return `<div style="font-family: var(--font-inter), sans-serif; padding: 4px;">${pin.id}</div>`;

  const verdictColor = (v?: string) => {
    if (v === "PROCEED") return "#22d3a2";
    if (v === "PROCEED WITH CAUTION") return "#f5b544";
    if (v === "AVOID") return "#f06a6a";
    return "#94a3b8";
  };

  const verdictLabel = (v?: string) => {
    if (v === "PROCEED") return "Proceed";
    if (v === "PROCEED WITH CAUTION") return "Caution";
    if (v === "AVOID") return "Avoid";
    return "Unknown";
  };

  const color = verdictColor(p.verdict);

  const scoreBar = (label: string, value: number) => {
    const c =
      value >= 65 ? "#22d3a2" : value >= 40 ? "#f5b544" : "#f06a6a";
    const width = Math.max(0, Math.min(100, value));
    return `
      <div style="margin-bottom: 6px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:2px;">
          <span style="font-size:9px;text-transform:uppercase;letter-spacing:0.1em;color:#94a3b8;">${label}</span>
          <span style="font-size:10px;color:${c};font-family:var(--font-jetbrains),monospace;font-variant-numeric:tabular-nums;">${value.toFixed(1)}</span>
        </div>
        <div style="height:3px;background:rgba(255,255,255,0.08);border-radius:999px;overflow:hidden;">
          <div style="height:100%;width:${width}%;background:${c};border-radius:999px;"></div>
        </div>
      </div>
    `;
  };

  const scoresHtml = p.scores
    ? `
      <div style="margin-top:10px;padding-top:10px;border-top:1px solid rgba(255,255,255,0.08);">
        ${scoreBar("Saturation", p.scores.saturation)}
        ${scoreBar("Churn", p.scores.churn)}
        ${scoreBar("Diversity", p.scores.diversity)}
      </div>
    `
    : "";

  return `
    <div style="
      font-family: var(--font-inter), sans-serif;
      color: #e2e8f0;
      min-width: 220px;
      max-width: 260px;
    ">
      <div style="font-size:13px;font-weight:600;color:#f1f5f9;line-height:1.2;margin-bottom:6px;">
        ${p.name}
      </div>
      <div style="display:flex;align-items:center;gap:8px;">
        <span style="
          display:inline-flex;align-items:center;gap:4px;
          padding:2px 8px;border-radius:999px;
          background:${color}1a;border:1px solid ${color}40;
          font-size:9px;text-transform:uppercase;letter-spacing:0.1em;
          color:${color};
        ">
          <span style="width:4px;height:4px;border-radius:999px;background:${color};box-shadow:0 0 6px ${color};"></span>
          ${verdictLabel(p.verdict)}
        </span>
        ${
          p.overallScore !== undefined
            ? `<span style="font-family:var(--font-jetbrains),monospace;font-size:16px;color:${color};font-variant-numeric:tabular-nums;line-height:1;">${p.overallScore.toFixed(1)}</span>
               <span style="font-size:9px;color:#64748b;text-transform:uppercase;letter-spacing:0.12em;">/100</span>`
            : ""
        }
      </div>
      ${scoresHtml}
    </div>
  `;
}

export default function CityMap({
  pins,
  forwardedRef,
  center,
  activePopupId,
  onPinClick,
}: CityMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<Map<string, any>>(new Map());
  const [ready, setReady] = useState(false);

  // Initialize map
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const L = (await import("leaflet")).default;

      if (cancelled || !containerRef.current) return;

      const map = L.map(containerRef.current, {
        center: center ? [center.lat, center.lng] : [40.7128, -74.006],
        zoom: center?.zoom ?? 15,
        zoomControl: false,
        attributionControl: false,
        preferCanvas: true,
      });

      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
        {
          maxZoom: 19,
          subdomains: "abcd",
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        }
      ).addTo(map);

      L.control.zoom({ position: "bottomright" }).addTo(map);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Render markers when pins change
  useEffect(() => {
    if (!ready || !mapRef.current) return;

    (async () => {
      const L = (await import("leaflet")).default;
      const map = mapRef.current;

      markersRef.current.forEach((m) => m.remove());
      markersRef.current = new Map();

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
            <div style="position:relative;width:24px;height:24px;display:flex;align-items:center;justify-content:center;cursor:pointer;">
              ${
                pulsing
                  ? `<div style="position:absolute;inset:-4px;border-radius:9999px;border:1.5px solid rgba(245,181,68,0.9);animation:pulseRing 1.5s ease-out 2;"></div>`
                  : ""
              }
              <div style="width:10px;height:10px;border-radius:9999px;background:${
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
          iconSize: [isTarget ? 40 : 24, isTarget ? 40 : 24],
          iconAnchor: [isTarget ? 20 : 12, isTarget ? 20 : 12],
        });

        const marker = L.marker([pin.lat, pin.lng], {
          icon,
          zIndexOffset: isTarget ? 1000 : 0,
        }).addTo(map);

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

        // Bind popup for competitor pins
        if (!isTarget) {
          marker.bindPopup(buildPopupHtml(pin), {
            className: "gapmap-popup",
            closeButton: true,
            maxWidth: 280,
            minWidth: 240,
            offset: L.point(0, -4),
          });

          // Click handler for the pin itself
          marker.on("click", () => {
            if (onPinClick) onPinClick(pin.id);
          });
        }

        markersRef.current.set(pin.id, marker);
      });
    })();
  }, [pins, ready, onPinClick]);

  // Open the popup for the active pin ID (triggered from the detail panel)
  useEffect(() => {
    if (!ready || !activePopupId) return;
  
    // Wait a tick for any in-flight marker rebuild to complete
    const timeoutId = setTimeout(() => {
      const marker = markersRef.current.get(activePopupId);
      if (marker && marker.openPopup) {
        marker.openPopup();
      }
    }, 100);
  
    return () => clearTimeout(timeoutId);
  }, [activePopupId, ready, pins]);

  // Imperative handle
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

        /* GapMap popup — dark glass to match the UI */
        .gapmap-popup .leaflet-popup-content-wrapper {
          background: rgba(15, 15, 22, 0.95) !important;
          backdrop-filter: blur(14px) saturate(140%);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px !important;
          box-shadow: 0 20px 60px -20px rgba(0, 0, 0, 0.8);
          color: #e2e8f0;
          padding: 4px;
        }
        .gapmap-popup .leaflet-popup-content {
          margin: 12px 14px !important;
          line-height: 1.4 !important;
        }
        .gapmap-popup .leaflet-popup-tip {
          background: rgba(15, 15, 22, 0.95) !important;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .gapmap-popup .leaflet-popup-close-button {
          color: rgba(255, 255, 255, 0.4) !important;
          font-size: 18px !important;
          padding: 6px 8px !important;
          transition: color 0.15s;
        }
        .gapmap-popup .leaflet-popup-close-button:hover {
          color: #38d1ff !important;
          background: transparent !important;
        }
      `}</style>
    </>
  );
}