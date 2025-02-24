import { useEffect, useState, useRef} from 'react';
import { Vector as VectorLayer } from 'ol/layer';
import { Vector as VectorSource } from 'ol/source';
import { Feature } from 'ol';
import { Polygon } from 'ol/geom';
import { Style, Stroke, Fill } from 'ol/style';
import { transform } from 'ol/proj';
import { cellToBoundary, polygonToCells } from 'h3-js';
import axios from 'axios';
import Overlay from 'ol/Overlay';
import type { Map,  MapBrowserEvent} from 'ol';
import type View from 'ol/View';

interface HexagonGridProps {
  map: Map | null;
}

// Функция сопоставляющая масштаб карты и уровень гексов
const zoomToResolution = (zoom: number): number => {
  const Resolution = Math.min(Math.max(5, Math.floor(zoom*0.8) - 3), 10);
  return Resolution;
};


const HexagonGrid: React.FC<HexagonGridProps> = ({ map }) => {
  //const [polygonInfo, setPolygonInfo] = useState<{[key: string]: any}>({});

  // Функции для API запросов
  const fetchPolygons = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/polygons');
      
      // Конвертируем в словарь
      const polygonsDictionary = response.data.reduce((acc: { [key: string]: any }, polygon: any) => {
        acc[polygon.h3_index] = polygon; // Use h3_index as the key
        return acc;
      }, {});
      
      return polygonsDictionary;
    } catch (error) {
      console.error('Error fetching polygons:', error);
      return { error: 'Failed to fetch polygons' };
    }
  };

  const fetchPolygonInfo = async (h3Index: string) => {
    try {
      // Если уровень 10
      //h3Index = 'fff';

      if(currentResolution == 10){
        const response = await axios.get(`http://localhost:5000/api/polygon/${h3Index}/info`);
        console.log(response);
        return response.data;
      }
      else{
        console.log('индекс', h3Index);
        const response = await axios.get(`http://localhost:5000/api/polygon/${currentResolution}/${h3Index}/info`);
        return response.data;   
      }
    } catch (error) {
      console.error('API Error:', error);
      return {};
    }
  };

  // Цвета для стилей гексов
  const HexColor = 'rgba(51, 153, 204, 0.1)';
  const BorderHexColor = 'rgba(51, 153, 204, 1)';
  const ActHexColor = 'rgba(204, 51, 51, 0.1)';
  const ActBorderHexColor = 'rgba(204, 51, 51, 1)';

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
      width: 5
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
    
    // Стили для попапа
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

      // Сбрасываем попап при каждом обновлении
      popupOverlay.current?.setPosition(undefined);

      const view = map.getView() as View; if (!view){return}
      
      // Получаем зону видимости карты
      const extent = view.calculateExtent(map.getSize());
      const polygonCoords = [
        transform([extent[0], extent[1]], 'EPSG:3857', 'EPSG:4326'),
        transform([extent[0], extent[3]], 'EPSG:3857', 'EPSG:4326'),
        transform([extent[2], extent[3]], 'EPSG:3857', 'EPSG:4326'),
        transform([extent[2], extent[1]], 'EPSG:3857', 'EPSG:4326'),
      ];
      polygonCoords.push(polygonCoords[0]); // Замыкаем полигон
      
      // Получаем масштаб карты
      const zoom = view.getZoom(); if (!zoom){return}

      // Задаем уровень гексов
      const newResolution = zoomToResolution(zoom);
      setCurrentResolution(newResolution);
      
      // Определяем отображаемые гексы
      const hexagons = polygonToCells(polygonCoords, currentResolution, true);
      
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
    };

    // Обновление при первой инициализации
    updateGrid();

    // Выводим всю инфу о всех гексах
    console.log(fetchPolygons());


    const clickHandler = async (event: MapBrowserEvent<UIEvent>) => {

      // Сбрасываем попап при каждом клике
      popupOverlay.current?.setPosition(undefined);

      // Получает гекс, по которому клик
      const feature = map.forEachFeatureAtPixel(event.pixel, (f) => f) as Feature;

      // Сбрасываем другие активные гексы
      const source = vectorLayer.getSource()!;
      source.getFeatures().forEach((item) =>{
        if (feature!=item && item.get('selected')){
          item.set('selected', false);
          item.setStyle(defStyle);
        }
      })
      
      // Если клик вне сетки, выходим
      if (!feature) {return}

      // Меняем состояние гекса
      const isSelected = !feature.get('selected');
      feature.set('selected', isSelected);
      
      // Если стал активен
      if (isSelected){
        // Получаем индекс
        const h3Index = feature.get('h3Index');
        // Получаем ответ по индексу
        const info = fetchPolygonInfo(h3Index);
        // Сетим данные запроса
        //setPolygonInfo(info);

        const geometry = feature.getGeometry() as Polygon;
        const center = geometry.getInteriorPoint().getCoordinates();
        
        const result = await(info); // Получаем данные мз info
        console.log(result);

        // Формируем текст окна    
        const textData = `Resources:
        | Gold: ${result.gold}
        | Wood: ${result.wood}
        | Ore: ${result.ore}`;

        popupRef.current.innerHTML = textData; // Задаем текст


        popupOverlay.current?.setPosition(center);
      }

      // Выводим индекс гекса
      //console.log('h3Index:', feature.get('h3Index'), 'Act:', isSelected);
      
      // Задаем новый стиль гекса
      const newStyle = isSelected ? actStyle : defStyle;
      feature.setStyle(newStyle);
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
  }, [map, currentResolution]);

  return null;
};

export default HexagonGrid;