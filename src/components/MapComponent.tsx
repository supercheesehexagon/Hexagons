import { useEffect, useRef, useState } from 'react';
import { Map, View } from 'ol';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import { transform } from 'ol/proj';
import HexagonGrid from './HexagonGrid';
import 'ol/ol.css';

const MapComponent = () => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<Map | null>(null);

  // Корды перми
  const Perm4326 = {
    latitude: 58.0104,
    longitude: 56.2294
  };

  useEffect(() => {
    if (!mapRef.current) return;

    // Задаем центр карты
    const centerMap = Perm4326;

    // Создаем карту
    const initialMap = new Map({
      target: mapRef.current,
      layers: [
        new TileLayer({ source: new OSM() })
      ],
      view: new View({
        // Преобразуем на сферу
        center: transform(
          [centerMap.longitude, centerMap.latitude],
          'EPSG:4326',
          'EPSG:3857'
        ),
        zoom: 18,
        minZoom: 12,
        maxZoom: 18
      })
    });

    setMap(initialMap);
    return () => initialMap.setTarget(undefined);
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