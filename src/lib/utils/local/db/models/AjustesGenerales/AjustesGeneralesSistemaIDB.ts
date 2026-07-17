import IndexedDBConnection from "@/constants/singleton/IndexedDBConnection";
import {
  TablasSistema,
  ITablaInfo,
  TablasLocal,
} from "@/interfaces/shared/TablasSistema";
import {
  ErrorResponseAPIBase,
  MessageProperty,
} from "@/interfaces/shared/apis/types";
import AllErrorTypes, {
  DataConflictErrorTypes,
  SystemErrorTypes,
  UserErrorTypes,
} from "@/interfaces/shared/errors";
import { SiasisAPIS } from "@/interfaces/shared/SiasisComponents";
import comprobarSincronizacionDeTabla from "@/lib/helpers/validations/comprobarSincronizacionDeTabla";
import { DatabaseModificationOperations } from "@/interfaces/shared/DatabaseModificationOperations";
import ultimaActualizacionTablasLocalesIDB from "../UltimaActualizacionTablasLocalesIDB";
import { EncryptorIDB } from "../../encryptation/EncryptorIDB";



// Enum de nombres de ajustes generales
export enum AjustesGeneralesSistema {
  TOLERANCIA_TARDANZA_MINUTOS_PRIMARIA = "TOLERANCIA_TARDANZA_MINUTOS_PRIMARIA",
  TOLERANCIA_TARDANZA_MINUTOS_SECUNDARIA = "TOLERANCIA_TARDANZA_MINUTOS_SECUNDARIA",
  ENVIAR_CORREO_REPORTE_ESCOLAR_TARDANZAS_CONSECUTIVAS_DIRECTIVOS = "ENVIAR_CORREO_REPORTE_ESCOLAR_TARDANZAS_CONSECUTIVAS_DIRECTIVOS",
  ENVIAR_CORREO_REPORTE_ESCOLAR_FALTAS_CONSECUTIVAS_DIRECTIVOS = "ENVIAR_CORREO_REPORTE_ESCOLAR_FALTAS_CONSECUTIVAS_DIRECTIVOS",
  ENVIAR_CORREO_REPORTE_ESCOLAR_TARDANZAS_CONSECUTIVAS_TUTORES_SECUNDARIA = "ENVIAR_CORREO_REPORTE_ESCOLAR_TARDANZAS_CONSECUTIVAS_TUTORES_SECUNDARIA",
  ENVIAR_CORREO_REPORTE_ESCOLAR_FALTAS_CONSECUTIVAS_TUTORES_SECUNDARIA = "ENVIAR_CORREO_REPORTE_ESCOLAR_FALTAS_CONSECUTIVAS_TUTORES_SECUNDARIA",
  ENVIAR_CORREO_REPORTE_ESCOLAR_TARDANZAS_CONSECUTIVAS_PROFESOR_PRIMARIA = "ENVIAR_CORREO_REPORTE_ESCOLAR_TARDANZAS_CONSECUTIVAS_PROFESOR_PRIMARIA",
  ENVIAR_CORREO_REPORTE_ESCOLAR_FALTAS_CONSECUTIVAS_PROFESOR_PRIMARIA = "ENVIAR_CORREO_REPORTE_ESCOLAR_FALTAS_CONSECUTIVAS_PROFESOR_PRIMARIA",
  TARDANZAS_CONSECUTIVAS_MAXIMAS_ALERTA_ESTUDIANTES_PRIMARIA = "TARDANZAS_CONSECUTIVAS_MAXIMAS_ALERTA_ESTUDIANTES_PRIMARIA",
  FALTAS_CONSECUTIVAS_MAXIMAS_ALERTA_ESTUDIANTES_PRIMARIA = "FALTAS_CONSECUTIVAS_MAXIMAS_ALERTA_ESTUDIANTES_PRIMARIA",
  TARDANZAS_CONSECUTIVAS_MAXIMAS_ALERTA_ESTUDIANTES_SECUNDARIA = "TARDANZAS_CONSECUTIVAS_MAXIMAS_ALERTA_ESTUDIANTES_SECUNDARIA",
  FALTAS_CONSECUTIVAS_MAXIMAS_ALERTA_ESTUDIANTES_SECUNDARIA = "FALTAS_CONSECUTIVAS_MAXIMAS_ALERTA_ESTUDIANTES_SECUNDARIA",
  ENVIAR_CORREO_REPORTE_ESCOLAR_TARDANZAS_CONSECUTIVAS_AUXILIARES = "ENVIAR_CORREO_REPORTE_ESCOLAR_TARDANZAS_CONSECUTIVAS_AUXILIARES",
  ENVIAR_CORREO_REPORTE_ESCOLAR_FALTAS_CONSECUTIVAS_AUXILIARES = "ENVIAR_CORREO_REPORTE_ESCOLAR_FALTAS_CONSECUTIVAS_AUXILIARES",
  DURACION_HORA_ACADEMICA_MINUTOS = "DURACION_HORA_ACADEMICA_MINUTOS",
}

// Tipo para la entidad Ajuste General del Sistema
export interface IAjusteGeneralSistemaLocal {
  Id_Constante: number;
  Nombre: string;
  Valor: string;
  Descripcion: string;
  Ultima_Modificacion: string; // DateTime en formato ISO string
}

export interface IAjusteGeneralFilter {
  Id_Constante?: number;
  Nombre?: AjustesGeneralesSistema;
}

export class AjustesGeneralesSistemaIDB {
  private tablaInfo: ITablaInfo = TablasSistema.AJUSTES_SISTEMA;
  private nombreTablaLocal: string =
    this.tablaInfo.nombreLocal || "ajustes_generales_sistema";

  constructor(
    private siasisAPI: SiasisAPIS = "API01",
    private setIsSomethingLoading?: (isLoading: boolean) => void,
    private setError?: (error: ErrorResponseAPIBase | null) => void,
    private setSuccessMessage?: (message: MessageProperty | null) => void
  ) {}

  /**
   * Método de sincronización que se ejecutará al inicio de cada operación
   */
  private async sync(): Promise<void> {
    try {
      const debeSincronizar = await comprobarSincronizacionDeTabla(
        this.tablaInfo,
        this.siasisAPI
      );

      if (!debeSincronizar) {
        return;
      }

      await this.fetchYActualizarAjustesGenerales();
    } catch (error) {
      console.error(
        "Error durante la sincronización de ajustes generales:",
        error
      );
      this.handleIndexedDBError(error, "sincronizar ajustes generales");
    }
  }

  /**
   * Obtiene los ajustes generales desde la API y los actualiza localmente
   * @returns Promise que se resuelve cuando los ajustes han sido actualizados
   */
  private async fetchYActualizarAjustesGenerales(): Promise<void> {
    try {
      // ⚠️ Descomenta cuando tengas el endpoint
      // const { data: ajustes } =
      //   await Endpoint_Get_Ajustes_Generales_API01.realizarPeticion();

      // ⚠️ TEMPORAL - Simula datos del servidor
      const ajustes: IAjusteGeneralSistemaLocal[] = [];

      const result = await this.upsertFromServer(ajustes);

      await ultimaActualizacionTablasLocalesIDB.registrarActualizacion(
        this.tablaInfo.nombreLocal as TablasLocal,
        DatabaseModificationOperations.UPDATE
      );

      console.log(
        `Sincronización de ajustes generales completada: ${ajustes.length} ajustes procesados (${result.created} creados, ${result.updated} actualizados, ${result.deleted} eliminados, ${result.errors} errores)`
      );
    } catch (error) {
      console.error("Error al obtener y actualizar ajustes generales:", error);

      let errorType: AllErrorTypes = SystemErrorTypes.UNKNOWN_ERROR;
      let message = "Error al sincronizar ajustes generales";

      if (error instanceof Error) {
        if (
          error.message.includes("network") ||
          error.message.includes("fetch")
        ) {
          errorType = SystemErrorTypes.EXTERNAL_SERVICE_ERROR;
          message = "Error de red al sincronizar ajustes generales";
        } else if (error.message.includes("obtener ajustes")) {
          errorType = SystemErrorTypes.EXTERNAL_SERVICE_ERROR;
          message = error.message;
        } else if (
          error.name === "TransactionInactiveError" ||
          error.name === "QuotaExceededError"
        ) {
          errorType = SystemErrorTypes.DATABASE_ERROR;
          message =
            "Error de base de datos al sincronizar ajustes generales";
        } else {
          message = error.message;
        }
      }

      this.setError?.({
        success: false,
        message: message,
        errorType: errorType,
        details: {
          origen: "AjustesGeneralesSistemaIDB.fetchYActualizarAjustesGenerales",
          timestamp: Date.now(),
        },
      });

      throw error;
    }
  }

  /**
   * Obtiene todos los ajustes generales del sistema
   * @returns Promesa con el array de ajustes
   * @Postcondition El resultado estará desencriptado
   */
  public async getAll(): Promise<IAjusteGeneralSistemaLocal[]> {
    this.setIsSomethingLoading?.(true);
    this.setError?.(null);
    this.setSuccessMessage?.(null);

    try {
      await this.sync();

      const store = await IndexedDBConnection.getStore(this.nombreTablaLocal);

      const result = await new Promise<IAjusteGeneralSistemaLocal[]>(
        (resolve, reject) => {
          const request = store.getAll();

          request.onsuccess = () =>
            resolve(
              EncryptorIDB.decryptThis(
                request.result
              ) as IAjusteGeneralSistemaLocal[]
            );
          request.onerror = () => reject(request.error);
        }
      );

      if (result.length > 0) {
        this.handleSuccess(
          `Se encontraron ${result.length} ajustes generales`
        );
      } else {
        this.handleSuccess("No se encontraron ajustes generales");
      }

      this.setIsSomethingLoading?.(false);
      return result;
    } catch (error) {
      this.handleIndexedDBError(error, "obtener lista de ajustes generales");
      this.setIsSomethingLoading?.(false);
      return [];
    }
  }

  /**
   * Obtiene todos los IDs de ajustes almacenados localmente
   * @returns Promise con array de IDs
   * @Postcondition El resultado estará desencriptado
   */
  private async getAllIds(): Promise<number[]> {
    try {
      const store = await IndexedDBConnection.getStore(this.nombreTablaLocal);

      return new Promise<number[]>((resolve, reject) => {
        const ids: number[] = [];
        const request = store.openCursor();

        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest)
            .result as IDBCursorWithValue;
          if (cursor) {
            ids.push(cursor.value.Id_Constante);
            cursor.continue();
          } else {
            resolve(EncryptorIDB.decryptThis(ids));
          }
        };

        request.onerror = () => {
          reject(request.error);
        };
      });
    } catch (error) {
      console.error("Error al obtener todos los IDs de ajustes:", error);
      throw error;
    }
  }

  /**
   * Elimina un ajuste por su ID
   * @Precondition El parámetro no estará encriptado
   * @param id ID del ajuste a eliminar
   * @returns Promise<void>
   */
  private async deleteById(id: number): Promise<void> {
    try {
      const store = await IndexedDBConnection.getStore(
        this.nombreTablaLocal,
        "readwrite"
      );

      return new Promise<void>((resolve, reject) => {
        const request = store.delete(EncryptorIDB.encryptThis(id));

        request.onsuccess = () => {
          resolve();
        };

        request.onerror = () => {
          reject(request.error);
        };
      });
    } catch (error) {
      console.error(`Error al eliminar ajuste con ID ${id}:`, error);
      throw error;
    }
  }

  /**
   * Actualiza o crea ajustes en lote desde el servidor
   * También elimina registros que ya no existen en el servidor
   * @Precondition Los parámetros no estarán encriptados
   * @param ajustesServidor Ajustes provenientes del servidor
   * @returns Conteo de operaciones: creados, actualizados, eliminados, errores
   */
  private async upsertFromServer(
    ajustesServidor: IAjusteGeneralSistemaLocal[]
  ): Promise<{
    created: number;
    updated: number;
    deleted: number;
    errors: number;
  }> {
    const result = { created: 0, updated: 0, deleted: 0, errors: 0 };

    try {
      const idsLocales = await this.getAllIds();
      const idsServidor = new Set(
        ajustesServidor.map((ajuste) => ajuste.Id_Constante)
      );

      const idsAEliminar = idsLocales.filter((id) => !idsServidor.has(id));

      for (const id of idsAEliminar) {
        try {
          await this.deleteById(id);
          result.deleted++;
        } catch (error) {
          console.error(`Error al eliminar ajuste ${id}:`, error);
          result.errors++;
        }
      }

      const BATCH_SIZE = 20;

      for (let i = 0; i < ajustesServidor.length; i += BATCH_SIZE) {
        const lote = ajustesServidor.slice(i, i + BATCH_SIZE);

        for (const ajusteServidor of lote) {
          try {
            const existeAjuste = await this.getById(
              ajusteServidor.Id_Constante
            );

            const store = await IndexedDBConnection.getStore(
              this.nombreTablaLocal,
              "readwrite"
            );

            await new Promise<void>((resolve, reject) => {
              const request = store.put(
                EncryptorIDB.encryptThis(ajusteServidor)
              );

              request.onsuccess = () => {
                if (existeAjuste) {
                  result.updated++;
                } else {
                  result.created++;
                }
                resolve();
              };

              request.onerror = () => {
                result.errors++;
                console.error(
                  `Error al guardar ajuste ${ajusteServidor.Id_Constante}:`,
                  request.error
                );
                reject(request.error);
              };
            });
          } catch (error) {
            result.errors++;
            console.error(
              `Error al procesar ajuste ${ajusteServidor.Id_Constante}:`,
              error
            );
          }
        }

        await new Promise((resolve) => setTimeout(resolve, 0));
      }

      return result;
    } catch (error) {
      console.error("Error en la operación upsertFromServer:", error);
      result.errors++;
      return result;
    }
  }

  /**
   * Obtiene un ajuste por su ID
   * @Precondition El parámetro no estará encriptado
   * @param id ID del ajuste
   * @returns Ajuste encontrado o null
   * @Postcondition El resultado estará desencriptado
   */
  public async getById(
    id: number
  ): Promise<IAjusteGeneralSistemaLocal | null> {
    try {
      const store = await IndexedDBConnection.getStore(this.nombreTablaLocal);

      return new Promise<IAjusteGeneralSistemaLocal | null>(
        (resolve, reject) => {
          const request = store.get(EncryptorIDB.encryptThis(id));

          request.onsuccess = () => {
            resolve(EncryptorIDB.decryptThis(request.result) || null);
          };

          request.onerror = () => {
            reject(request.error);
          };
        }
      );
    } catch (error) {
      console.error(`Error al obtener ajuste con ID ${id}:`, error);
      this.handleIndexedDBError(error, `obtener ajuste con ID ${id}`);
      return null;
    }
  }

  /**
   * Obtiene un ajuste por su nombre usando el enum (único)
   * @Detail La propiedad "Nombre" está indexada como única
   * @param nombre Nombre del ajuste del enum AjustesGeneralesSistema
   * @returns Ajuste encontrado o null
   * @Postcondition El resultado estará desencriptado
   */
  public async getByNombre(
    nombre: AjustesGeneralesSistema
  ): Promise<IAjusteGeneralSistemaLocal | null> {
    try {
      const store = await IndexedDBConnection.getStore(this.nombreTablaLocal);
      const index = store.index("por_nombre");

      return new Promise<IAjusteGeneralSistemaLocal | null>(
        (resolve, reject) => {
          const request = index.get(nombre);

          request.onsuccess = () => {
            resolve(EncryptorIDB.decryptThis(request.result) || null);
          };

          request.onerror = () => {
            reject(request.error);
          };
        }
      );
    } catch (error) {
      console.error(`Error al obtener ajuste con nombre ${nombre}:`, error);
      this.handleIndexedDBError(
        error,
        `obtener ajuste con nombre ${nombre}`
      );
      return null;
    }
  }

  /**
   * Obtiene el valor de un ajuste por su nombre del enum
   * Método de conveniencia para obtener directamente el valor
   * @param nombre Nombre del ajuste del enum
   * @returns Valor del ajuste o null si no existe
   */
  public async getValorByNombre(
    nombre: AjustesGeneralesSistema
  ): Promise<string | null> {
    try {
      const ajuste = await this.getByNombre(nombre);
      return ajuste?.Valor || null;
    } catch (error) {
      console.error(`Error al obtener valor del ajuste ${nombre}:`, error);
      return null;
    }
  }

  /**
   * Obtiene el valor numérico de un ajuste
   * @param nombre Nombre del ajuste del enum
   * @returns Valor numérico del ajuste o null si no existe o no es numérico
   */
  public async getValorNumericoByNombre(
    nombre: AjustesGeneralesSistema
  ): Promise<number | null> {
    try {
      const valor = await this.getValorByNombre(nombre);
      if (valor === null) return null;

      const numeroParseado = Number(valor);
      return isNaN(numeroParseado) ? null : numeroParseado;
    } catch (error) {
      console.error(
        `Error al obtener valor numérico del ajuste ${nombre}:`,
        error
      );
      return null;
    }
  }

  /**
   * Obtiene el valor booleano de un ajuste (ACTIVADO/DESACTIVADO)
   * @param nombre Nombre del ajuste del enum
   * @returns true si es "ACTIVADO", false si es "DESACTIVADO", null si no existe
   */
  public async getValorBooleanoByNombre(
    nombre: AjustesGeneralesSistema
  ): Promise<boolean | null> {
    try {
      const valor = await this.getValorByNombre(nombre);
      if (valor === null) return null;

      if (valor === "ACTIVADO") return true;
      if (valor === "DESACTIVADO") return false;

      return null;
    } catch (error) {
      console.error(
        `Error al obtener valor booleano del ajuste ${nombre}:`,
        error
      );
      return null;
    }
  }

  /**
   * Actualiza el valor de un ajuste existente (solo local)
   * @Precondition Los parámetros no estarán encriptados
   * @param nombre Nombre del ajuste a actualizar del enum
   * @param nuevoValor Nuevo valor para el ajuste
   * @returns true si se actualizó correctamente, false en caso contrario
   */
  public async updateValorByNombre(
    nombre: AjustesGeneralesSistema,
    nuevoValor: string
  ): Promise<boolean> {
    try {
      const ajusteExistente = await this.getByNombre(nombre);

      if (!ajusteExistente) {
        this.setError?.({
          success: false,
          message: `No se encontró el ajuste con nombre: ${nombre}`,
          errorType: UserErrorTypes.USER_NOT_FOUND,
        });
        return false;
      }

      const ajusteActualizado: IAjusteGeneralSistemaLocal = {
        ...ajusteExistente,
        Valor: nuevoValor,
        Ultima_Modificacion: new Date().toISOString(),
      };

      const store = await IndexedDBConnection.getStore(
        this.nombreTablaLocal,
        "readwrite"
      );

      await new Promise<void>((resolve, reject) => {
        const request = store.put(EncryptorIDB.encryptThis(ajusteActualizado));

        request.onsuccess = () => {
          this.handleSuccess(
            `Ajuste '${nombre}' actualizado correctamente a: ${nuevoValor}`
          );
          resolve();
        };

        request.onerror = () => {
          reject(request.error);
        };
      });

      return true;
    } catch (error) {
      this.handleIndexedDBError(error, `actualizar ajuste ${nombre}`);
      return false;
    }
  }

  /**
   * Obtiene múltiples ajustes por sus nombres del enum
   * @param nombres Array de nombres de ajustes del enum
   * @returns Objeto con los ajustes encontrados (clave: nombre, valor: ajuste completo)
   */
  public async getMultipleByNombres(
    nombres: AjustesGeneralesSistema[]
  ): Promise<Record<string, IAjusteGeneralSistemaLocal>> {
    const ajustes: Record<string, IAjusteGeneralSistemaLocal> = {};

    try {
      for (const nombre of nombres) {
        const ajuste = await this.getByNombre(nombre);
        if (ajuste) {
          ajustes[nombre] = ajuste;
        }
      }

      return ajustes;
    } catch (error) {
      console.error("Error al obtener múltiples ajustes:", error);
      return ajustes;
    }
  }

  /**
   * Obtiene múltiples valores de ajustes por sus nombres del enum
   * Método de conveniencia que devuelve solo los valores
   * @param nombres Array de nombres de ajustes del enum
   * @returns Objeto con los valores (clave: nombre, valor: string)
   */
  public async getMultipleValoresByNombres(
    nombres: AjustesGeneralesSistema[]
  ): Promise<Record<string, string>> {
    const valores: Record<string, string> = {};

    try {
      const ajustes = await this.getMultipleByNombres(nombres);

      for (const [nombre, ajuste] of Object.entries(ajustes)) {
        valores[nombre] = ajuste.Valor;
      }

      return valores;
    } catch (error) {
      console.error("Error al obtener múltiples valores:", error);
      return valores;
    }
  }

  /**
   * Obtiene las tolerancias de tardanza para primaria y secundaria
   * @returns Objeto con las tolerancias en minutos
   */
  public async getToleranciasTardanza(): Promise<{
    primaria: number | null;
    secundaria: number | null;
  }> {
    const primaria = await this.getValorNumericoByNombre(
      AjustesGeneralesSistema.TOLERANCIA_TARDANZA_MINUTOS_PRIMARIA
    );
    const secundaria = await this.getValorNumericoByNombre(
      AjustesGeneralesSistema.TOLERANCIA_TARDANZA_MINUTOS_SECUNDARIA
    );

    return { primaria, secundaria };
  }

  /**
   * Obtiene la configuración de notificaciones por correo para un rol específico
   * @param rol "DIRECTIVOS" | "TUTORES_SECUNDARIA" | "PROFESOR_PRIMARIA" | "AUXILIARES"
   * @returns Objeto con la configuración de notificaciones
   */
  public async getConfiguracionNotificacionesPorRol(
    rol: "DIRECTIVOS" | "TUTORES_SECUNDARIA" | "PROFESOR_PRIMARIA" | "AUXILIARES"
  ): Promise<{
    tardanzasConsecutivas: boolean | null;
    faltasConsecutivas: boolean | null;
  }> {
    const tardanzasKey = `ENVIAR_CORREO_REPORTE_ESCOLAR_TARDANZAS_CONSECUTIVAS_${rol}` as AjustesGeneralesSistema;
    const faltasKey = `ENVIAR_CORREO_REPORTE_ESCOLAR_FALTAS_CONSECUTIVAS_${rol}` as AjustesGeneralesSistema;

    const tardanzasConsecutivas = await this.getValorBooleanoByNombre(
      tardanzasKey
    );
    const faltasConsecutivas = await this.getValorBooleanoByNombre(faltasKey);

    return { tardanzasConsecutivas, faltasConsecutivas };
  }

  /**
   * Obtiene los máximos de alertas consecutivas para estudiantes
   * @returns Objeto con los máximos para primaria y secundaria
   */
  public async getMaximosAlertasConsecutivas(): Promise<{
    primaria: { tardanzas: number | null; faltas: number | null };
    secundaria: { tardanzas: number | null; faltas: number | null };
  }> {
    const tardanzasPrimaria = await this.getValorNumericoByNombre(
      AjustesGeneralesSistema.TARDANZAS_CONSECUTIVAS_MAXIMAS_ALERTA_ESTUDIANTES_PRIMARIA
    );
    const faltasPrimaria = await this.getValorNumericoByNombre(
      AjustesGeneralesSistema.FALTAS_CONSECUTIVAS_MAXIMAS_ALERTA_ESTUDIANTES_PRIMARIA
    );
    const tardanzasSecundaria = await this.getValorNumericoByNombre(
      AjustesGeneralesSistema.TARDANZAS_CONSECUTIVAS_MAXIMAS_ALERTA_ESTUDIANTES_SECUNDARIA
    );
    const faltasSecundaria = await this.getValorNumericoByNombre(
      AjustesGeneralesSistema.FALTAS_CONSECUTIVAS_MAXIMAS_ALERTA_ESTUDIANTES_SECUNDARIA
    );

    return {
      primaria: { tardanzas: tardanzasPrimaria, faltas: faltasPrimaria },
      secundaria: {
        tardanzas: tardanzasSecundaria,
        faltas: faltasSecundaria,
      },
    };
  }

  /**
   * Obtiene la duración de la hora académica en minutos
   * @returns Duración en minutos o null
   */
  public async getDuracionHoraAcademica(): Promise<number | null> {
    return await this.getValorNumericoByNombre(
      AjustesGeneralesSistema.DURACION_HORA_ACADEMICA_MINUTOS
    );
  }

  /**
   * Establece un mensaje de éxito
   * @param message Mensaje de éxito
   */
  private handleSuccess(message: string): void {
    const successResponse: MessageProperty = { message };
    this.setSuccessMessage?.(successResponse);
  }

  /**
   * Maneja los errores de operaciones con IndexedDB
   * @param error El error capturado
   * @param operacion Nombre de la operación que falló
   */
  private handleIndexedDBError(error: unknown, operacion: string): void {
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
    });
  }
}