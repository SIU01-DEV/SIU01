import { T_Aulas, T_Profesores_Primaria } from "@prisma/client";
import { Genero } from "../../../Genero";
import { SuccessResponseAPIBase } from "../../types";

export type ProfesorPrimariaListItem = Pick<
  T_Profesores_Primaria,
  | "Id_Profesor_Primaria"
  | "Nombres"
  | "Apellidos"
  | "Estado"
  | "Celular"
  | "Google_Drive_Foto_ID"
> & {
  Aula: Omit<T_Aulas, "Id_Profesor_Primaria" | "Id_Profesor_Secundaria"> | null;
};

export type ProfesorPrimariaSinContraseña = ProfesorPrimariaListItem &
  Pick<T_Profesores_Primaria, "Correo_Electronico" | "Nombre_Usuario"> & {
    Genero: Genero;
  };

// --------------------------------------------------------------------------------------
//                          REGISTRO DE PROFESORES DE PRIMARIA
// --------------------------------------------------------------------------------------

export interface RegistroProfesorPrimariaRequestBody {
  Id_Profesor_Primaria: string;
  Nombres: string;
  Apellidos: string;
  Genero: Genero;
  Celular: string;
  Correo_Electronico?: string;
  Id_Aula?: string;
}

export interface RegistroProfesorPrimariaSuccessResponse extends SuccessResponseAPIBase {
  data: ProfesorPrimariaSinContraseña;
}

// --------------------------------------------------------------------------------------
//                          CONSULTAS DE PROFESORES DE PRIMARIA
// --------------------------------------------------------------------------------------

export type AulaQueryParamType = `${string},${string}`;

export interface GetProfesoresPrimariaAPI01QueryParams {
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

export interface GetProfesoresPrimariaSuccessResponse extends SuccessResponseAPIBase {
  data: ProfesorPrimariaListItem[];
  paginacion: PaginacionInfo;
}

export interface GetProfesorPrimariaSuccessResponse extends SuccessResponseAPIBase {
  data: ProfesorPrimariaSinContraseña;
}

// --------------------------------------------------------------------------------------
//                        ACTUALIZACION DE PROFESORES DE PRIMARIA
// --------------------------------------------------------------------------------------

export interface UpdateProfesorPrimariaRequestBody {
  Nombres?: string;
  Apellidos?: string;
  Genero?: Genero;
  Celular?: string;
  Correo_Electronico?: string;
}

export interface UpdateProfesorPrimariaSuccessResponse extends SuccessResponseAPIBase {
  data: {
    Id_Profesor_Primaria: string;
    Nombres: string;
    Apellidos: string;
    Genero: string;
    Estado: boolean;
    Celular: string;
    Correo_Electronico: string | null;
  };
}

export interface UpdateEstadoProfesorPrimariaRequestBody {
  Estado: boolean;
}

export interface ActualizarEstadoProfesorPrimariaSuccessResponse extends SuccessResponseAPIBase {
  data: {
    Id_Profesor_Primaria: string;
    Nombres: string;
    Apellidos: string;
    Genero: string;
    Estado: boolean;
    Celular: string;
    Correo_Electronico: string | null;
  };
}

export interface ActualizarContraseñaProfesorPrimariaRequestBody {
  NuevaContraseña: string;
}

export interface ActualizarContraseñaProfesorPrimariaSuccessResponse extends SuccessResponseAPIBase {}