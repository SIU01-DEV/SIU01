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
import { EncryptorIDB } from "../../encryptation/EncryptorIDB";
import ultimaActualizacionTablasLocalesIDB from "../UltimaActualizacionTablasLocalesIDB";
// import { Endpoint_Get_Recreos_API01 } from "@/lib/utils/backend/endpoints/api01/Recreos"; // ⚠️ Ajusta la ruta

// Tipo para la entidad
export interface IRecreoLocal {
  Id_Recreo: number;
  Nivel_Educativo: string; // 'P' para Primaria, 'S' para Secundaria
  Hora_Inicio: string | null; // Time en formato ISO string
  Bloque_Inicio: number | null; // Número de bloque donde inicia el recreo
  Duracion_Minutos: number; // Duración en minutos
  Ultima_Modificacion: string; // DateTime en formato ISO string
}

export interface IRecreoFilter {
  Id_Recreo?: number;
  Nivel_Educativo?: string;
  Bloque_Inicio?: number;
}

export class RecreosIDB {
  private tablaInfo: ITablaInfo = TablasSistema.RECREOS;
  private nombreTablaLocal: string = this.tablaInfo.nombreLocal || "recreos";

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

      await this.fetchYActualizarRecreos();
    } catch (error) {
      console.error("Error durante la sincronización de recreos:", error);
      this.handleIndexedDBError(error, "sincronizar recreos");
    }
  }

  /**
   * Obtiene los recreos desde la API y los actualiza localmente
   * @returns Promise que se resuelve cuando los recreos han sido actualizados
   */
  private async fetchYActualizarRecreos(): Promise<void> {
    try {
      // ⚠️ Descomenta cuando tengas el endpoint
      // const { data: recreos } =
      //   await Endpoint_Get_Recreos_API01.realizarPeticion();

      // ⚠️ TEMPORAL - Simula datos del servidor
      const recreos: IRecreoLocal[] = [];

      const result = await this.upsertFromServer(recreos);

      await ultimaActualizacionTablasLocalesIDB.registrarActualizacion(
        this.tablaInfo.nombreLocal as TablasLocal,
        DatabaseModificationOperations.UPDATE
      );

      console.log(
        `Sincronización de recreos completada: ${recreos.length} recreos procesados (${result.created} creados, ${result.updated} actualizados, ${result.deleted} eliminados, ${result.errors} errores)`
      );
    } catch (error) {
      console.error("Error al obtener y actualizar recreos:", error);

      let errorType: AllErrorTypes = SystemErrorTypes.UNKNOWN_ERROR;
      let message = "Error al sincronizar recreos";

      if (error instanceof Error) {
        if (
          error.message.includes("network") ||
          error.message.includes("fetch")
        ) {
          errorType = SystemErrorTypes.EXTERNAL_SERVICE_ERROR;
          message = "Error de red al sincronizar recreos";
        } else if (error.message.includes("obtener recreos")) {
          errorType = SystemErrorTypes.EXTERNAL_SERVICE_ERROR;
          message = error.message;
        } else if (
          error.name === "TransactionInactiveError" ||
          error.name === "QuotaExceededError"
        ) {
          errorType = SystemErrorTypes.DATABASE_ERROR;
          message = "Error de base de datos al sincronizar recreos";
        } else {
          message = error.message;
        }
      }

      this.setError?.({
        success: false,
        message: message,
        errorType: errorType,
        details: {
          origen: "RecreosIDB.fetchYActualizarRecreos",
          timestamp: Date.now(),
        },
      });

      throw error;
    }
  }

  /**
   * Obtiene todos los recreos
   * @returns Promesa con el array de recreos
   * @Postcondition El resultado estará desencriptado
   */
  public async getAll(): Promise<IRecreoLocal[]> {
    this.setIsSomethingLoading?.(true);
    this.setError?.(null);
    this.setSuccessMessage?.(null);

    try {
      await this.sync();

      const store = await IndexedDBConnection.getStore(this.nombreTablaLocal);

      const result = await new Promise<IRecreoLocal[]>((resolve, reject) => {
        const request = store.getAll();

        request.onsuccess = () =>
          resolve(EncryptorIDB.decryptThis(request.result) as IRecreoLocal[]);
        request.onerror = () => reject(request.error);
      });

      if (result.length > 0) {
        this.handleSuccess(`Se encontraron ${result.length} recreos`);
      } else {
        this.handleSuccess("No se encontraron recreos");
      }

      this.setIsSomethingLoading?.(false);
      return result;
    } catch (error) {
      this.handleIndexedDBError(error, "obtener lista de recreos");
      this.setIsSomethingLoading?.(false);
      return [];
    }
  }

  /**
   * Obtiene todos los IDs de recreos almacenados localmente
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
            ids.push(cursor.value.Id_Recreo);
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
      console.error("Error al obtener todos los IDs de recreos:", error);
      throw error;
    }
  }

  /**
   * Elimina un recreo por su ID
   * @Precondition El parámetro no estará encriptado
   * @param id ID del recreo a eliminar
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
      console.error(`Error al eliminar recreo con ID ${id}:`, error);
      throw error;
    }
  }

  /**
   * Actualiza o crea recreos en lote desde el servidor
   * También elimina registros que ya no existen en el servidor
   * @Precondition Los parámetros no estarán encriptados
   * @param recreosServidor Recreos provenientes del servidor
   * @returns Conteo de operaciones: creados, actualizados, eliminados, errores
   */
  private async upsertFromServer(recreosServidor: IRecreoLocal[]): Promise<{
    created: number;
    updated: number;
    deleted: number;
    errors: number;
  }> {
    const result = { created: 0, updated: 0, deleted: 0, errors: 0 };

    try {
      const idsLocales = await this.getAllIds();
      const idsServidor = new Set(
        recreosServidor.map((recreo) => recreo.Id_Recreo)
      );

      const idsAEliminar = idsLocales.filter((id) => !idsServidor.has(id));

      for (const id of idsAEliminar) {
        try {
          await this.deleteById(id);
          result.deleted++;
        } catch (error) {
          console.error(`Error al eliminar recreo ${id}:`, error);
          result.errors++;
        }
      }

      const BATCH_SIZE = 20;

      for (let i = 0; i < recreosServidor.length; i += BATCH_SIZE) {
        const lote = recreosServidor.slice(i, i + BATCH_SIZE);

        for (const recreoServidor of lote) {
          try {
            const existeRecreo = await this.getById(recreoServidor.Id_Recreo);

            const store = await IndexedDBConnection.getStore(
              this.nombreTablaLocal,
              "readwrite"
            );

            await new Promise<void>((resolve, reject) => {
              const request = store.put(
                EncryptorIDB.encryptThis(recreoServidor)
              );

              request.onsuccess = () => {
                if (existeRecreo) {
                  result.updated++;
                } else {
                  result.created++;
                }
                resolve();
              };

              request.onerror = () => {
                result.errors++;
                console.error(
                  `Error al guardar recreo ${recreoServidor.Id_Recreo}:`,
                  request.error
                );
                reject(request.error);
              };
            });
          } catch (error) {
            result.errors++;
            console.error(
              `Error al procesar recreo ${recreoServidor.Id_Recreo}:`,
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
   * Obtiene un recreo por su ID
   * @Precondition El parámetro no estará encriptado
   * @param id ID del recreo
   * @returns Recreo encontrado o null
   * @Postcondition El resultado estará desencriptado
   */
  public async getById(id: number): Promise<IRecreoLocal | null> {
    try {
      const store = await IndexedDBConnection.getStore(this.nombreTablaLocal);

      return new Promise<IRecreoLocal | null>((resolve, reject) => {
        const request = store.get(EncryptorIDB.encryptThis(id));

        request.onsuccess = () => {
          resolve(EncryptorIDB.decryptThis(request.result) || null);
        };

        request.onerror = () => {
          reject(request.error);
        };
      });
    } catch (error) {
      console.error(`Error al obtener recreo con ID ${id}:`, error);
      this.handleIndexedDBError(error, `obtener recreo con ID ${id}`);
      return null;
    }
  }

  /**
   * Obtiene recreos por nivel educativo
   * @Detail La propiedad "Nivel_Educativo" nunca estará encriptada por ser índice
   * @param nivelEducativo Nivel educativo ('P' o 'S')
   * @returns Array de recreos del nivel educativo
   * @Postcondition El resultado estará desencriptado
   */
  public async getByNivelEducativo(
    nivelEducativo: string
  ): Promise<IRecreoLocal[]> {
    try {
      const store = await IndexedDBConnection.getStore(this.nombreTablaLocal);
      const index = store.index("por_nivel_educativo");

      return new Promise<IRecreoLocal[]>((resolve, reject) => {
        const request = index.getAll(nivelEducativo);

        request.onsuccess = () => {
          resolve(EncryptorIDB.decryptThis(request.result) as IRecreoLocal[]);
        };

        request.onerror = () => {
          reject(request.error);
        };
      });
    } catch (error) {
      console.error(
        `Error al obtener recreos del nivel educativo ${nivelEducativo}:`,
        error
      );
      this.handleIndexedDBError(
        error,
        `obtener recreos del nivel educativo ${nivelEducativo}`
      );
      return [];
    }
  }

  /**
   * Obtiene un recreo por nivel educativo y bloque de inicio
   * @param nivelEducativo Nivel educativo ('P' o 'S')
   * @param bloqueInicio Número de bloque donde inicia el recreo
   * @returns Recreo encontrado o null
   * @Postcondition El resultado estará desencriptado
   */
  public async getByNivelYBloque(
    nivelEducativo: string,
    bloqueInicio: number
  ): Promise<IRecreoLocal | null> {
    try {
      const store = await IndexedDBConnection.getStore(this.nombreTablaLocal);
      const index = store.index("por_nivel_bloque");

      return new Promise<IRecreoLocal | null>((resolve, reject) => {
        const request = index.get([
          nivelEducativo,
          EncryptorIDB.encryptThis(bloqueInicio),
        ]);

        request.onsuccess = () => {
          resolve(EncryptorIDB.decryptThis(request.result) || null);
        };

        request.onerror = () => {
          reject(request.error);
        };
      });
    } catch (error) {
      console.error(
        `Error al obtener recreo del nivel ${nivelEducativo} y bloque ${bloqueInicio}:`,
        error
      );
      this.handleIndexedDBError(
        error,
        `obtener recreo del nivel ${nivelEducativo} y bloque ${bloqueInicio}`
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
