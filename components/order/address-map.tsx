"use client";

import { AdvancedMarker,APIProvider, Map } from "@vis.gl/react-google-maps";
import { useCallback, useState } from "react";

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!;

interface AddressMapProps {
  lat: number;
  lng: number;
  onPositionChange: (lat: number, lng: number) => void;
}

export function AddressMap({ lat, lng, onPositionChange }: AddressMapProps) {
  const [markerPosition, setMarkerPosition] = useState({ lat, lng });

  const handleDragEnd = useCallback(
    (e: google.maps.MapMouseEvent) => {
      if (e.latLng) {
        const newLat = e.latLng.lat();
        const newLng = e.latLng.lng();
        setMarkerPosition({ lat: newLat, lng: newLng });
        onPositionChange(newLat, newLng);
      }
    },
    [onPositionChange]
  );

  return (
    <APIProvider apiKey={API_KEY}>
      <Map
        mapId="address-map"
        defaultCenter={markerPosition}
        defaultZoom={17}
        gestureHandling="greedy"
        disableDefaultUI
        className="h-[200px] w-full rounded-xl"
      >
        <AdvancedMarker
          position={markerPosition}
          draggable
          onDragEnd={handleDragEnd}
        />
      </Map>
    </APIProvider>
  );
}
