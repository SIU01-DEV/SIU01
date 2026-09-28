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
import ultimaActualizacionTablasLocalesIDB from "../UltimaActualizacionTablasLocalesIDB";
import { DatabaseModificationOperations } from "@/interfaces/shared/DatabaseModificationOperations";
import { EncryptorIDB } from "../../encryptation/EncryptorIDB";

/**
 * Interfaz para representar un horario por día del personal administrativo
 */
export interface IHorarioPorDiaPersonalAdministrativoLocal {
  Id_Horario_Por_Dia_P_Administrativo: number;
  Dia: number; // 1-5 (Lunes a Viernes)
  Hora_Inicio: string; // Time en formato ISO string
  Hora_Fin: string; // Time en formato ISO string
  Id_Personal_Administrativo: string; // DNI del personal administrativo
}

/**
 * Interfaz para filtros de búsqueda
 */
export interface IHorarioPorDiaPersonalAdministrativoFilter {
  Id_Horario_Por_Dia_P_Administrativo?: number;
  Dia?: number;
  Id_Personal_Administrativo?: string;
}

/**
 * Clase para gestionar los horarios por días del personal administrativo en IndexedDB
 * Sigue el patrón establecido con sincronización automática y operaciones CRUD completas
 */
export class HorariosPorDiasPersonalAdministrativoIDB {
  private tablaInfo: ITablaInfo =
    TablasSistema.HORARIOS_POR_DIAS_PERSONAL_ADMINISTRATIVO;
  private nombreTablaLocal: string =
    this.tablaInfo.nombreLocal || "horarios_por_dias_personal_administrativo";

  constructor(
    private siasisAPI: SiasisAPIS = "API01",
    private setIsSomethingLoading?: (isLoading: boolean) => void,
    private setError?: (error: ErrorResponseAPIBase | null) => void,
    private setSuccessMessage?: (message: MessageProperty | null) => void
  ) {}

  /**
   * Método de sincronización que se ejecutará al inicio de cada operación
   * Verifica si es necesario sincronizar con el servidor y ejecuta la sincronización
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

      await this.fetchYActualizarHorariosPorDiasPersonalAdministrativo();
    } catch (error) {
      console.error(
        "Error durante la sincronización de horarios por días personal administrativo:",
        error
      );
      this.handleIndexedDBError(
        error,
        "sincronizar horarios por días personal administrativo"
      );
    }
  }

  /**
   * Obtiene los horarios por días personal administrativo desde la API y los actualiza localmente
   * @returns Promise que se resuelve cuando los horarios han sido actualizados
   * @throws Error si falla la petición al servidor o la actualización local
   */
  private async fetchYActualizarHorariosPorDiasPersonalAdministrativo(): Promise<void> {
    try {
      // ⚠️ Descomenta cuando tengas el endpoint disponible
      // const { data: horariosPersonalAdministrativo } =
      //   await Endpoint_Get_Horarios_Por_Dias_Personal_Administrativo_API01.realizarPeticion();

      // ⚠️ TEMPORAL - Simula datos del servidor para desarrollo
      const horariosPersonalAdministrativo: IHorarioPorDiaPersonalAdministrativoLocal[] =
        [];

      // Actualizar horarios en la base de datos local
      const result = await this.upsertFromServer(
        horariosPersonalAdministrativo
      );

      // Registrar la actualización en UltimaActualizacionTablasLocalesIDB
      await ultimaActualizacionTablasLocalesIDB.registrarActualizacion(
        this.tablaInfo.nombreLocal as TablasLocal,
        DatabaseModificationOperations.UPDATE
      );

      console.log(
        `Sincronización de horarios por días personal administrativo completada: ${horariosPersonalAdministrativo.length} horarios procesados (${result.created} creados, ${result.updated} actualizados, ${result.deleted} eliminados, ${result.errors} errores)`
      );
    } catch (error) {
      console.error(
        "Error al obtener y actualizar horarios por días personal administrativo:",
        error
      );

      // Determinar el tipo de error
      let errorType: AllErrorTypes = SystemErrorTypes.UNKNOWN_ERROR;
      let message =
        "Error al sincronizar horarios por días personal administrativo";

      if (error instanceof Error) {
        if (
          error.message.includes("network") ||
          error.message.includes("fetch")
        ) {
          errorType = SystemErrorTypes.EXTERNAL_SERVICE_ERROR;
          message =
            "Error de red al sincronizar horarios por días personal administrativo";
        } else if (error.message.includes("obtener horarios")) {
          errorType = SystemErrorTypes.EXTERNAL_SERVICE_ERROR;
          message = error.message;
        } else if (
          error.name === "TransactionInactiveError" ||
          error.name === "QuotaExceededError"
        ) {
          errorType = SystemErrorTypes.DATABASE_ERROR;
          message =
            "Error de base de datos al sincronizar horarios por días personal administrativo";
        } else {
          message = error.message;
        }
      }

      // Establecer el error en el estado global
      this.setError?.({
        success: false,
        message: message,
        errorType: errorType,
        details: {
          origen:
            "HorariosPorDiasPersonalAdministrativoIDB.fetchYActualizarHorariosPorDiasPersonalAdministrativo",
          timestamp: Date.now(),
        },
      });

      throw error;
    }
  }

  /**
   * Obtiene todos los horarios por días personal administrativo
   * @returns Promesa con el array de horarios
   * @Postcondition El resultado estará desencriptado
   */
  public async getAll(): Promise<IHorarioPorDiaPersonalAdministrativoLocal[]> {
    this.setIsSomethingLoading?.(true);
    this.setError?.(null);
    this.setSuccessMessage?.(null);

    try {
      // Ejecutar sincronización antes de la operación
      await this.sync();

      // Obtener el store
      const store = await IndexedDBConnection.getStore(this.nombreTablaLocal);

      // Convertir la API de callbacks de IndexedDB a promesas
      const result = await new Promise<
        IHorarioPorDiaPersonalAdministrativoLocal[]
      >((resolve, reject) => {
        const request = store.getAll();

        request.onsuccess = () =>
          resolve(
            EncryptorIDB.decryptThis(
              request.result
            ) as IHorarioPorDiaPersonalAdministrativoLocal[]
          );
        request.onerror = () => reject(request.error);
      });

      // Mostrar mensaje de éxito con información relevante
      if (result.length > 0) {
        this.handleSuccess(
          `Se encontraron ${result.length} horarios por días personal administrativo`
        );
      } else {
        this.handleSuccess(
          "No se encontraron horarios por días personal administrativo"
        );
      }

      this.setIsSomethingLoading?.(false);
      return result;
    } catch (error) {
      this.handleIndexedDBError(
        error,
        "obtener lista de horarios por días personal administrativo"
      );
      this.setIsSomethingLoading?.(false);
      return [];
    }
  }

  /**
   * Obtiene todos los IDs de horarios por días personal administrativo almacenados localmente
   * @returns Promise con array de IDs
   * @Postcondition El resultado estará desencriptado
   * @private
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
            // Añadir el ID del horario actual
            ids.push(cursor.value.Id_Horario_Por_Dia_P_Administrativo);
            cursor.continue();
          } else {
            // No hay más registros, resolvemos con el array de IDs desencriptado
            resolve(EncryptorIDB.decryptThis(ids));
          }
        };

        request.onerror = () => {
          reject(request.error);
        };
      });
    } catch (error) {
      console.error(
        "Error al obtener todos los IDs de horarios por días personal administrativo:",
        error
      );
      throw error;
    }
  }

  /**
   * Elimina un horario por día personal administrativo por su ID
   * @Precondition El parámetro no estará encriptado
   * @param id ID del horario a eliminar
   * @returns Promise<void>
   * @private
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
      console.error(
        `Error al eliminar horario por día personal administrativo con ID ${id}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Actualiza o crea horarios por días personal administrativo en lote desde el servidor
   * También elimina registros que ya no existen en el servidor
   * @Precondition Los parámetros no estarán encriptados
   * @param horariosServidor Horarios provenientes del servidor
   * @returns Conteo de operaciones: creados, actualizados, eliminados, errores
   * @private
   */
  private async upsertFromServer(
    horariosServidor: IHorarioPorDiaPersonalAdministrativoLocal[]
  ): Promise<{
    created: number;
    updated: number;
    deleted: number;
    errors: number;
  }> {
    const result = { created: 0, updated: 0, deleted: 0, errors: 0 };

    try {
      // 1. Obtener los IDs actuales en caché
      const idsLocales = await this.getAllIds();

      // 2. Crear conjunto de IDs del servidor para búsqueda rápida
      const idsServidor = new Set(
        horariosServidor.map(
          (horario) => horario.Id_Horario_Por_Dia_P_Administrativo
        )
      );

      // 3. Identificar IDs que ya no existen en el servidor
      const idsAEliminar = idsLocales.filter((id) => !idsServidor.has(id));

      // 4. Eliminar registros que ya no existen en el servidor
      for (const id of idsAEliminar) {
        try {
          await this.deleteById(id);
          result.deleted++;
        } catch (error) {
          console.error(
            `Error al eliminar horario por día personal administrativo ${id}:`,
            error
          );
          result.errors++;
        }
      }

      // 5. Procesar en lotes para evitar transacciones demasiado largas
      const BATCH_SIZE = 20;

      for (let i = 0; i < horariosServidor.length; i += BATCH_SIZE) {
        const lote = horariosServidor.slice(i, i + BATCH_SIZE);

        // Para cada horario en el lote
        for (const horarioServidor of lote) {
          try {
            // Verificar si ya existe el horario
            const existeHorario = await this.getById(
              horarioServidor.Id_Horario_Por_Dia_P_Administrativo
            );

            // Obtener un store fresco para cada operación
            const store = await IndexedDBConnection.getStore(
              this.nombreTablaLocal,
              "readwrite"
            );

            // Ejecutar la operación put
            await new Promise<void>((resolve, reject) => {
              const request = store.put(
                EncryptorIDB.encryptThis(horarioServidor)
              );

              request.onsuccess = () => {
                if (existeHorario) {
                  result.updated++;
                } else {
                  result.created++;
                }
                resolve();
              };

              request.onerror = () => {
                result.errors++;
                console.error(
                  `Error al guardar horario por día personal administrativo ${horarioServidor.Id_Horario_Por_Dia_P_Administrativo}:`,
                  request.error
                );
                reject(request.error);
              };
            });
          } catch (error) {
            result.errors++;
            console.error(
              `Error al procesar horario por día personal administrativo ${horarioServidor.Id_Horario_Por_Dia_P_Administrativo}:`,
              error
            );
          }
        }

        // Dar un pequeño respiro al bucle de eventos entre lotes
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
   * Obtiene un horario por día personal administrativo por su ID
   * @Precondition El parámetro no estará encriptado
   * @param id ID del horario
   * @returns Horario encontrado o null
   * @Postcondition El resultado estará desencriptado
   */
  public async getById(
    id: number
  ): Promise<IHorarioPorDiaPersonalAdministrativoLocal | null> {
    try {
      const store = await IndexedDBConnection.getStore(this.nombreTablaLocal);

      return new Promise<IHorarioPorDiaPersonalAdministrativoLocal | null>(
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
      console.error(
        `Error al obtener horario por día personal administrativo con ID ${id}:`,
        error
      );
      this.handleIndexedDBError(
        error,
        `obtener horario por día personal administrativo con ID ${id}`
      );
      return null;
    }
  }

  /**
   * Obtiene todos los horarios de un miembro del personal administrativo específico
   * @Detail La propiedad "Id_Personal_Administrativo" puede estar encriptada
   * @param idPersonalAdministrativo DNI del personal administrativo
   * @returns Array de horarios del personal administrativo
   * @Postcondition El resultado estará desencriptado
   */
  public async getByPersonalAdministrativo(
    idPersonalAdministrativo: string
  ): Promise<IHorarioPorDiaPersonalAdministrativoLocal[]> {
    try {
      const store = await IndexedDBConnection.getStore(this.nombreTablaLocal);
      const index = store.index("por_personal_administrativo");

      return new Promise<IHorarioPorDiaPersonalAdministrativoLocal[]>(
        (resolve, reject) => {
          const request = index.getAll(
            EncryptorIDB.encryptThis(idPersonalAdministrativo)
          );

          request.onsuccess = () => {
            resolve(
              EncryptorIDB.decryptThis(
                request.result
              ) as IHorarioPorDiaPersonalAdministrativoLocal[]
            );
          };

          request.onerror = () => {
            reject(request.error);
          };
        }
      );
    } catch (error) {
      console.error(
        `Error al obtener horarios del personal administrativo ${idPersonalAdministrativo}:`,
        error
      );
      this.handleIndexedDBError(
        error,
        `obtener horarios del personal administrativo ${idPersonalAdministrativo}`
      );
      return [];
    }
  }

  /**
   * Obtiene todos los horarios de un día específico
   * @Detail La propiedad "Dia" puede estar encriptada
   * @param dia Día de la semana (1-5)
   * @returns Array de horarios del día especificado
   * @Postcondition El resultado estará desencriptado
   */
  public async getByDia(
    dia: number
  ): Promise<IHorarioPorDiaPersonalAdministrativoLocal[]> {
    try {
      const store = await IndexedDBConnection.getStore(this.nombreTablaLocal);
      const index = store.index("por_dia");

      return new Promise<IHorarioPorDiaPersonalAdministrativoLocal[]>(
        (resolve, reject) => {
          const request = index.getAll(EncryptorIDB.encryptThis(dia));

          request.onsuccess = () => {
            resolve(
              EncryptorIDB.decryptThis(
                request.result
              ) as IHorarioPorDiaPersonalAdministrativoLocal[]
            );
          };

          request.onerror = () => {
            reject(request.error);
          };
        }
      );
    } catch (error) {
      console.error(`Error al obtener horarios del día ${dia}:`, error);
      this.handleIndexedDBError(error, `obtener horarios del día ${dia}`);
      return [];
    }
  }

  /**
   * Obtiene el horario de un miembro del personal administrativo para un día específico
   * @Detail Las propiedades pueden estar encriptadas
   * @param idPersonalAdministrativo DNI del personal administrativo
   * @param dia Día de la semana (1-5)
   * @returns Horario encontrado o null
   * @Postcondition El resultado estará desencriptado
   */
  public async getByPersonalAdministrativoYDia(
    idPersonalAdministrativo: string,
    dia: number
  ): Promise<IHorarioPorDiaPersonalAdministrativoLocal | null> {
    try {
      const store = await IndexedDBConnection.getStore(this.nombreTablaLocal);
      const index = store.index("por_personal_dia");

      return new Promise<IHorarioPorDiaPersonalAdministrativoLocal | null>(
        (resolve, reject) => {
          const request = index.get([
            EncryptorIDB.encryptThis(idPersonalAdministrativo),
            EncryptorIDB.encryptThis(dia),
          ]);

          request.onsuccess = () => {
            resolve(EncryptorIDB.decryptThis(request.result) || null);
          };

          request.onerror = () => {
            reject(request.error);
          };
        }
      );
    } catch (error) {
      console.error(
        `Error al obtener horario del personal administrativo ${idPersonalAdministrativo} para el día ${dia}:`,
        error
      );
      this.handleIndexedDBError(
        error,
        `obtener horario del personal administrativo ${idPersonalAdministrativo} para el día ${dia}`
      );
      return null;
    }
  }

  /**
   * Establece un mensaje de éxito
   * @param message Mensaje de éxito
   * @private
   */
  private handleSuccess(message: string): void {
    const successResponse: MessageProperty = { message };
    this.setSuccessMessage?.(successResponse);
  }

  /**
   * Maneja los errores de operaciones con IndexedDB
   * @param error El error capturado
   * @param operacion Nombre de la operación que falló
   * @private
   */
  private handleIndexedDBError(error: unknown, operacion: string): void {
    console.error(`Error en operación IndexedDB (${operacion}):`, error);

    let errorType: AllErrorTypes = SystemErrorTypes.UNKNOWN_ERROR;
    let message = `Error al ${operacion}`;

    if (error instanceof Error) {
      // Intentar categorizar el error según su mensaje o nombre
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
        // Si no podemos categorizar específicamente, usamos el mensaje del error
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
