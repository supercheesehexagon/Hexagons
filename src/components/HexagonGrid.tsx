// src/components/HexagonGrid.jsx
import { useEffect } from 'react';
import { Vector as VectorLayer } from 'ol/layer';
import { Vector as VectorSource } from 'ol/source';
import { Feature } from 'ol';
import { Polygon } from 'ol/geom';
import { Style, Stroke, Fill } from 'ol/style';

const HexagonGrid = ({ map }) => {
  useEffect(() => {
    if (!map) return;

    // Создаем векторный слой
    const vectorSource = new VectorSource();
    const vectorLayer = new VectorLayer({
      source: vectorSource,
      style: new Style({
        stroke: new Stroke({
          color: '#3399CC',
          width: 2
        }),
        fill: new Fill({
          color: 'rgba(51, 153, 204, 0.2)'
        })
      })
    });

    // Параметры сетки
    const radius = 50000; // Радиус шестиугольника в метрах
    const startX = 4180709; // Начальная координата X (Москва)
    const startY = 7506893; // Начальная координата Y
    const r_frid = 4; // Радиус сетки
    const rows = 5;
    const cols = 5;

  // Генерация шестиугольников
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const sx = radius * 1.5;
      const sy = radius * (Math.sqrt(3)/2)
      const x = startX + sx * row;
      const y = startY + sy * col * 2 + row % 2 * sy;;
      //const x = startX + col * radius * 1.5; // Определяем координату X
      //const yOffset = row % 2 === 0 ? 0 : radius; // Сдвиг по Y для четных/нечетных рядов
      //const y = startY + row * radius * Math.sqrt(3) + yOffset; // Определяем координату Y

      // Создание геометрии шестиугольника
      const coordinates = [];
      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI) / 3; // Угол для каждого из 6 углов шестиугольника
        const dx = radius * Math.cos(angle); // Смещение по X
        const dy = radius * Math.sin(angle); // Смещение по Y
        coordinates.push([x + dx, y + dy]); // Добавляем координаты углов шестиугольника
      }
      coordinates.push(coordinates[0]); // Замыкаем полигон

      const hexagon = new Feature({
        geometry: new Polygon([coordinates]),
        id: `hex-${row}-${col}`
      });

      vectorSource.addFeature(hexagon); // Добавляем шестиугольник в векторный источник
    }
  }

    // Добавляем слой на карту
    map.addLayer(vectorLayer);

    // Обработка кликов
    const clickHandler = (event) => {
      const features = map.getFeaturesAtPixel(event.pixel);
      if (features.length > 0) {
        const feature = features[0];
        console.log('Clicked hexagon:', feature.get('id'));
        // Можно добавить дополнительную логику при клике
      }
    };

    map.on('click', clickHandler);

    // Очистка
    return () => {
      map.removeLayer(vectorLayer);
      map.un('click', clickHandler);
    };
  }, [map]);

  return null;
};

export default HexagonGrid;