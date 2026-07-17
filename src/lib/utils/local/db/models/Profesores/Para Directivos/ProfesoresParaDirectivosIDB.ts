import { NivelEducativo } from "@/interfaces/shared/NivelEducativo";
import { SiasisAPIS } from "@/interfaces/shared/SiasisComponents";
import { ProfesoresBaseIDB, IProfesorBaseLocal } from "../ProfesoresBaseIDB";

// ⚠️ Ajusta estas 3 rutas relativas según la carpeta real donde quede este archivo

import { Endpoint_Get_Profesores_Secundaria_API01 } from "@/lib/utils/backend/endpoints/api01/ProfesoresSecundaria";
import {
  GetProfesoresSecundariaAPI01QueryParams,
  AulaQueryParamType,
  ProfesorSecundariaListItem,
  PaginacionInfo,
} from "@/interfaces/shared/apis/api01/profesores-secundaria/types";
import IndexedDBConnection from "../../../IndexedDBConnection";
import UltimaModificacionTablasIDB from "../../UltimaModificacionTablasIDB";
import { EncryptorIDB } from "../../../encryptation/EncryptorIDB";
import { TablasLocal } from "@/interfaces/shared/TablasSistema";

// --------------------------------------------------------------------------------------
//                    INTERFAZ EXTENDIDA (NO MODIFICA IProfesorBaseLocal)
// --------------------------------------------------------------------------------------

/**
 * Extiende IProfesorBaseLocal agregando el aula asignada.
 * Se define aparte para no romper la retrocompatibilidad de módulos
 * que ya consumen IProfesorBaseLocal sin este campo.
 */
export interface IProfesorSecundariaLocalConAula extends IProfesorBaseLocal {
  Aula: Omit<ProfesorSecundariaListItem["Aula"], never> | null;
}

// --------------------------------------------------------------------------------------
//                    FILTROS DE BÚSQUEDA (API PÚBLICA DE ESTA CLASE)
// --------------------------------------------------------------------------------------

/**
 * Filtros "amigables" para el frontend: Grado y Seccion vienen tal cual
 * los produce AulaSelector ("T" o valores concretos), y esta clase se
 * encarga de transformarlos al formato Aula="Grado,Seccion" que espera
 * el backend.
 */
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
//                    REGISTRO DE CACHÉ (LO QUE SE GUARDA ENCRIPTADO EN IDB)
// --------------------------------------------------------------------------------------

interface IBusquedaProfesoresSecundariaCache {
  clave_busqueda: string;
  resultados: ProfesorSecundariaListItem[];
  paginacion: PaginacionInfo;
  ultima_actualizacion: number; // timestamp local de cuándo se guardó este resultado
}

const CANTIDAD_RESULTADOS_POR_PAGINA_DEFAULT = 10;
const CANTIDAD_RESULTADOS_POR_PAGINA_MAXIMA = 100;

export class ProfesoresParaDirectivosIDB extends ProfesoresBaseIDB {
  private nombreTablaCacheSecundaria =
    TablasLocal.Tabla_Busqueda_Profesores_Secundaria_Cache;

  // ======================================================================
  //                    BÚSQUEDA — PROFESORES DE SECUNDARIA
  // ======================================================================

  /**
   * Busca profesores de secundaria con filtros y paginación, usando
   * caché local inteligente: si ya existe un resultado guardado para
   * esta combinación exacta de filtros Y la tabla remota no ha sido
   * modificada desde entonces, se devuelve el caché sin llamar a la API.
   */
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
      const claveBusqueda = this.generarClaveBusquedaSecundaria(queryParams);

      // 1. Intentar desde caché
      const registroCache = await this.obtenerCacheSecundaria(claveBusqueda);

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

      // 2. Caché inexistente o desactualizado -> pedir a la API
      const respuesta =
        await Endpoint_Get_Profesores_Secundaria_API01.realizarPeticion({
          queryParams,
        });

      // 3. Guardar en caché (encriptado)
      const nuevoRegistro: IBusquedaProfesoresSecundariaCache = {
        clave_busqueda: claveBusqueda,
        resultados: respuesta.data,
        paginacion: respuesta.paginacion,
        ultima_actualizacion: Date.now(),
      };

      await this.guardarCacheSecundaria(nuevoRegistro);

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
      return {
        resultados: [],
        paginacion: {
          Pagina_Actual: filtros.Numero_Pagina,
          Cantidad_Resultados_Por_Pagina:
            filtros.Cantidad_Resultados_Por_Pagina ??
            CANTIDAD_RESULTADOS_POR_PAGINA_DEFAULT,
          Total_Resultados: 0,
          Total_Paginas: 1,
        },
      };
    }
  }

  /**
   * Limpia todo el caché de búsquedas de profesores de secundaria.
   * Útil, por ejemplo, justo después de registrar un nuevo profesor,
   * para forzar que la siguiente búsqueda traiga datos frescos.
   */
  public async limpiarCacheBusquedaSecundaria(): Promise<void> {
    try {
      const store = await IndexedDBConnection.getStore(
        this.nombreTablaCacheSecundaria,
        "readwrite",
      );

      return new Promise<void>((resolve, reject) => {
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error("Error al limpiar caché de búsqueda de secundaria:", error);
      throw error;
    }
  }

  // ======================================================================
  //                    BÚSQUEDA — PROFESORES DE PRIMARIA (PENDIENTE)
  // ======================================================================

  /**
   * ⚠️ PENDIENTE: aún no existe el endpoint de búsqueda de profesores
   * de primaria (Endpoint_Get_Profesores_Primaria_API01). Cuando lo
   * creemos, este método seguirá el mismo patrón que
   * buscarProfesoresSecundaria.
   */
  public async buscarProfesoresPrimaria(): Promise<never> {
    throw new Error(
      "buscarProfesoresPrimaria aún no está implementado: falta crear el endpoint " +
        "de backend y el Endpoint_Get_Profesores_Primaria_API01 correspondiente.",
    );
  }

  // ======================================================================
  //                    HELPERS PRIVADOS — SECUNDARIA
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

  private generarClaveBusquedaSecundaria(
    qp: GetProfesoresSecundariaAPI01QueryParams,
  ): string {
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

  /**
   * Valida los parámetros de paginación en el cliente ANTES de golpear
   * la API, replicando las mismas reglas del backend (evita requests
   * inútiles con valores inválidos).
   */
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

  /**
   * Compara la fecha de guardado del caché contra la última modificación
   * remota de la tabla correspondiente al nivel. Mismo mecanismo que
   * UsuariosGenericosIDB.necesitaSincronizacion, pero reutilizando
   * obtenerTablaRemota() ya heredado de ProfesoresBaseIDB.
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

      // Si no hay registro de modificación remota, asumimos que el caché sigue vigente
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
      return true; // Ante la duda, forzar sincronización
    }
  }

  private async obtenerCacheSecundaria(
    claveBusqueda: string,
  ): Promise<IBusquedaProfesoresSecundariaCache | null> {
    try {
      const store = await IndexedDBConnection.getStore(
        this.nombreTablaCacheSecundaria,
      );

      return new Promise<IBusquedaProfesoresSecundariaCache | null>(
        (resolve, reject) => {
          const request = store.get(claveBusqueda);

          request.onsuccess = () => {
            resolve(
              request.result
                ? (EncryptorIDB.decryptThis(
                    request.result,
                  ) as IBusquedaProfesoresSecundariaCache)
                : null,
            );
          };

          request.onerror = () => reject(request.error);
        },
      );
    } catch (error) {
      console.error("Error al obtener caché de búsqueda de secundaria:", error);
      return null;
    }
  }

  private async guardarCacheSecundaria(
    registro: IBusquedaProfesoresSecundariaCache,
  ): Promise<void> {
    try {
      const store = await IndexedDBConnection.getStore(
        this.nombreTablaCacheSecundaria,
        "readwrite",
      );

      return new Promise<void>((resolve, reject) => {
        const request = store.put(EncryptorIDB.encryptThis(registro));

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error("Error al guardar caché de búsqueda de secundaria:", error);
      throw error;
    }
  }
}
