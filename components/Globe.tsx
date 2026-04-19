"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import GlobeGL from "react-globe.gl";

export interface GlobePin {
  id: string;
  lat: number;
  lng: number;
  kind: "target" | "competitor";
  label?: string;
  // transient highlight trigger
  pulseAt?: number;
}

export interface GlobeHandle {
  flyTo: (lat: number, lng: number, altitude?: number) => void;
  resetView: () => void;
}

interface GlobeProps {
  pins: GlobePin[];
  autoRotate: boolean;
  compact: boolean; // true once a result is selected
}

// Dark, moody globe styling — built from flat hex colors so we don't need to
// ship extra texture assets with the project.
const GLOBE_IMAGE_URL =
  "//unpkg.com/three-globe/example/img/earth-dark.jpg";
const BUMP_IMAGE_URL =
  "//unpkg.com/three-globe/example/img/earth-topology.png";

const Globe = forwardRef<GlobeHandle, GlobeProps>(function Globe(
  { pins, autoRotate, compact },
  ref
) {
  const globeRef = useRef<any>(null);
  const [dims, setDims] = useState({ w: 0, h: 0 });
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Size the globe to its container. react-globe.gl takes explicit dimensions.
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setDims({ w: Math.floor(width), h: Math.floor(height) });
      }
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // Configure controls once globe is ready.
  useEffect(() => {
    if (!globeRef.current) return;
    const controls = globeRef.current.controls?.();
    if (controls) {
      controls.enableZoom = true;
      controls.autoRotate = autoRotate;
      controls.autoRotateSpeed = 0.3;
      controls.minDistance = 180;
      controls.maxDistance = 700;
    }
  }, [autoRotate, dims.w, dims.h]);

  useImperativeHandle(
    ref,
    () => ({
      flyTo(lat, lng, altitude = 0.5) {
        globeRef.current?.pointOfView({ lat, lng, altitude }, 1500);
      },
      resetView() {
        globeRef.current?.pointOfView(
          { lat: 25, lng: -40, altitude: 2.2 },
          1200
        );
      },
    }),
    []
  );

  // Initial camera on mount.
  useEffect(() => {
    if (!globeRef.current) return;
    globeRef.current.pointOfView({ lat: 25, lng: -40, altitude: 2.2 }, 0);
  }, [dims.w, dims.h]);

  // HTML pin markup — we use htmlElementsData so we can style with Tailwind.
  const htmlElementsData = useMemo(() => pins, [pins]);

  return (
    <div
      ref={containerRef}
      className="globe-halo relative h-full w-full overflow-hidden"
    >
      {dims.w > 0 && dims.h > 0 && (
        <GlobeGL
          ref={globeRef}
          width={dims.w}
          height={dims.h}
          backgroundColor="rgba(0,0,0,0)"
          globeImageUrl={GLOBE_IMAGE_URL}
          bumpImageUrl={BUMP_IMAGE_URL}
          showAtmosphere
          atmosphereColor="#38d1ff"
          atmosphereAltitude={0.18}
          htmlElementsData={htmlElementsData}
          htmlAltitude={0.012}
          htmlLat={(d: any) => (d as GlobePin).lat}
          htmlLng={(d: any) => (d as GlobePin).lng}
          htmlElement={(d: any) => {
            const pin = d as GlobePin;
            const el = document.createElement("div");
            el.style.pointerEvents = "auto";
            el.style.transform = "translate(-50%, -50%)";
            el.setAttribute("data-pin-id", pin.id);
            el.setAttribute("data-pin-kind", pin.kind);

            if (pin.kind === "target") {
              el.innerHTML = `
                <div style="position:relative;width:40px;height:40px;display:flex;align-items:center;justify-content:center;">
                  <div style="position:absolute;inset:0;border-radius:9999px;border:1.5px solid rgba(0,183,255,0.8);animation:pulseRing 2s ease-out infinite;"></div>
                  <div style="position:absolute;inset:6px;border-radius:9999px;border:1.5px solid rgba(0,183,255,0.5);animation:pulseRing 2s ease-out 0.6s infinite;"></div>
                  <div style="width:14px;height:14px;border-radius:9999px;background:#38d1ff;box-shadow:0 0 18px rgba(56,209,255,0.9),0 0 4px rgba(255,255,255,0.9);border:2px solid rgba(255,255,255,0.9);"></div>
                  ${
                    pin.label
                      ? `<div style="position:absolute;top:100%;left:50%;transform:translateX(-50%);margin-top:6px;white-space:nowrap;background:rgba(15,15,22,0.9);backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,0.1);color:#d5faff;font-size:10px;font-weight:500;letter-spacing:0.08em;text-transform:uppercase;padding:4px 8px;border-radius:4px;font-family:var(--font-jetbrains),ui-monospace,monospace;">${pin.label}</div>`
                      : ""
                  }
                </div>
              `;
            } else {
              const pulsing = pin.pulseAt && Date.now() - pin.pulseAt < 1500;
              el.innerHTML = `
                <div style="position:relative;width:20px;height:20px;display:flex;align-items:center;justify-content:center;">
                  ${
                    pulsing
                      ? `<div style="position:absolute;inset:0;border-radius:9999px;border:1.5px solid rgba(245,181,68,0.9);animation:pulseRing 1.5s ease-out 2;"></div>`
                      : ""
                  }
                  <div style="width:7px;height:7px;border-radius:9999px;background:${
                    pulsing ? "#f5b544" : "rgba(255,255,255,0.55)"
                  };box-shadow:${
                    pulsing
                      ? "0 0 12px rgba(245,181,68,0.9)"
                      : "0 0 6px rgba(255,255,255,0.35)"
                  };border:1.5px solid ${
                    pulsing ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.7)"
                  };"></div>
                </div>
              `;
            }
            return el;
          }}
        />
      )}

      {/* Bottom-left compass / meta, only visible in compact mode */}
      {compact && (
        <div className="mono pointer-events-none absolute bottom-6 left-6 z-10 space-y-1 text-[10px] uppercase tracking-[0.2em] text-slate-500">
          <div>› Drag to rotate</div>
          <div>› Scroll to zoom</div>
        </div>
      )}
    </div>
  );
});

export default Globe;
