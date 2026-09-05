"use client";

import React, { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { RotateCw, ZoomIn, ZoomOut } from "lucide-react";

export interface LocationMarker {
  id: string;
  city: string;
  country: string;
  lat: number;
  lng: number;
  visitCount: number;
  referrer: string;
  lastVisitedAt?: string;
}

interface InteractiveGlobeProps {
  locations: LocationMarker[];
  activeLocation?: LocationMarker | null;
  onSelectLocation?: (loc: LocationMarker) => void;
}

export function InteractiveGlobe({
  locations = [],
  activeLocation,
  onSelectLocation,
}: InteractiveGlobeProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const isUserInteracting = useRef(false);
  const [autoRotate, setAutoRotate] = useState(true);
  const autoRotateRef = useRef(autoRotate);

  useEffect(() => {
    autoRotateRef.current = autoRotate;
  }, [autoRotate]);

  // Fallback demo markers if database has few
  const displayLocations = locations.length > 0 ? locations : [
    { id: "1", city: "Hyderabad", country: "India", lat: 17.385, lng: 78.4867, visitCount: 6, referrer: "Direct" },
    { id: "2", city: "San Francisco", country: "United States", lat: 37.7749, lng: -122.4194, visitCount: 4, referrer: "X" },
    { id: "3", city: "London", country: "United Kingdom", lat: 51.5074, lng: -0.1278, visitCount: 3, referrer: "Reddit" },
    { id: "4", city: "Singapore", country: "Singapore", lat: 1.3521, lng: 103.8198, visitCount: 5, referrer: "YouTube" },
    { id: "5", city: "Tokyo", country: "Japan", lat: 35.6762, lng: 139.6503, visitCount: 3, referrer: "Google" },
    { id: "6", city: "Bengaluru", country: "India", lat: 12.9716, lng: 77.5946, visitCount: 7, referrer: "GitHub" },
  ];

  // 1. Initialize MapLibre GL 3D Globe with Non-Watermarked Dark Matter Retina Tiles
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainer.current,
      // ESRI World Dark Gray — free, no API key, true dark map with city labels
      style: {
        version: 8,
        sources: {
          "esri-dark": {
            type: "raster",
            tiles: [
              "https://server.arcgisonline.com/arcgis/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
            ],
            tileSize: 256,
            attribution: "Esri, HERE, Garmin, © OpenStreetMap",
            maxzoom: 16,
          },
          "esri-dark-labels": {
            type: "raster",
            tiles: [
              "https://server.arcgisonline.com/arcgis/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}",
            ],
            tileSize: 256,
            maxzoom: 16,
          },
        },
        layers: [
          {
            id: "esri-dark-base",
            type: "raster",
            source: "esri-dark",
            minzoom: 0,
            maxzoom: 20,
          },
          {
            id: "esri-dark-ref",
            type: "raster",
            source: "esri-dark-labels",
            minzoom: 0,
            maxzoom: 20,
          },
        ],
      },
      center: [78.4867, 20.0],
      zoom: 1.8,
      minZoom: 0.8,
      maxZoom: 16,
      pitch: 0,
      bearing: 0,
      attributionControl: false,
      canvasContextAttributes: {
        antialias: true,
      },
      // Globe projection — renders as a 3D sphere
      // @ts-ignore (globe is supported in maplibre-gl v3+)
      projection: { type: "globe" },
    });

    mapRef.current = map;

    // Enable Globe Projection if supported
    map.on("style.load", () => {
      try {
        if ((map as any).setProjection) {
          (map as any).setProjection({ type: "globe" });
        }
      } catch (e) {}
    });

    // Auto-rotation loop
    let reqId: number;
    function rotateGlobe() {
      if (!isUserInteracting.current && autoRotateRef.current && mapRef.current) {
        const center = map.getCenter();
        center.lng += 0.18;
        if (center.lng > 180) center.lng = -180;
        map.setCenter(center);
      }
      reqId = requestAnimationFrame(rotateGlobe);
    }
    reqId = requestAnimationFrame(rotateGlobe);

    // Pause on user interaction
    const handleInteractionStart = () => {
      isUserInteracting.current = true;
    };
    const handleInteractionEnd = () => {
      setTimeout(() => {
        isUserInteracting.current = false;
      }, 4000);
    };

    map.on("mousedown", handleInteractionStart);
    map.on("touchstart", handleInteractionStart);
    map.on("movestart", (e) => {
      if (e.originalEvent) isUserInteracting.current = true;
    });

    map.on("mouseup", handleInteractionEnd);
    map.on("touchend", handleInteractionEnd);

    const handleOutsideClick = (e: MouseEvent) => {
      if (mapContainer.current && !mapContainer.current.contains(e.target as Node)) {
        isUserInteracting.current = false;
      }
    };
    window.addEventListener("mousedown", handleOutsideClick);

    return () => {
      cancelAnimationFrame(reqId);
      window.removeEventListener("mousedown", handleOutsideClick);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // 2. Render Animated Pulse Beacon Markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    displayLocations.forEach((loc) => {
      const el = document.createElement("div");
      el.className = "cursor-pointer group relative flex items-center justify-center";
      el.style.width = "36px";
      el.style.height = "36px";

      el.innerHTML = `
        <div class="absolute w-8 h-8 rounded-full bg-emerald-500/25 animate-ping pointer-events-none"></div>
        <div class="absolute w-6 h-6 rounded-full bg-emerald-500/40 border border-emerald-400/90 shadow-[0_0_14px_rgba(16,185,129,0.9)]"></div>
        <div class="relative w-2.5 h-2.5 rounded-full bg-yellow-400 border-2 border-zinc-950 shadow-md"></div>
      `;

      const popup = new maplibregl.Popup({
        offset: 20,
        closeButton: false,
        className: "custom-map-popup font-mono",
      }).setHTML(`
        <div class="p-2.5 bg-zinc-950/95 border border-zinc-800 rounded-xl shadow-2xl text-xs space-y-1 backdrop-blur">
          <div class="font-bold text-yellow-400 flex items-center justify-between gap-3">
            <span>${loc.city}</span>
            <span class="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 font-normal">${loc.country}</span>
          </div>
          <div class="text-[11px] text-zinc-300 flex items-center gap-1.5">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span>${loc.visitCount} ${loc.visitCount === 1 ? "visitor" : "visitors"}</span>
            <span class="text-zinc-500">•</span>
            <span class="text-zinc-400">Ref: ${loc.referrer}</span>
          </div>
        </div>
      `);

      const marker = new maplibregl.Marker({ element: el, anchor: "center" })
        .setLngLat([loc.lng, loc.lat])
        .setPopup(popup)
        .addTo(map);

      el.addEventListener("click", () => {
        if (onSelectLocation) onSelectLocation(loc);
        isUserInteracting.current = true;
        map.flyTo({
          center: [loc.lng, loc.lat],
          zoom: Math.max(map.getZoom(), 5.5),
          duration: 1800,
          essential: true,
        });
      });

      markersRef.current.push(marker);
    });
  }, [locations, onSelectLocation]);

  // 3. Smooth Fly-To on external location select
  useEffect(() => {
    if (activeLocation && mapRef.current) {
      isUserInteracting.current = true;
      mapRef.current.flyTo({
        center: [activeLocation.lng, activeLocation.lat],
        zoom: 6.5,
        duration: 2000,
        essential: true,
      });
    }
  }, [activeLocation]);

  return (
    <div className="relative w-full h-full bg-transparent">
      {/* Full-Screen Map Container */}
      <div ref={mapContainer} className="w-full h-full" />

      {/* Floating Bottom-Right Controls */}
      <div className="absolute bottom-6 right-6 flex flex-col gap-2 z-20 font-mono">
        <button
          type="button"
          onClick={() => mapRef.current?.zoomIn({ duration: 400 })}
          className="w-9 h-9 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-700/80 text-zinc-200 hover:text-white flex items-center justify-center shadow-2xl transition backdrop-blur cursor-pointer active:scale-95"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => mapRef.current?.zoomOut({ duration: 400 })}
          className="w-9 h-9 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-700/80 text-zinc-200 hover:text-white flex items-center justify-center shadow-2xl transition backdrop-blur cursor-pointer active:scale-95"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => {
            isUserInteracting.current = false;
            mapRef.current?.flyTo({
              center: [78.4867, 20.0],
              zoom: 1.8,
              pitch: 0,
              bearing: 0,
              duration: 1500,
            });
          }}
          className="w-9 h-9 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-700/80 text-zinc-400 hover:text-zinc-200 flex items-center justify-center text-xs shadow-2xl transition backdrop-blur cursor-pointer active:scale-95"
          title="Reset Orbit"
        >
          1x
        </button>
        {/* Circle-inside-circle rotate toggle: green = rotating, red = stopped */}
        <button
          type="button"
          onClick={() => setAutoRotate((prev) => !prev)}
          className="w-9 h-9 flex items-center justify-center cursor-pointer active:scale-95 transition-transform"
          title={autoRotate ? "Auto-Rotate Active (click to stop)" : "Auto-Rotate Stopped (click to start)"}
        >
          <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
            autoRotate
              ? "border-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.6)]"
              : "border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]"
          }`}>
            <div className={`w-3.5 h-3.5 rounded-full transition-all duration-300 ${
              autoRotate ? "bg-emerald-400" : "bg-red-500"
            }`} />
          </div>
        </button>
      </div>
    </div>
  );
}
