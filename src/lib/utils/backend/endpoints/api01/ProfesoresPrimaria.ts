import {
  GetProfesoresPrimariaAPI01QueryParams,
  GetProfesoresPrimariaSuccessResponse,
} from "@/interfaces/shared/apis/api01/profesores-primaria/types";
import { EndpointSiasis } from "../EndpointSiasis";

function formatearQueryParamsProfesoresPrimaria(
  params: GetProfesoresPrimariaAPI01QueryParams,
): string {
  const searchParams = new URLSearchParams();

  // Solo se agregan si tienen contenido real (evita "Identificador=" vacío)
  if (params.Identificador && params.Identificador.trim() !== "") {
    searchParams.set("Identificador", params.Identificador.trim());
  }

  if (params.Nombres && params.Nombres.trim() !== "") {
    searchParams.set("Nombres", params.Nombres.trim());
  }

  if (params.Apellidos && params.Apellidos.trim() !== "") {
    searchParams.set("Apellidos", params.Apellidos.trim());
  }

  // SinAula solo se envía si es true (false es el comportamiento por defecto del backend)
  if (params.SinAula === true) {
    searchParams.set("SinAula", "true");
  }

  // Aula solo se envía si NO es "T,T" (osea, si realmente se está filtrando algo)
  if (params.Aula && params.Aula !== "T,T") {
    searchParams.set("Aula", params.Aula);
  }

  // Numero_Pagina es obligatorio según tu interfaz, siempre se envía
  searchParams.set("Numero_Pagina", String(params.Numero_Pagina));

  // Cantidad_Resultados_Por_Pagina es opcional
  if (params.Cantidad_Resultados_Por_Pagina !== undefined) {
    searchParams.set(
      "Cantidad_Resultados_Por_Pagina",
      String(params.Cantidad_Resultados_Por_Pagina),
    );
  }

  return searchParams.toString();
}

export const Endpoint_Get_Profesores_Primaria_API01 = new EndpointSiasis<
  "/api/profesores-primaria",
  GetProfesoresPrimariaSuccessResponse,
  GetProfesoresPrimariaAPI01QueryParams
>({
  siasisApi: "API01",
  metodoHttp: "GET",
  ruta: "/api/profesores-primaria",
  queryParamsFormatter: formatearQueryParamsProfesoresPrimaria,
});
