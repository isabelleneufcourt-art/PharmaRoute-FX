"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

import type { RouteMapProps } from "./route-map";

// Leaflet accède à `window` : le composant carte doit être chargé uniquement
// côté client, jamais lors du rendu serveur (SSR).
const RouteMap = dynamic(() => import("./route-map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" />
      Chargement de la carte…
    </div>
  ),
});

export function RouteMapLoader(props: RouteMapProps) {
  return <RouteMap {...props} />;
}
