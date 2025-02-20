import { useEffect, useState } from 'react';
import { Vector as VectorLayer } from 'ol/layer';
import { Vector as VectorSource } from 'ol/source';
import { Feature } from 'ol';
import { Polygon } from 'ol/geom';
import { Style, Stroke, Fill } from 'ol/style';
import { transform } from 'ol/proj';
import { cellToBoundary, polygonToCells } from 'h3-js';
import type { Map } from 'ol';
import type { MapBrowserEvent } from 'ol';
import type View from 'ol/View';

interface HexagonGridProps {
  map: Map | null; // Map из OpenLayers или null
}
const zoomToResolution = (zoom: number): number => {
  
  const size = Math.min(Math.max(Math.floor(zoom) - 8, 10), 15)
  //console.log('Math.floor(zoom):', Math.floor(zoom));
  //console.log('return:', size);
  
  return size;

};
const HexagonGrid: React.FC<HexagonGridProps> = ({ map }) => {
  // Цвета для стилей
  const HexColor = 'rgba(51, 153, 204, 0.1)';
  const BorderHexColor = 'rgba(51, 153, 204, 1)';
  const ActHexColor = 'rgba(204, 51, 51, 0.1)';
  const ActBorderHexColor = 'rgba(204, 51, 51, 1)';

  const [vectorLayer] = useState(
    new VectorLayer({
      source: new VectorSource(),
      style: new Style({
        stroke: new Stroke({
          color: BorderHexColor,
          width: 2,
        }),
        fill: new Fill({
          color: HexColor,
        }),
      }),
    })
  );

  const [currentResolution, setCurrentResolution] = useState(0);

  useEffect(() => {
    if (!map) return;

    // Добавляем слой на карту при инициализации компонента
    map.addLayer(vectorLayer);

    const updateGrid = () => {

      const view = map.getView() as View;
      const zoom = view.getZoom() || 10;
      const newResolution = zoomToResolution(zoom);

      //if (newResolution === currentResolution) return;
      setCurrentResolution(newResolution);

      // Получаем границы видимой области
      const extent = map.getView().calculateExtent(map.getSize());

      const polygonCoords = [
        transform([extent[0], extent[1]], 'EPSG:3857', 'EPSG:4326'),
        transform([extent[0], extent[3]], 'EPSG:3857', 'EPSG:4326'),
        transform([extent[2], extent[3]], 'EPSG:3857', 'EPSG:4326'),
        transform([extent[2], extent[1]], 'EPSG:3857', 'EPSG:4326'),
      ];
      polygonCoords.push(polygonCoords[0]); // Замыкаем полигон

      // Генерируем H3-индексы для всей видимой области
      const hexagons = polygonToCells(polygonCoords, currentResolution, true);
      console.log('length:', hexagons.length, 'Resolution', currentResolution); // Выводим число гексов

      // Обновляем источник данных
      const source = vectorLayer.getSource()!;
      source.clear();

      hexagons.forEach((h3Index) => {
        const coords = cellToBoundary(h3Index, true);

        const polygon = coords.map((coord) =>
          transform([coord[0], coord[1]], 'EPSG:4326', 'EPSG:3857')
        );
        polygon.push(polygon[0]); // Замыкаем полигон

        const hexagon = new Feature({
          geometry: new Polygon([polygon]),
          h3Index: h3Index,
        });
        //console.log('Adding hexagon:', hexagon); // Debugging line
        source.addFeature(hexagon);
      });

      //console.log('LayerGroup :', map.getLayerGroup);

    };

    // Инициализация сетки при монтировании компонента
    updateGrid();

    // Обработчики событий
    map.on('moveend', updateGrid);

    // Стиль для выделения
    // Обработчик кликов
    const clickHandler = (event: MapBrowserEvent<UIEvent>) => {
      map.forEachFeatureAtPixel(event.pixel, (feature) => {
        if (!(feature instanceof Feature)) return;

        const isSelected = !feature.get('selected');
        feature.set('selected', isSelected);

        const h3Index = feature.get('h3Index');
        console.log('Clicked:', h3Index); // Выводим индекс

        const newStyle = new Style({
          stroke: new Stroke({
            color: isSelected
              ? ActBorderHexColor // Красный для выбранных
              : BorderHexColor, // Синий по умолчанию
            width: 2,
          }),
          fill: new Fill({
            color: isSelected
              ? ActHexColor // Красный для выбранных
              : HexColor, // Синий по умолчанию
          }),
        });
        feature.setStyle(newStyle);
        vectorLayer.changed();
      });
    };

    map.on('click', clickHandler);

    return () => {
      map.un('moveend', updateGrid);
      map.un('click', clickHandler);
      map.removeLayer(vectorLayer);
    };
  }, [map, currentResolution]);

  return null;
};

export default HexagonGrid;
