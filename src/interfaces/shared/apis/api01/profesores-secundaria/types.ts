import { T_Aulas, T_Profesores_Secundaria } from "@prisma/client";
import { Genero } from "../../../Genero";
import { SuccessResponseAPIBase } from "../../types";

export type ProfesorSecundariaListItem = Pick<
  T_Profesores_Secundaria,
  | "Id_Profesor_Secundaria"
  | "Nombres"
  | "Apellidos"
  | "Estado"
  | "Celular"
  | "Google_Drive_Foto_ID"
> & {
  Aula: Omit<T_Aulas, "Id_Profesor_Primaria" | "Id_Profesor_Secundaria"> | null;
};

export type ProfesorSecundariaSinContraseña = ProfesorSecundariaListItem &
  Pick<T_Profesores_Secundaria, "Correo_Electronico" | "Nombre_Usuario"> & {
    Genero: Genero;
  };

// --------------------------------------------------------------------------------------
//                          REGISTRO DE PROFESORES DE SECUNDARIA
// --------------------------------------------------------------------------------------

export interface RegistroProfesorSecundariaRequestBody {
  Id_Profesor_Secundaria: string;
  Nombres: string;
  Apellidos: string;
  Genero: Genero;
  Celular: string;
  Correo_Electronico?: string;
  Id_Aula?: string;
}

export interface RegistroProfesorSecundariaSuccessResponse extends SuccessResponseAPIBase {
  data: ProfesorSecundariaSinContraseña;
}

// --------------------------------------------------------------------------------------
//                          CONSULTAS DE PROFESORES DE SECUNDARIA
// --------------------------------------------------------------------------------------

export type AulaQueryParamType = `${string},${string}`;

export interface GetProfesoresSecundariaAPI01QueryParams {
  Identificador: string;
  Nombres: string;
  Apellidos: string;
  SinAula: boolean;
  Aula: AulaQueryParamType;
  Numero_Pagina: number;
  Cantidad_Resultados_Por_Pagina?: number;
}

export interface PaginacionInfo {
  Pagina_Actual: number;
  Cantidad_Resultados_Por_Pagina: number;
  Total_Resultados: number;
  Total_Paginas: number;
}

export interface GetProfesoresSecundariaSuccessResponse extends SuccessResponseAPIBase {
  data: ProfesorSecundariaListItem[];
  paginacion: PaginacionInfo;
}

export interface GetProfesorSecundariaSuccessResponse extends SuccessResponseAPIBase {
  data: ProfesorSecundariaSinContraseña;
}

// --------------------------------------------------------------------------------------
//                        ACTUALIZACION DE PROFESORES DE SECUNDARIA
// --------------------------------------------------------------------------------------

export interface UpdateProfesorSecundariaRequestBody {
  Nombres?: string;
  Apellidos?: string;
  Genero?: Genero;
  Celular?: string;
  Correo_Electronico?: string;
}

export interface UpdateProfesorSecundariaSuccessResponse extends SuccessResponseAPIBase {
  data: {
    Id_Profesor_Secundaria: string;
    Nombres: string;
    Apellidos: string;
    Genero: string;
    Estado: boolean;
    Celular: string;
    Correo_Electronico: string | null;
  };
}

export interface UpdateEstadoProfesorSecundariaRequestBody {
  Estado: boolean;
}

export interface ActualizarEstadoProfesorSecundariaSuccessResponse extends SuccessResponseAPIBase {
  data: {
    Id_Profesor_Secundaria: string;
    Nombres: string;
    Apellidos: string;
    Genero: string;
    Estado: boolean;
    Celular: string;
    Correo_Electronico: string | null;
  };
}

export interface ActualizarContraseñaProfesorSecundariaRequestBody {
  NuevaContraseña: string;
}

export interface ActualizarContraseñaProfesorSecundariaSuccessResponse extends SuccessResponseAPIBase {}
