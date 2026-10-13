'use client';

import React, { useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  title: string;
  priorityLabel?: string;
  status?: string;
  onClick?: () => void;
}

interface LeafletMapProps {
  center?: [number, number];
  zoom?: number;
  markers?: MapMarker[];
  draggablePin?: { lat: number; lng: number };
  onPinDragEnd?: (lat: number, lng: number) => void;
  className?: string;
}

export default function LeafletMap({
  center = [28.6139, 77.2090], // Default New Delhi
  zoom = 13,
  markers = [],
  draggablePin,
  onPinDragEnd,
  className = 'h-[360px] w-full rounded-xl',
}: LeafletMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const draggableMarkerRef = useRef<any>(null);
  const markersLayerRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !mapContainerRef.current) return;

    let L: any;
    import('leaflet').then((leafletModule) => {
      L = leafletModule.default || leafletModule;

      // Fix default Leaflet icon paths
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      if (!mapInstanceRef.current) {
        const map = L.map(mapContainerRef.current).setView(center, zoom);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors',
          maxZoom: 19,
        }).addTo(map);

        mapInstanceRef.current = map;
        markersLayerRef.current = L.layerGroup().addTo(map);
      }

      // Handle Draggable Pin for Reporting
      if (draggablePin && mapInstanceRef.current) {
        if (!draggableMarkerRef.current) {
          const pin = L.marker([draggablePin.lat, draggablePin.lng], {
            draggable: true,
          }).addTo(mapInstanceRef.current);

          pin.on('dragend', () => {
            const pos = pin.getLatLng();
            if (onPinDragEnd) onPinDragEnd(pos.lat, pos.lng);
          });

          draggableMarkerRef.current = pin;
        } else {
          draggableMarkerRef.current.setLatLng([draggablePin.lat, draggablePin.lng]);
        }
      }

      // Handle Multi-Complaint Markers
      if (markersLayerRef.current) {
        markersLayerRef.current.clearLayers();

        markers.forEach((m) => {
          let color = '#059669'; // low
          if (m.priorityLabel === 'CRITICAL') color = '#dc2626';
          else if (m.priorityLabel === 'HIGH') color = '#ea580c';
          else if (m.priorityLabel === 'MEDIUM') color = '#d97706';

          const circle = L.circleMarker([m.lat, m.lng], {
            radius: 8,
            fillColor: color,
            color: '#ffffff',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.85,
          });

          circle.bindPopup(`
            <div style="font-family: sans-serif; font-size: 13px;">
              <strong style="color: ${color};">${m.priorityLabel || 'COMPLAINT'}</strong><br/>
              <b>${m.title}</b><br/>
              Status: ${m.status || 'Active'}
            </div>
          `);

          if (m.onClick) {
            circle.on('click', m.onClick);
          }

          circle.addTo(markersLayerRef.current);
        });
      }
    });

    return () => {
      // Keep map reference across re-renders
    };
  }, [center, zoom, markers, draggablePin]);

  return <div ref={mapContainerRef} className={className} />;
}
