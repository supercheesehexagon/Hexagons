import React, { useEffect, useRef, useState } from 'react';
import { Map, View } from 'ol';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import 'ol/ol.css';
import HexagonGrid from './HexagonGrid';
import { transform } from 'ol/proj';
//import { getCenter } from 'ol/extent';

const MapComponent = () => {
  const mapRef = useRef(null);
  const [map, setMap] = useState(null);

  // Корды перми
  const Perm4326 = {
    latitude: 58.0104,
    longitude: 56.2294
  };

  // Преобразование в координаты EPSG:3857
  const Perm3857 = transform(
    [Perm4326.longitude, Perm4326.latitude],
    'EPSG:4326',
    'EPSG:3857'
  );


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
        center: Perm3857,
        zoom: 13
      })
    });

    setMap(initialMap);

    return () => initialMap.setTarget(null);
  }, []);

  return (
    <div 
    ref={mapRef} 
    style={{ 
      width: '100vw',
      height: '100vh',
      padding: '500px',
      boxSizing: 'border-box',
      display: 'grid',
      gridTemplate: '1fr / 1fr'
    }}
    >
      {map && <HexagonGrid map={map} />}
    </div>
  );
};

export default MapComponent;