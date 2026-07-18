import { NivelEducativo } from "@/interfaces/shared/NivelEducativo";
import { SiasisAPIS } from "@/interfaces/shared/SiasisComponents";
import { ProfesoresBaseIDB, IProfesorBaseLocal } from "../ProfesoresBaseIDB";

import { Endpoint_Get_Profesores_Secundaria_API01 } from "@/lib/utils/backend/endpoints/api01/ProfesoresSecundaria";
import { Endpoint_Get_Profesores_Primaria_API01 } from "@/lib/utils/backend/endpoints/api01/ProfesoresPrimaria";

import {
  GetProfesoresSecundariaAPI01QueryParams,
  AulaQueryParamType,
  ProfesorSecundariaListItem,
  PaginacionInfo,
} from "@/interfaces/shared/apis/api01/profesores-secundaria/types";

import {
  GetProfesoresPrimariaAPI01QueryParams,
  ProfesorPrimariaListItem,
} from "@/interfaces/shared/apis/api01/profesores-primaria/types";

import IndexedDBConnection from "../../../IndexedDBConnection";
import UltimaModificacionTablasIDB from "../../UltimaModificacionTablasIDB";
import { EncryptorIDB } from "../../../encryptation/EncryptorIDB";
import { TablasLocal } from "@/interfaces/shared/TablasSistema";

// --------------------------------------------------------------------------------------
//                    INTERFACES EXTENDIDAS (NO MODIFICAN IProfesorBaseLocal)
// --------------------------------------------------------------------------------------

export interface IProfesorSecundariaLocalConAula extends IProfesorBaseLocal {
  Aula: Omit<ProfesorSecundariaListItem["Aula"], never> | null;
}

export interface IProfesorPrimariaLocalConAula extends IProfesorBaseLocal {
  Aula: Omit<ProfesorPrimariaListItem["Aula"], never> | null;
}

// --------------------------------------------------------------------------------------
//                    FILTROS DE BÚSQUEDA — SECUNDARIA
// --------------------------------------------------------------------------------------

export interface FiltrosBusquedaProfesorSecundaria {
  Identificador?: string;
  Nombres?: string;
  Apellidos?: string;
  SinAula?: boolean;
  Grado?: string; // "T" o "1".."5"
  Seccion?: string; // "T" o "A".."Z"
  Numero_Pagina: number;
  Cantidad_Resultados_Por_Pagina?: number;
}

export interface ResultadoBusquedaProfesoresSecundaria {
  resultados: ProfesorSecundariaListItem[];
  paginacion: PaginacionInfo;
}

// --------------------------------------------------------------------------------------
//                    FILTROS DE BÚSQUEDA — PRIMARIA
// --------------------------------------------------------------------------------------

export interface FiltrosBusquedaProfesorPrimaria {
  Identificador?: string;
  Nombres?: string;
  Apellidos?: string;
  SinAula?: boolean;
  Grado?: string; // "T" o "1".."6" (primaria tiene 6 grados)
  Seccion?: string; // "T" o "A".."Z"
  Numero_Pagina: number;
  Cantidad_Resultados_Por_Pagina?: number;
}

export interface ResultadoBusquedaProfesoresPrimaria {
  resultados: ProfesorPrimariaListItem[];
  paginacion: PaginacionInfo;
}

// --------------------------------------------------------------------------------------
//                    REGISTROS DE CACHÉ (LO QUE SE GUARDA ENCRIPTADO EN IDB)
// --------------------------------------------------------------------------------------

interface IBusquedaProfesoresSecundariaCache {
  clave_busqueda: string;
  resultados: ProfesorSecundariaListItem[];
  paginacion: PaginacionInfo;
  ultima_actualizacion: number;
}

interface IBusquedaProfesoresPrimariaCache {
  clave_busqueda: string;
  resultados: ProfesorPrimariaListItem[];
  paginacion: PaginacionInfo;
  ultima_actualizacion: number;
}

const CANTIDAD_RESULTADOS_POR_PAGINA_DEFAULT = 10;
const CANTIDAD_RESULTADOS_POR_PAGINA_MAXIMA = 100;

export class ProfesoresParaDirectivosIDB extends ProfesoresBaseIDB {
  private nombreTablaCacheSecundaria =
    TablasLocal.Tabla_Busqueda_Profesores_Secundaria_Cache;

  private nombreTablaCachePrimaria =
    TablasLocal.Tabla_Busqueda_Profesores_Primaria_Cache;

  // ======================================================================
  //                    BÚSQUEDA — PROFESORES DE SECUNDARIA
  // ======================================================================

  public async buscarProfesoresSecundaria(
    filtros: FiltrosBusquedaProfesorSecundaria,
  ): Promise<ResultadoBusquedaProfesoresSecundaria> {
    this.setIsSomethingLoading?.(true);
    this.setError?.(null);
    this.setSuccessMessage?.(null);

    try {
      this.validarPaginacion(
        filtros.Numero_Pagina,
        filtros.Cantidad_Resultados_Por_Pagina,
      );

      const queryParams = this.construirQueryParamsSecundaria(filtros);
      const claveBusqueda = this.generarClaveBusqueda(queryParams);

      const registroCache =
        await this.obtenerCache<IBusquedaProfesoresSecundariaCache>(
          this.nombreTablaCacheSecundaria,
          claveBusqueda,
        );

      if (registroCache) {
        const necesitaSync = await this.necesitaSincronizarCache(
          NivelEducativo.SECUNDARIA,
          registroCache.ultima_actualizacion,
        );

        if (!necesitaSync) {
          this.handleSuccess(
            `Se encontraron ${registroCache.resultados.length} profesores de secundaria (desde caché)`,
          );
          this.setIsSomethingLoading?.(false);
          return {
            resultados: registroCache.resultados,
            paginacion: registroCache.paginacion,
          };
        }
      }

      const respuesta =
        await Endpoint_Get_Profesores_Secundaria_API01.realizarPeticion({
          queryParams,
        });

      const nuevoRegistro: IBusquedaProfesoresSecundariaCache = {
        clave_busqueda: claveBusqueda,
        resultados: respuesta.data,
        paginacion: respuesta.paginacion,
        ultima_actualizacion: Date.now(),
      };

      await this.guardarCache(this.nombreTablaCacheSecundaria, nuevoRegistro);

      this.handleSuccess(
        `Se encontraron ${respuesta.data.length} profesores de secundaria`,
      );
      this.setIsSomethingLoading?.(false);

      return {
        resultados: respuesta.data,
        paginacion: respuesta.paginacion,
      };
    } catch (error) {
      this.handleIndexedDBError(error, "buscar profesores de secundaria");
      this.setIsSomethingLoading?.(false);
      return this.resultadoVacio(
        filtros.Numero_Pagina,
        filtros.Cantidad_Resultados_Por_Pagina,
      );
    }
  }

  public async limpiarCacheBusquedaSecundaria(): Promise<void> {
    await this.limpiarCache(this.nombreTablaCacheSecundaria);
  }

  // ======================================================================
  //                    BÚSQUEDA — PROFESORES DE PRIMARIA
  // ======================================================================

  public async buscarProfesoresPrimaria(
    filtros: FiltrosBusquedaProfesorPrimaria,
  ): Promise<ResultadoBusquedaProfesoresPrimaria> {
    this.setIsSomethingLoading?.(true);
    this.setError?.(null);
    this.setSuccessMessage?.(null);

    try {
      this.validarPaginacion(
        filtros.Numero_Pagina,
        filtros.Cantidad_Resultados_Por_Pagina,
      );

      const queryParams = this.construirQueryParamsPrimaria(filtros);
      const claveBusqueda = this.generarClaveBusqueda(queryParams);

      const registroCache =
        await this.obtenerCache<IBusquedaProfesoresPrimariaCache>(
          this.nombreTablaCachePrimaria,
          claveBusqueda,
        );

      if (registroCache) {
        const necesitaSync = await this.necesitaSincronizarCache(
          NivelEducativo.PRIMARIA,
          registroCache.ultima_actualizacion,
        );

        if (!necesitaSync) {
          this.handleSuccess(
            `Se encontraron ${registroCache.resultados.length} profesores de primaria (desde caché)`,
          );
          this.setIsSomethingLoading?.(false);
          return {
            resultados: registroCache.resultados,
            paginacion: registroCache.paginacion,
          };
        }
      }

      const respuesta =
        await Endpoint_Get_Profesores_Primaria_API01.realizarPeticion({
          queryParams,
        });

      const nuevoRegistro: IBusquedaProfesoresPrimariaCache = {
        clave_busqueda: claveBusqueda,
        resultados: respuesta.data,
        paginacion: respuesta.paginacion,
        ultima_actualizacion: Date.now(),
      };

      await this.guardarCache(this.nombreTablaCachePrimaria, nuevoRegistro);

      this.handleSuccess(
        `Se encontraron ${respuesta.data.length} profesores de primaria`,
      );
      this.setIsSomethingLoading?.(false);

      return {
        resultados: respuesta.data,
        paginacion: respuesta.paginacion,
      };
    } catch (error) {
      this.handleIndexedDBError(error, "buscar profesores de primaria");
      this.setIsSomethingLoading?.(false);
      return this.resultadoVacio(
        filtros.Numero_Pagina,
        filtros.Cantidad_Resultados_Por_Pagina,
      );
    }
  }

  public async limpiarCacheBusquedaPrimaria(): Promise<void> {
    await this.limpiarCache(this.nombreTablaCachePrimaria);
  }

  // ======================================================================
  //                    HELPERS PRIVADOS COMPARTIDOS
  // ======================================================================

  private construirQueryParamsSecundaria(
    filtros: FiltrosBusquedaProfesorSecundaria,
  ): GetProfesoresSecundariaAPI01QueryParams {
    return {
      Identificador: filtros.Identificador?.trim() ?? "",
      Nombres: filtros.Nombres?.trim() ?? "",
      Apellidos: filtros.Apellidos?.trim() ?? "",
      SinAula: filtros.SinAula ?? false,
      Aula: `${filtros.Grado ?? "T"},${
        filtros.Seccion ?? "T"
      }` as AulaQueryParamType,
      Numero_Pagina: filtros.Numero_Pagina,
      Cantidad_Resultados_Por_Pagina: filtros.Cantidad_Resultados_Por_Pagina,
    };
  }

  private construirQueryParamsPrimaria(
    filtros: FiltrosBusquedaProfesorPrimaria,
  ): GetProfesoresPrimariaAPI01QueryParams {
    return {
      Identificador: filtros.Identificador?.trim() ?? "",
      Nombres: filtros.Nombres?.trim() ?? "",
      Apellidos: filtros.Apellidos?.trim() ?? "",
      SinAula: filtros.SinAula ?? false,
      Aula: `${filtros.Grado ?? "T"},${
        filtros.Seccion ?? "T"
      }` as AulaQueryParamType,
      Numero_Pagina: filtros.Numero_Pagina,
      Cantidad_Resultados_Por_Pagina: filtros.Cantidad_Resultados_Por_Pagina,
    };
  }

  /**
   * Genera la clave de caché a partir de cualquier objeto de query params
   * que tenga la forma común (Identificador, Nombres, Apellidos, SinAula,
   * Aula, Numero_Pagina, Cantidad_Resultados_Por_Pagina). Sirve tanto para
   * primaria como para secundaria porque ambos comparten esta forma.
   */
  private generarClaveBusqueda(qp: {
    Identificador: string;
    Nombres: string;
    Apellidos: string;
    SinAula: boolean;
    Aula: string;
    Numero_Pagina: number;
    Cantidad_Resultados_Por_Pagina?: number;
  }): string {
    return [
      qp.Identificador.trim().toLowerCase(),
      qp.Nombres.trim().toLowerCase(),
      qp.Apellidos.trim().toLowerCase(),
      qp.SinAula ? "1" : "0",
      qp.Aula,
      qp.Numero_Pagina,
      qp.Cantidad_Resultados_Por_Pagina ?? "default",
    ].join("|");
  }

  private validarPaginacion(
    numeroPagina: number,
    cantidadResultadosPorPagina?: number,
  ): void {
    if (!Number.isInteger(numeroPagina)) {
      throw new Error("Numero_Pagina debe ser un número entero");
    }
    if (numeroPagina === 0) {
      throw new Error(
        "No existe la página 0. La numeración de páginas inicia en 1",
      );
    }
    if (numeroPagina < 0) {
      throw new Error("Numero_Pagina no puede ser negativo");
    }

    if (cantidadResultadosPorPagina !== undefined) {
      if (!Number.isInteger(cantidadResultadosPorPagina)) {
        throw new Error(
          "Cantidad_Resultados_Por_Pagina debe ser un número entero",
        );
      }
      if (cantidadResultadosPorPagina === 0) {
        throw new Error("Cantidad_Resultados_Por_Pagina no puede ser 0");
      }
      if (cantidadResultadosPorPagina < 0) {
        throw new Error("Cantidad_Resultados_Por_Pagina no puede ser negativa");
      }
      if (cantidadResultadosPorPagina > CANTIDAD_RESULTADOS_POR_PAGINA_MAXIMA) {
        throw new Error(
          `Cantidad_Resultados_Por_Pagina no puede superar ${CANTIDAD_RESULTADOS_POR_PAGINA_MAXIMA}`,
        );
      }
    }
  }

  private resultadoVacio(
    numeroPagina: number,
    cantidadResultadosPorPagina?: number,
  ) {
    return {
      resultados: [],
      paginacion: {
        Pagina_Actual: numeroPagina,
        Cantidad_Resultados_Por_Pagina:
          cantidadResultadosPorPagina ?? CANTIDAD_RESULTADOS_POR_PAGINA_DEFAULT,
        Total_Resultados: 0,
        Total_Paginas: 1,
      },
    };
  }

  /**
   * Compara la fecha de guardado del caché contra la última modificación
   * remota de la tabla correspondiente al nivel.
   */
  private async necesitaSincronizarCache(
    nivel: NivelEducativo,
    ultimaActualizacionCache: number,
  ): Promise<boolean> {
    try {
      const tablaRemota = this.obtenerTablaRemota(nivel);
      const ultimaModificacion = await new UltimaModificacionTablasIDB(
        this.siasisAPI,
      ).getByTabla(tablaRemota);

      if (!ultimaModificacion) {
        return false;
      }

      const fechaModificacionRemota = new Date(
        ultimaModificacion.Fecha_Modificacion,
      ).getTime();

      return ultimaActualizacionCache < fechaModificacionRemota;
    } catch (error) {
      console.error(
        "Error al verificar si el caché de búsqueda necesita actualizarse:",
        error,
      );
      return true;
    }
  }

  private async obtenerCache<T>(
    nombreTabla: string,
    claveBusqueda: string,
  ): Promise<T | null> {
    try {
      const store = await IndexedDBConnection.getStore(nombreTabla);

      return new Promise<T | null>((resolve, reject) => {
        const request = store.get(claveBusqueda);

        request.onsuccess = () => {
          resolve(
            request.result
              ? (EncryptorIDB.decryptThis(request.result) as T)
              : null,
          );
        };

        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error(`Error al obtener caché de ${nombreTabla}:`, error);
      return null;
    }
  }

  private async guardarCache<T extends { clave_busqueda: string }>(
    nombreTabla: string,
    registro: T,
  ): Promise<void> {
    try {
      const store = await IndexedDBConnection.getStore(
        nombreTabla,
        "readwrite",
      );

      return new Promise<void>((resolve, reject) => {
        const request = store.put(EncryptorIDB.encryptThis(registro));

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error(`Error al guardar caché de ${nombreTabla}:`, error);
      throw error;
    }
  }

  private async limpiarCache(nombreTabla: string): Promise<void> {
    try {
      const store = await IndexedDBConnection.getStore(
        nombreTabla,
        "readwrite",
      );

      return new Promise<void>((resolve, reject) => {
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error(`Error al limpiar caché de ${nombreTabla}:`, error);
      throw error;
    }
  }
}
