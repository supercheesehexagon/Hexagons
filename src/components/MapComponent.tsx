// src/components/MapComponent.jsx
import React, { useEffect, useRef, useState } from 'react';
import { Map, View } from 'ol';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import 'ol/ol.css';
import HexagonGrid from './HexagonGrid';

const MapComponent = () => {
  const mapRef = useRef(null);
  const [map, setMap] = useState(null);

  useEffect(() => {
    if (!mapRef.current) return;

    const initialMap = new Map({
      target: mapRef.current,
      layers: [
        new TileLayer({
          source: new OSM()
        })
      ],
      view: new View({
        center: [4180709, 7506893],
        zoom: 8
      })
    });

    setMap(initialMap);

    return () => initialMap.setTarget(null);
  }, []);

  return (
    <div ref={mapRef} style={{ width: '3000px', height: '2000px' }}>
      {map && <HexagonGrid map={map} />}
    </div>
  );
};

export default MapComponent;