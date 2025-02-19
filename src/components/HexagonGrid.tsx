import { useEffect } from 'react';
import { Vector as VectorLayer } from 'ol/layer';
import { Vector as VectorSource } from 'ol/source';
import { Feature } from 'ol';
import { Polygon } from 'ol/geom';
import { Style, Stroke, Fill } from 'ol/style';
import { transform } from 'ol/proj';
import { cellToLatLng, cellToBoundary, latLngToCell, gridDisk } from 'h3-js';
import type { Map } from 'ol';
import type { MapBrowserEvent } from 'ol';

interface HexagonGridProps {
  map: Map | null; // Map из OpenLayers или null
}

const HexagonGrid: React.FC<HexagonGridProps> = ({ map }) => {
  useEffect(() => {
    if (!map) return;
    // Цвета для стилей
    const HexColor = 'rgba(51, 153, 204, 0.2)'
    const BorderHexColor = 'rgba(51, 153, 204, 0.9)'
    const ActHexColor = 'rgba(204, 51, 51, 0.2)'
    const ActBorderHexColor = 'rgba(204, 51, 51, 0.9)'


    const vectorSource = new VectorSource();
    const vectorLayer = new VectorLayer({
      source: vectorSource,
      style: new Style({
        stroke: new Stroke({
          color: BorderHexColor,
          width: 2
        }),
        fill: new Fill({
          color: HexColor
        })
      }),
    });

    // Параметры шестиугольников
    const resolution = 8; // Размер (от 15 до 0 возрастает)
    const gridRadius = 15; // Радиус прорисовки(количество)

    // Корды Перми
      const Perm4326 = {
        latitude: 58.0104, // Широта
        longitude: 56.2294  // Долгота 
      };
    
      /*
      // Преобразование в EPSG:3857
      const Perm3857 = transform(
        [Perm4326.longitude, Perm4326.latitude],
        'EPSG:4326',
        'EPSG:3857'
      );
      */

    const centerCell = latLngToCell(
      Perm4326.latitude, // Долгота (longitude)
      Perm4326.longitude, // Широта (latitude)
      resolution
    );
    
    const hexCells = gridDisk(centerCell, gridRadius);
    console.log('Generated cells:', hexCells.length); // Выводим число гексов

    hexCells.forEach((h3Index) => {

      const coords = cellToBoundary(h3Index, true);
      
      // Преобразование координат
      const polygonCoords = coords.map(coord => 
        transform(
          [coord[0], // Долгота (longitude)
           coord[1]], // Широта (latitude)
          'EPSG:4326',
          'EPSG:3857'
        )
      );
      
      // Замыкание полигона
      polygonCoords.push(polygonCoords[0]);

      const hexagon = new Feature({
        geometry: new Polygon([polygonCoords]),
        h3Index: h3Index
      });

      vectorSource.addFeature(hexagon);

    });

    map.addLayer(vectorLayer);

    // Обработчик кликов
    const clickHandler = (event: MapBrowserEvent<UIEvent>) => {
      map.forEachFeatureAtPixel(event.pixel, (feature) => {
        if (!(feature instanceof Feature)) return;

        const isSelected = !feature.get('selected');
        feature.set('selected', isSelected);

        const h3Index = feature.get('h3Index');
        console.log('Clicked:', cellToLatLng(h3Index)); //Выводим корды

        const newStyle = new Style({
          stroke: new Stroke({
            color: isSelected 
              ? ActBorderHexColor // Красный для выбранных
              : BorderHexColor, // Синий по умолчанию
            width: 2
          }),
          fill: new Fill({
            color: isSelected 
              ? ActHexColor // Красный для выбранных
              : HexColor // Синий по умолчанию
          })      
        })

        feature.setStyle(newStyle);
        vectorSource.changed();

      })
    };

    map.on('click', clickHandler);

    return () => {
      map.removeLayer(vectorLayer);
      map.un('click', clickHandler);
    };
  }, [map]);

  return null;
};

export default HexagonGrid;