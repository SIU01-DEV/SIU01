// Vamos a probar con varios puntos para demostrar la función

import { POLIGONO_DELIMITADOR } from "@/Assets/geolocation/POLIGONO_DELIMITADOR";
import { PuntoGeografico } from "@/interfaces/Geolocalizacion";
import { isPointInPolygon } from "./isPointInPolygon";

// 1. Un punto que debería estar DENTRO del polígono (cerca del centro)
const pointInside: PuntoGeografico = {
  latitud: -13.056628,
  longitud: -76.347088,
};

// 2. Un punto que debería estar FUERA del polígono (alejado)
const pointOutside: PuntoGeografico = {
  latitud: -13.0571,
  longitud: -76.3475,
};

// 3. Un punto en el borde del polígono (en el vértice E)
const pointOnBorder: PuntoGeografico = {
  latitud: -13.056497,
  longitud: -76.346668,
};

// 4. Un punto cercano al borde pero dentro
const pointNearBorder: PuntoGeografico = {
  latitud: -13.05653,
  longitud: -76.34725,
};

export function estaDentroDelColegioIE20935(
  punto: PuntoGeografico
): boolean {
  return isPointInPolygon(punto, POLIGONO_DELIMITADOR);
} 


console.log(
  "Punto 1 (dentro del centro):",
  isPointInPolygon(pointInside, POLIGONO_DELIMITADOR) ? "DENTRO" : "FUERA"
);
console.log(
  "Punto 2 (alejado):",
  isPointInPolygon(pointOutside, POLIGONO_DELIMITADOR) ? "DENTRO" : "FUERA"
);
console.log(
  "Punto 3 (en el vértice E):",
  isPointInPolygon(pointOnBorder, POLIGONO_DELIMITADOR) ? "DENTRO" : "FUERA"
);
console.log(
  "Punto 4 (cerca del borde):",
  isPointInPolygon(pointNearBorder, POLIGONO_DELIMITADOR) ? "DENTRO" : "FUERA"
);
