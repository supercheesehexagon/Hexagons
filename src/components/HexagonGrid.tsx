import { useEffect, useState, useRef} from 'react';
import { Vector as VectorLayer } from 'ol/layer';
import { Vector as VectorSource } from 'ol/source';
import { Feature } from 'ol';
import { Polygon } from 'ol/geom';
import { Style, Stroke, Fill } from 'ol/style';
import { transform } from 'ol/proj';
import { cellToBoundary, getHexagonEdgeLengthAvg, polygonToCells} from 'h3-js';
import axios from 'axios';
import Overlay from 'ol/Overlay';
import type { Map,  MapBrowserEvent} from 'ol';
import type View from 'ol/View';

interface HexagonGridProps {
  map: Map | null;
}

// Параметры для запросов
const HOST = "localhost";
const PORT = 5000;

// Функция сопоставляющая масштаб карты и уровень гексов
const zoomToResolution = (zoom: number): number => {
  const Resolution = Math.min(Math.max(5, Math.floor(zoom*0.8) - 3), 10);
  return Resolution;
};


const HexagonGrid: React.FC<HexagonGridProps> = ({ map }) => {

  // Функции для API запросов
  const fetchPolygonInfo = async (h3Index: string) => {
    try {
      // Если уровень 10
      if(currentResolution == 10){
        const response = await axios.get(`http://${HOST}:${PORT}/api/polygon/${h3Index}/info`);
        return response.data;
      }
      else{
        const response = await axios.get(`http://${HOST}:${PORT}/api/polygon/${currentResolution}/${h3Index}/info`);
        return response.data;   
      }
    } catch (error) {
      console.error('API Error', error);
      return {};
    }
  };

  // Цвета для стилей гексов
  const HexColor = 'rgba(51, 153, 204, 0.1)';
  const BorderHexColor = 'rgba(51, 153, 204, 1)';
  const ActHexColor = 'rgba(204, 51, 51, 0.5)';
  const ActBorderHexColor = 'rgba(204, 51, 51, 0)';

  // Стандартный стиль
  const defStyle = new Style({
    stroke: new Stroke({
      color: BorderHexColor,
      width: 2,
    }),
    fill: new Fill({
      color: HexColor,
    }),
  });
    
  // Активный стиль
  const actStyle = new Style({
    stroke: new Stroke({
      color: ActBorderHexColor,
      width: 3
    }),
    fill: new Fill({
      color: ActHexColor,
    }),
  });

  // Создаем слой для сетки
  const [vectorLayer] = useState(
    new VectorLayer({
      source: new VectorSource(),
      style: defStyle,
    })
  );

  // Актуальный уровень гексов
  const [currentResolution, setCurrentResolution] = useState(10);
  // Выделенные гекс
  const [selectedH3Index, setSelectedH3Index] = useState<string | null>(null); // Состояние для выбранного шестиугольника
  // Добавляем ссылки для попапа
  const popupRef = useRef<HTMLDivElement>(document.createElement('div'));
  const popupOverlay = useRef<Overlay>(null) ;
  
  useEffect(() => {
    if (!map) return;
    // Инициализация попапа
    popupOverlay.current = new Overlay({
      element: popupRef.current,
      positioning: 'bottom-center',
      offset: [0, -15],
      autoPan: false,
    });
    
    // Стиль для попапа
    popupRef.current.style.background = 'rgba(255, 255, 255, 1)';
    popupRef.current.style.padding = '70px';
    popupRef.current.style.border = '3px solid #333';
    popupRef.current.style.borderRadius = '40px';
    popupRef.current.style.boxShadow = '0 20px 40px rgba(0,0,0,0.2)';

    
    // Добавляем попап
    map.addOverlay(popupOverlay.current);

    // Добавляем слой
    map.addLayer(vectorLayer);

    // Обновление сетки
    const updateGrid = () => {

      //console.log('SelectedH3Index', selectedH3Index);
      // Сбрасываем попап при каждом обновлении
      popupOverlay.current?.setPosition(undefined);

      // Получаем зону видимости карты
      const view = map.getView() as View; if (!view){return}
      const extent = view.calculateExtent(map.getSize()); if (!extent){return}
      const zoom = view.getZoom(); if (!zoom){return}

      // Задаем уровень гексов
      const newResolution = zoomToResolution(zoom);
      setCurrentResolution(newResolution);

      // Получаем размер гексов в метрах
      const hexSizeMeters = getHexagonEdgeLengthAvg(newResolution, 'm');
      
      // Берем дважды для уверенности
      const buffer = hexSizeMeters * 2;
      
      // Расширяем поле видимости
      const expandedExtent = [
        extent[0] - buffer,
        extent[1] - buffer,
        extent[2] + buffer,
        extent[3] + buffer
      ];

      const polygonCoords = [
        transform([expandedExtent[0], expandedExtent[1]], 'EPSG:3857', 'EPSG:4326'),
        transform([expandedExtent[0], expandedExtent[3]], 'EPSG:3857', 'EPSG:4326'),
        transform([expandedExtent[2], expandedExtent[3]], 'EPSG:3857', 'EPSG:4326'),
        transform([expandedExtent[2], expandedExtent[1]], 'EPSG:3857', 'EPSG:4326'),
      ];
      polygonCoords.push(polygonCoords[0]); // Замыкаем полигон
      
      // Определяем отображаемые гексы
      const hexagons = polygonToCells(polygonCoords, newResolution, true);
      
      // Получаем начинку слоя
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

      // Если есть выбранный шестиугольник, обновляем попап
      //console.log('SelectedH3Index', selectedH3Index);
      if (selectedH3Index) {
        const selectedFeature = source.getFeatures().find(f => f.get('h3Index') === selectedH3Index);
        if (selectedFeature) {

          const geometry = selectedFeature.getGeometry() as Polygon;
          const center = geometry.getInteriorPoint().getCoordinates();
          popupOverlay.current?.setPosition(center);
          selectedFeature.setStyle(actStyle);
        }
      }
    };

    // Событие клика
    const clickHandler = async (event: MapBrowserEvent<UIEvent>) => {

      // Получает гекс, по которому клик
      const feature = map.forEachFeatureAtPixel(event.pixel, (f) => f) as Feature;
     
      const source = vectorLayer.getSource()!;

      // Сбрасываем другие активные гексы
      source.getFeatures().forEach((item) =>{
        if (feature!=item){
          item.set('selected', false);
          item.setStyle(defStyle);
        }
      })
      
      // Если клик не по гексу, выходим
      if (!feature) {
        return
      }
      
      // Меняем состояние гекса
      if (feature.get('h3Index') == selectedH3Index){
        feature.set('selected', true);
      }

      const isSelected = !feature.get('selected');
      feature.set('selected', isSelected);

      //console.log('SelectedH3Index', selectedH3Index);

      // Если стал активен
      if (isSelected){
        // Получаем индекс
        const h3Index = feature.get('h3Index');
        setSelectedH3Index(h3Index); 

        // Получаем ответ по индексу
        const info = fetchPolygonInfo(h3Index);
        const result = await(info);
        console.log(result);

        // Формируем текст окна    
        const textData = `Resources:
        | Gold: ${result.gold}
        | Wood: ${result.wood}
        | Ore: ${result.ore}`;
        popupRef.current.innerHTML = textData;

        // Получаем корды для попапа
        const geometry = feature.getGeometry() as Polygon;
        const center = geometry.getInteriorPoint().getCoordinates();
        popupOverlay.current?.setPosition(center);
        feature.setStyle(actStyle);
      }else{
        setSelectedH3Index(null);
        popupOverlay.current?.setPosition(undefined);
        feature.setStyle(defStyle)
      }      
      //console.log(selectedH3Index);
    };

    // Инициализация событий
    map.on('moveend', updateGrid);
    map.on('click', clickHandler);

    // Отчистка при выходе
    return () => {
      popupOverlay.current && map.removeOverlay(popupOverlay.current);
      map.un('moveend', updateGrid);
      map.un('click', clickHandler);
      map.removeLayer(vectorLayer);
    };
  }, [map, currentResolution, selectedH3Index]);

  return null;
};

export default HexagonGrid;