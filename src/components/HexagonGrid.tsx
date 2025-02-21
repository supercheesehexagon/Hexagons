import { useEffect, useState, useRef } from 'react';
import { Vector as VectorLayer } from 'ol/layer';
import { Vector as VectorSource } from 'ol/source';
import { Feature } from 'ol';
import { Polygon } from 'ol/geom';
import { Style, Stroke, Fill } from 'ol/style';
import { transform } from 'ol/proj';
import { cellToBoundary, polygonToCells } from 'h3-js';
import Overlay from 'ol/Overlay';
import type { Map,  MapBrowserEvent} from 'ol';
import type View from 'ol/View';

interface HexagonGridProps {
  map: Map | null;
}

// Функция сопоставляющая масштаб карты и уровень гексов
const zoomToResolution = (zoom: number): number => {
  return Math.round(Math.min(Math.max(zoom - 8, 5), 10));
};


const HexagonGrid: React.FC<HexagonGridProps> = ({ map }) => {
  // Цвета для стилей гексов
  const HexColor = 'rgba(51, 153, 204, 0.1)';
  const BorderHexColor = 'rgba(51, 153, 204, 1)';
  const ActHexColor = 'rgba(204, 51, 51, 0.1)';
  const ActBorderHexColor = 'rgba(204, 51, 51, 1)';

  // Начальный стиль гексов
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

  // Актуальный уровень гексов
  const [currentResolution, setCurrentResolution] = useState(0);

  useEffect(() => {
    if (!map) return;

    // Добавляем слой
    map.addLayer(vectorLayer);

    const updateGrid = () => {

      // Получаем масштаб карты
      const view = map.getView() as View;
      const zoom = view.getZoom() || 10;

      // Задаем уровень гексов
      const newResolution = zoomToResolution(zoom);
      setCurrentResolution(newResolution);
      
      // Получаем зону видимости карты
      const extent = map.getView().calculateExtent(map.getSize());
      const polygonCoords = [
        transform([extent[0], extent[1]], 'EPSG:3857', 'EPSG:4326'),
        transform([extent[0], extent[3]], 'EPSG:3857', 'EPSG:4326'),
        transform([extent[2], extent[3]], 'EPSG:3857', 'EPSG:4326'),
        transform([extent[2], extent[1]], 'EPSG:3857', 'EPSG:4326'),
      ];
      polygonCoords.push(polygonCoords[0]); // Замыкаем полигон

      // Определяем отображаемые гексы гексов
      const hexagons = polygonToCells(polygonCoords, currentResolution, true);
      
      const source = vectorLayer.getSource()!;
      source.clear();

      // Формируем гексы
      hexagons.forEach((h3Index) => {

        // Получаем вершины гекса
        const coords = cellToBoundary(h3Index, true);

        // Преобразуем в плоскость
        const polygon = coords.map((coord) =>
          transform([coord[0], coord[1]], 'EPSG:4326', 'EPSG:3857')
        );
        polygon.push(polygon[0]); // Замыкаем полигон

        // Создаем фигуру
        const hexagon = new Feature({
          geometry: new Polygon([polygon]),
          h3Index: h3Index,
        });

        // Добавляем в состав слоя
        source.addFeature(hexagon);
      });
    };

    // Обновление при первой инициализации
    updateGrid();

    const clickHandler = (event: MapBrowserEvent<UIEvent>) => {

      // Получает гекс, по которому клик
      const feature = map.forEachFeatureAtPixel(event.pixel, (f) => f) as Feature;
      if (!feature) {return}

      // Выводим индекс гекса
      console.log('h3Index:', feature.get('h3Index'));

      // Меняем состояние гекса
      const isSelected = !feature.get('selected');
      feature.set('selected', isSelected);
     
      // Задаем новый стиль гекса
      const newStyle = new Style({
        stroke: new Stroke({
          color: isSelected ? ActBorderHexColor : BorderHexColor,
          width: 2,
        }),
        fill: new Fill({
          color: isSelected ? ActHexColor : HexColor,
        }),
      });
      feature.setStyle(newStyle);
    };

    // Инициализация событий
    map.on('moveend', updateGrid);
    map.on('click', clickHandler);

    // Отчистка при выходе
    return () => {
      map.un('moveend', updateGrid);
      map.un('click', clickHandler);
      map.removeLayer(vectorLayer);
    };
  }, [map, currentResolution]);

  return null;
};

export default HexagonGrid;