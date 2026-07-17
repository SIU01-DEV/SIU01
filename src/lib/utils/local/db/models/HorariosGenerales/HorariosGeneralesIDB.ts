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

export interface IHorarioGeneralLocal {
  Id_Horario: number;
  Nombre: string;
  Valor: string; // DateTime en formato ISO string
  Descripcion: string;
  Ultima_Modificacion: string; // DateTime en formato ISO string
}

export interface IHorarioGeneralFilter {
  Id_Horario?: number;
  Nombre?: string;
}

export class HorariosGeneralesIDB {
  private tablaInfo: ITablaInfo = TablasSistema.HORARIOS_GENERALES;
  private nombreTablaLocal: string =
    this.tablaInfo.nombreLocal || "horarios_asistencia";

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

      await this.fetchYActualizarHorariosGenerales();
    } catch (error) {
      console.error(
        "Error durante la sincronización de horarios generales:",
        error
      );
      this.handleIndexedDBError(error, "sincronizar horarios generales");
    }
  }

  /**
   * Obtiene los horarios generales desde la API y los actualiza localmente
   * @returns Promise que se resuelve cuando los horarios han sido actualizados
   */
  private async fetchYActualizarHorariosGenerales(): Promise<void> {
    try {
      // ⚠️ Descomenta cuando tengas el endpoint
      // const { data: horariosGenerales } =
      //   await Endpoint_Get_Horarios_Generales_API01.realizarPeticion();

      // ⚠️ TEMPORAL - Simula datos del servidor
      const horariosGenerales: IHorarioGeneralLocal[] = [];

      const result = await this.upsertFromServer(horariosGenerales);

      await ultimaActualizacionTablasLocalesIDB.registrarActualizacion(
        this.tablaInfo.nombreLocal as TablasLocal,
        DatabaseModificationOperations.UPDATE
      );

      console.log(
        `Sincronización de horarios generales completada: ${horariosGenerales.length} horarios procesados (${result.created} creados, ${result.updated} actualizados, ${result.deleted} eliminados, ${result.errors} errores)`
      );
    } catch (error) {
      console.error("Error al obtener y actualizar horarios generales:", error);

      let errorType: AllErrorTypes = SystemErrorTypes.UNKNOWN_ERROR;
      let message = "Error al sincronizar horarios generales";

      if (error instanceof Error) {
        if (
          error.message.includes("network") ||
          error.message.includes("fetch")
        ) {
          errorType = SystemErrorTypes.EXTERNAL_SERVICE_ERROR;
          message = "Error de red al sincronizar horarios generales";
        } else if (error.message.includes("obtener horarios")) {
          errorType = SystemErrorTypes.EXTERNAL_SERVICE_ERROR;
          message = error.message;
        } else if (
          error.name === "TransactionInactiveError" ||
          error.name === "QuotaExceededError"
        ) {
          errorType = SystemErrorTypes.DATABASE_ERROR;
          message = "Error de base de datos al sincronizar horarios generales";
        } else {
          message = error.message;
        }
      }

      this.setError?.({
        success: false,
        message: message,
        errorType: errorType,
        details: {
          origen: "HorariosGeneralesIDB.fetchYActualizarHorariosGenerales",
          timestamp: Date.now(),
        },
      });

      throw error;
    }
  }

  /**
   * Obtiene todos los horarios generales
   * @returns Promesa con el array de horarios generales
   * @Postcondition El resultado estará desencriptado
   */
  public async getAll(): Promise<IHorarioGeneralLocal[]> {
    this.setIsSomethingLoading?.(true);
    this.setError?.(null);
    this.setSuccessMessage?.(null);

    try {
      await this.sync();

      const store = await IndexedDBConnection.getStore(this.nombreTablaLocal);

      const result = await new Promise<IHorarioGeneralLocal[]>(
        (resolve, reject) => {
          const request = store.getAll();

          request.onsuccess = () =>
            resolve(
              EncryptorIDB.decryptThis(request.result) as IHorarioGeneralLocal[]
            );
          request.onerror = () => reject(request.error);
        }
      );

      if (result.length > 0) {
        this.handleSuccess(
          `Se encontraron ${result.length} horarios generales`
        );
      } else {
        this.handleSuccess("No se encontraron horarios generales");
      }

      this.setIsSomethingLoading?.(false);
      return result;
    } catch (error) {
      this.handleIndexedDBError(error, "obtener lista de horarios generales");
      this.setIsSomethingLoading?.(false);
      return [];
    }
  }

  /**
   * Obtiene todos los IDs de horarios generales almacenados localmente
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
            ids.push(cursor.value.Id_Horario);
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
      console.error(
        "Error al obtener todos los IDs de horarios generales:",
        error
      );
      throw error;
    }
  }

  /**
   * Elimina un horario general por su ID
   * @Precondition El parámetro no estará encriptado
   * @param id ID del horario general a eliminar
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
      console.error(`Error al eliminar horario general con ID ${id}:`, error);
      throw error;
    }
  }

  /**
   * Actualiza o crea horarios generales en lote desde el servidor
   * También elimina registros que ya no existen en el servidor
   * @Precondition Los parámetros no estarán encriptados
   * @param horariosServidor Horarios generales provenientes del servidor
   * @returns Conteo de operaciones: creados, actualizados, eliminados, errores
   */
  private async upsertFromServer(
    horariosServidor: IHorarioGeneralLocal[]
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
        horariosServidor.map((horario) => horario.Id_Horario)
      );

      const idsAEliminar = idsLocales.filter((id) => !idsServidor.has(id));

      for (const id of idsAEliminar) {
        try {
          await this.deleteById(id);
          result.deleted++;
        } catch (error) {
          console.error(`Error al eliminar horario general ${id}:`, error);
          result.errors++;
        }
      }

      const BATCH_SIZE = 20;

      for (let i = 0; i < horariosServidor.length; i += BATCH_SIZE) {
        const lote = horariosServidor.slice(i, i + BATCH_SIZE);

        for (const horarioServidor of lote) {
          try {
            const existeHorario = await this.getById(
              horarioServidor.Id_Horario
            );

            const store = await IndexedDBConnection.getStore(
              this.nombreTablaLocal,
              "readwrite"
            );

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
                  `Error al guardar horario general ${horarioServidor.Id_Horario}:`,
                  request.error
                );
                reject(request.error);
              };
            });
          } catch (error) {
            result.errors++;
            console.error(
              `Error al procesar horario general ${horarioServidor.Id_Horario}:`,
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
   * Obtiene un horario general por su ID
   * @Precondition El parámetro no estará encriptado
   * @param id ID del horario general
   * @returns Horario general encontrado o null
   * @Postcondition El resultado estará desencriptado
   */
  public async getById(id: number): Promise<IHorarioGeneralLocal | null> {
    try {
      const store = await IndexedDBConnection.getStore(this.nombreTablaLocal);

      return new Promise<IHorarioGeneralLocal | null>((resolve, reject) => {
        const request = store.get(EncryptorIDB.encryptThis(id));

        request.onsuccess = () => {
          resolve(EncryptorIDB.decryptThis(request.result) || null);
        };

        request.onerror = () => {
          reject(request.error);
        };
      });
    } catch (error) {
      console.error(`Error al obtener horario general con ID ${id}:`, error);
      this.handleIndexedDBError(error, `obtener horario general con ID ${id}`);
      return null;
    }
  }

  /**
   * Obtiene un horario general por su nombre
   * @Detail La propiedad "Nombre" nunca estará encriptada por ser índice
   * @param nombre Nombre del horario general
   * @returns Horario general encontrado o null
   * @Postcondition El resultado estará desencriptado
   */
  public async getByNombre(
    nombre: string
  ): Promise<IHorarioGeneralLocal | null> {
    try {
      const store = await IndexedDBConnection.getStore(this.nombreTablaLocal);
      const index = store.index("por_nombre");

      return new Promise<IHorarioGeneralLocal | null>((resolve, reject) => {
        const request = index.get(nombre);

        request.onsuccess = () => {
          resolve(EncryptorIDB.decryptThis(request.result) || null);
        };

        request.onerror = () => {
          reject(request.error);
        };
      });
    } catch (error) {
      console.error(
        `Error al obtener horario general con nombre ${nombre}:`,
        error
      );
      this.handleIndexedDBError(
        error,
        `obtener horario general con nombre ${nombre}`
      );
      return null;
    }
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
