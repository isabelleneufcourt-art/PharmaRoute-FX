"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

import type { TourTemplateMapProps } from "./tour-template-map";

// Leaflet accède à `window` : le composant carte doit être chargé uniquement
// côté client, jamais lors du rendu serveur (SSR).
const TourTemplateMap = dynamic(() => import("./tour-template-map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" />
      Chargement de la carte…
    </div>
  ),
});

export function TourTemplateMapLoader(props: TourTemplateMapProps) {
  return <TourTemplateMap {...props} />;
}
