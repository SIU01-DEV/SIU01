import { NivelEducativo } from "@/interfaces/shared/NivelEducativo";
import { TablasLocal, TablasRemoto } from "@/interfaces/shared/TablasSistema";
import { SiasisAPIS } from "@/interfaces/shared/SiasisComponents";
import {
  ErrorResponseAPIBase,
  MessageProperty,
} from "@/interfaces/shared/apis/types";
import AllErrorTypes, {
  SystemErrorTypes,
  DataConflictErrorTypes,
  UserErrorTypes,
} from "@/interfaces/shared/errors";
import { AsistenciaDateHelper } from "../utils/AsistenciaDateHelper";
import IndexedDBConnection from "../../IndexedDBConnection";
import UltimaModificacionTablasIDB from "../UltimaModificacionTablasIDB";

// Interfaz base para profesores (campos mínimos accesibles por todos los roles)
export interface IProfesorBaseLocal {
  // Campos específicos por nivel
  Id_Profesor_Primaria?: string; // Solo para primaria
  Id_Profesor_Secundaria?: string; // Solo para secundaria

  // Campos comunes
  Nombres: string;
  Apellidos: string;
  Genero: string;
  Google_Drive_Foto_ID?: string | null;
  Celular: string;

  // Campo de sincronización
  ultima_fecha_actualizacion: number;
}

// Resultado de operaciones
export interface ProfesorOperationResult {
  success: boolean;
  message: string;
  data?: any;
  count?: number;
}

// Mapeo de nivel a tabla local
const MAPEO_TABLA_PROFESORES: Record<NivelEducativo, TablasLocal> = {
  [NivelEducativo.PRIMARIA]: TablasLocal.Tabla_Profesores_Primaria,
  [NivelEducativo.SECUNDARIA]: TablasLocal.Tabla_Profesores_Secundaria,
};

// Mapeo de nivel a tabla remota (para sincronización)
const MAPEO_TABLA_REMOTA_PROFESORES: Record<NivelEducativo, TablasRemoto> = {
  [NivelEducativo.PRIMARIA]: TablasRemoto.Tabla_Profesores_Primaria,
  [NivelEducativo.SECUNDARIA]: TablasRemoto.Tabla_Profesores_Secundaria,
};

/**
 * Clase base para el manejo de profesores en IndexedDB.
 * Mantiene solo los métodos genéricos y de bajo nivel que son
 * reutilizados por las clases hijas especializadas por rol
 * (ProfesoresParaResponsablesIDB, ProfesoresParaDirectivosIDB, etc.).
 *
 * La lógica de negocio específica de cada rol (búsquedas, caché de
 * resultados, endpoints particulares) vive en las clases hijas.
 */
export class ProfesoresBaseIDB {
  protected dateHelper: AsistenciaDateHelper;

  constructor(
    protected siasisAPI: SiasisAPIS = "API01",
    protected setIsSomethingLoading?: (isLoading: boolean) => void,
    protected setError?: (error: ErrorResponseAPIBase | null) => void,
    protected setSuccessMessage?: (message: MessageProperty | null) => void
  ) {
    this.dateHelper = new AsistenciaDateHelper();
  }

  // =====================================================================================
  // MÉTODOS DE MAPEO Y UTILIDADES
  // =====================================================================================

  /**
   * Obtiene el nombre de la tabla correspondiente según el nivel
   */
  protected obtenerNombreTabla(nivel: NivelEducativo): TablasLocal {
    const tabla = MAPEO_TABLA_PROFESORES[nivel];
    if (!tabla) {
      throw new Error(`No se encontró tabla para nivel ${nivel}`);
    }
    return tabla;
  }

  /**
   * Obtiene el nombre de la tabla remota para sincronización
   */
  protected obtenerTablaRemota(nivel: NivelEducativo): TablasRemoto {
    const tabla = MAPEO_TABLA_REMOTA_PROFESORES[nivel];
    if (!tabla) {
      throw new Error(`No se encontró tabla remota para nivel ${nivel}`);
    }
    return tabla;
  }

  /**
   * Genera la clave según el nivel del profesor
   */
  protected generarClaveProfesor(
    idProfesor: string,
    nivel: NivelEducativo
  ): string {
    // La clave es simplemente el ID del profesor, pero se almacena en la tabla correspondiente al nivel
    return idProfesor;
  }

  // =====================================================================================
  // MÉTODOS DE SINCRONIZACIÓN
  // =====================================================================================

  /**
   * Verifica si necesita sincronización comparando con la última modificación remota
   */
  protected async necesitaSincronizacion(
    nivel: NivelEducativo
  ): Promise<boolean> {
    try {
      const tablaRemota = this.obtenerTablaRemota(nivel);
      const ultimaModificacionIDB = new UltimaModificacionTablasIDB(
        this.siasisAPI
      );
      const ultimaModificacion = await ultimaModificacionIDB.getByTabla(
        tablaRemota
      );

      if (!ultimaModificacion) {
        return false; // Si no hay registro de modificación, no sincronizar
      }

      // Verificar si hay registros locales
      const registrosLocales = await this.obtenerTodosLosProfesores(nivel);
      if (registrosLocales.length === 0) {
        return true; // No hay datos locales, necesita sincronización inicial
      }

      // Buscar el registro con la última actualización local
      const ultimaActualizacionLocal = Math.max(
        ...registrosLocales.map((r) => r.ultima_fecha_actualizacion)
      );

      const fechaModificacionRemota = new Date(
        ultimaModificacion.Fecha_Modificacion
      ).getTime();

      return ultimaActualizacionLocal < fechaModificacionRemota;
    } catch (error) {
      console.error("Error al verificar sincronización:", error);
      return true; // En caso de error, mejor sincronizar
    }
  }

  // =====================================================================================
  // MÉTODOS CRUD BÁSICOS
  // =====================================================================================

  /**
   * Obtiene un profesor específico por ID y nivel
   */
  public async obtenerProfesorPorId(
    idProfesor: string,
    nivel: NivelEducativo
  ): Promise<IProfesorBaseLocal | null> {
    try {
      const nombreTabla = this.obtenerNombreTabla(nivel);
      const store = await IndexedDBConnection.getStore(nombreTabla);
      const clave = this.generarClaveProfesor(idProfesor, nivel);

      return new Promise<IProfesorBaseLocal | null>((resolve, reject) => {
        const request = store.get(clave);

        request.onsuccess = () => {
          resolve(request.result || null);
        };

        request.onerror = () => {
          reject(request.error);
        };
      });
    } catch (error) {
      this.handleIndexedDBError(error, `obtener profesor ${idProfesor}`);
      return null;
    }
  }

  /**
   * Obtiene todos los profesores de un nivel específico
   */
  public async obtenerTodosLosProfesores(
    nivel: NivelEducativo
  ): Promise<IProfesorBaseLocal[]> {
    try {
      const nombreTabla = this.obtenerNombreTabla(nivel);
      const store = await IndexedDBConnection.getStore(nombreTabla);

      return new Promise<IProfesorBaseLocal[]>((resolve, reject) => {
        const request = store.getAll();

        request.onsuccess = () => {
          resolve(request.result as IProfesorBaseLocal[]);
        };

        request.onerror = () => {
          reject(request.error);
        };
      });
    } catch (error) {
      this.handleIndexedDBError(
        error,
        `obtener todos los profesores de ${nivel}`
      );
      return [];
    }
  }

  /**
   * Guarda o actualiza un profesor
   */
  public async guardarProfesor(
    profesor: Omit<IProfesorBaseLocal, "ultima_fecha_actualizacion">,
    nivel: NivelEducativo
  ): Promise<ProfesorOperationResult> {
    try {
      const nombreTabla = this.obtenerNombreTabla(nivel);
      const store = await IndexedDBConnection.getStore(
        nombreTabla,
        "readwrite"
      );

      // Agregar timestamp actual
      const profesorCompleto: IProfesorBaseLocal = {
        ...profesor,
        ultima_fecha_actualizacion: this.dateHelper.obtenerTimestampPeruano(),
      };

      return new Promise<ProfesorOperationResult>((resolve, reject) => {
        const request = store.put(profesorCompleto);

        request.onsuccess = () => {
          resolve({
            success: true,
            message: "Profesor guardado exitosamente",
            data: profesorCompleto,
          });
        };

        request.onerror = () => {
          reject(request.error);
        };
      });
    } catch (error) {
      this.handleIndexedDBError(error, "guardar profesor");
      return {
        success: false,
        message: `Error al guardar profesor: ${
          error instanceof Error ? error.message : "Error desconocido"
        }`,
      };
    }
  }

  // =====================================================================================
  // MÉTODOS DE UTILIDAD Y MANEJO DE ERRORES
  // =====================================================================================

  /**
   * Establece un mensaje de éxito
   */
  protected handleSuccess(message: string, data?: any): void {
    const successResponse: MessageProperty = { message };
    this.setSuccessMessage?.(successResponse);
  }

  /**
   * Maneja los errores de operaciones con IndexedDB
   */
  protected handleIndexedDBError(error: unknown, operacion: string): void {
    console.error(`Error en operación IndexedDB (${operacion}):`, error);

    let errorType: AllErrorTypes = SystemErrorTypes.UNKNOWN_ERROR;
    let message = `Error al ${operacion}`;

    if (error instanceof Error) {
      if (error.name === "ConstraintError") {
        errorType = DataConflictErrorTypes.VALUE_ALREADY_IN_USE;
        message = `Error de restricción al ${operacion}: valor duplicado`;
      } else if (error.name === "NotFoundError") {
        errorType = UserErrorTypes.USER_NOT_FOUND;
        message = `No se encontró el recurso al ${operacion}`;
      } else if (error.name === "QuotaExceededError") {
        errorType = SystemErrorTypes.DATABASE_ERROR;
        message = `Almacenamiento excedido al ${operacion}`;
      } else if (error.name === "TransactionInactiveError") {
        errorType = SystemErrorTypes.DATABASE_ERROR;
        message = `Transacción inactiva al ${operacion}`;
      } else {
        message = error.message || message;
      }
    }

    this.setError?.({
      success: false,
      message: message,
      errorType: errorType,
      details: {
        origen: "ProfesoresBaseIDB",
        timestamp: Date.now(),
      },
    });
  }
}