// src/components/HexagonGrid.jsx
import { useEffect } from 'react';
import { Vector as VectorLayer } from 'ol/layer';
import { Vector as VectorSource } from 'ol/source';
import { Feature } from 'ol';
import { Polygon } from 'ol/geom';
import { Style, Stroke, Fill } from 'ol/style';
import { transform } from 'ol/proj';
import { cellToLatLng, cellToBoundary, latLngToCell, gridDisk } from 'h3-js';

const HexagonGrid = ({ map }) => {
  useEffect(() => {
    if (!map) return;

    const HexColor = 'rgba(51, 153, 204, 0.4)'
    const BorderHexColor = 'rgba(24, 69, 92, 0.5)'
    const ActHexColor = 'rgba(255, 0, 0, 0.4)'
    const ActBorderHexColor = 'rgba(130, 0, 0, 0.5)'


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
      zIndex: 1000
    });

    // Параметры
    const resolution = 5; // Размер
    const gridRadius = 10; // Радиус

    // Координаты центра (Москва)
    const centerMoscow3857 = [4180709, 7506893]; // EPSG:3857
    const centerMoscow4326 = transform(
      centerMoscow3857, 
      'EPSG:3857', 
      'EPSG:4326'
    );

    // Исправленный порядок координат (lat, lng)
    const centerCell = latLngToCell(
      centerMoscow4326[1], // Широта (latitude)
      centerMoscow4326[0], // Долгота (longitude)
      resolution
    );
    
    const hexCells = gridDisk(centerCell, gridRadius);
    console.log('Generated cells:', hexCells.length);

    hexCells.forEach((h3Index) => {
      const coords = cellToBoundary(h3Index, true); // [ [lng, lat], ... ]
      
      // Правильное преобразование координат
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
    const clickHandler = (event) => {
      map.forEachFeatureAtPixel(event.pixel, (feature) => {
        
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