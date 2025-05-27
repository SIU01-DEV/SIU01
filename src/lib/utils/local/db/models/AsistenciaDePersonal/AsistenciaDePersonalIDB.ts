/* eslint-disable @typescript-eslint/no-explicit-any */
import { logout } from "@/lib/helpers/logout";
import { LogoutTypes, ErrorDetailsForLogout } from "@/interfaces/LogoutTypes";
import IndexedDBConnection from "../../IndexedDBConnection";
import { ModoRegistro } from "@/interfaces/shared/ModoRegistroPersonal";
import {
  ConsultarAsistenciasDiariasPorActorEnRedisResponseBody,
  DetallesAsistenciaUnitariaPersonal,
  RegistroAsistenciaUnitariaPersonal,
} from "../../../../../../interfaces/shared/AsistenciaRequests";
import { RolesSistema } from "@/interfaces/shared/RolesSistema";
import { Meses } from "@/interfaces/shared/Meses";
import { ActoresSistema } from "@/interfaces/shared/ActoresSistema";
import {
  ApiResponseBase,
  ErrorResponseAPIBase,
  MessageProperty,
} from "@/interfaces/shared/apis/types";
import AllErrorTypes, {
  DataConflictErrorTypes,
  SystemErrorTypes,
  UserErrorTypes,
  DataErrorTypes,
} from "@/interfaces/shared/apis/errors";
import { SiasisAPIS } from "@/interfaces/shared/SiasisComponents";
import fetchSiasisApiGenerator from "@/lib/helpers/generators/fetchSiasisApisGenerator";
import {
  MINUTOS_TOLERANCIA_ENTRADA_PERSONAL,
  MINUTOS_TOLERANCIA_SALIDA_PERSONAL,
} from "@/constants/MINUTOS_TOLERANCIA_ASISTENCIA_PERSONAL";
import { EstadosAsistenciaPersonal } from "@/interfaces/shared/EstadosAsistenciaPersonal";
import { DIA_ESCOLAR_MINIMO_PARA_CONSULTAR_API } from "@/constants/DISPONIBILLIDAD_IDS_RDP02_GENERADOS";

// Re-exportar para acceso externo
export { ModoRegistro } from "@/interfaces/shared/ModoRegistroPersonal";

// Interfaces para los registros de entrada/salida
export interface RegistroEntradaSalida {
  timestamp: number;
  desfaseSegundos: number;
  estado: EstadosAsistenciaPersonal;
}

// Interfaces para asistencia mensual
export interface AsistenciaMensualPersonal {
  Id_Registro_Mensual: number;
  mes: Meses;
  Dni_Personal: string;
  registros: Record<string, RegistroEntradaSalida>;
}

// Enumeración para los diferentes tipos de personal
export enum TipoPersonal {
  PROFESOR_PRIMARIA = "profesor_primaria",
  PROFESOR_SECUNDARIA = "profesor_secundaria",
  AUXILIAR = "auxiliar",
  PERSONAL_ADMINISTRATIVO = "personal_administrativo",
}

// Interface para respuesta de la API de asistencias mensuales
export interface AsistenciaCompletaMensualDePersonal {
  Id_Registro_Mensual_Entrada: number;
  Id_Registro_Mensual_Salida: number;
  DNI_Usuario: string;
  Rol: RolesSistema;
  Nombres: string;
  Apellidos: string;
  Genero: string;
  Entradas: Record<
    string,
    {
      Timestamp: number | null;
      DesfaseSegundos: number | null;
    }
  >;
  Salidas: Record<
    string,
    {
      Timestamp: number | null;
      DesfaseSegundos: number | null;
    }
  >;
  Mes: Meses;
}

// Interface para respuesta exitosa de obtener asistencias mensuales
export interface GetAsistenciaMensualDePersonalSuccessResponse {
  success: true;
  data: AsistenciaCompletaMensualDePersonal;
  message: string;
}

export class AsistenciaDePersonalIDB {
  private siasisAPI: SiasisAPIS;
  private setIsSomethingLoading: (isLoading: boolean) => void;
  private setError: (error: ErrorResponseAPIBase | null) => void;
  private setSuccessMessage?: (message: MessageProperty | null) => void;

  constructor(
    siasisAPI: SiasisAPIS,
    setIsSomethingLoading: (isLoading: boolean) => void,
    setError: (error: ErrorResponseAPIBase | null) => void,
    setSuccessMessage?: (message: MessageProperty | null) => void
  ) {
    this.siasisAPI = siasisAPI;
    this.setIsSomethingLoading = setIsSomethingLoading;
    this.setError = setError;
    this.setSuccessMessage = setSuccessMessage;
  }

  /**
   * Obtiene el nombre del almacén según el tipo de personal y el modo de registro
   */
  private getStoreName(
    tipoPersonal: TipoPersonal,
    modoRegistro: ModoRegistro
  ): string {
    const storeMapping = {
      [TipoPersonal.PROFESOR_PRIMARIA]: {
        [ModoRegistro.Entrada]: "control_entrada_profesores_primaria",
        [ModoRegistro.Salida]: "control_salida_profesores_primaria",
      },
      [TipoPersonal.PROFESOR_SECUNDARIA]: {
        [ModoRegistro.Entrada]: "control_entrada_profesores_secundaria",
        [ModoRegistro.Salida]: "control_salida_profesores_secundaria",
      },
      [TipoPersonal.AUXILIAR]: {
        [ModoRegistro.Entrada]: "control_entrada_auxiliar",
        [ModoRegistro.Salida]: "control_salida_auxiliar",
      },
      [TipoPersonal.PERSONAL_ADMINISTRATIVO]: {
        [ModoRegistro.Entrada]: "control_entrada_personal_administrativo",
        [ModoRegistro.Salida]: "control_salida_personal_administrativo",
      },
    };

    return storeMapping[tipoPersonal][modoRegistro];
  }

  /**
   * Obtiene el nombre del campo de identificación según el tipo de personal
   */
  private getIdFieldName(tipoPersonal: TipoPersonal): string {
    const fieldMapping = {
      [TipoPersonal.PROFESOR_PRIMARIA]: "DNI_Profesor_Primaria",
      [TipoPersonal.PROFESOR_SECUNDARIA]: "DNI_Profesor_Secundaria",
      [TipoPersonal.AUXILIAR]: "DNI_Auxiliar",
      [TipoPersonal.PERSONAL_ADMINISTRATIVO]: "DNI_Personal_Administrativo",
    };

    return fieldMapping[tipoPersonal];
  }

  /**
   * Obtiene el nombre del campo ID según el tipo de personal y modo de registro
   */
  private getIdFieldForStore(
    tipoPersonal: TipoPersonal,
    modoRegistro: ModoRegistro
  ): string {
    const prefijo =
      modoRegistro === ModoRegistro.Entrada ? "Id_C_E_M_P_" : "Id_C_S_M_P_";

    switch (tipoPersonal) {
      case TipoPersonal.PROFESOR_PRIMARIA:
        return `${prefijo}Profesores_Primaria`;
      case TipoPersonal.PROFESOR_SECUNDARIA:
        return `${prefijo}Profesores_Secundaria`;
      case TipoPersonal.AUXILIAR:
        return `${prefijo}Auxiliar`;
      case TipoPersonal.PERSONAL_ADMINISTRATIVO:
        return `${prefijo}Administrativo`;
      default:
        throw new Error(`Tipo de personal no soportado: ${tipoPersonal}`);
    }
  }

  /**
   * Obtiene el nombre del índice para la búsqueda por personal y mes
   */
  private getIndexNameForPersonalMes(tipoPersonal: TipoPersonal): string {
    const indexMapping = {
      [TipoPersonal.PROFESOR_PRIMARIA]: "por_profesor_mes",
      [TipoPersonal.PROFESOR_SECUNDARIA]: "por_profesor_mes",
      [TipoPersonal.AUXILIAR]: "por_auxiliar_mes",
      [TipoPersonal.PERSONAL_ADMINISTRATIVO]: "por_administrativo_mes",
    };

    return indexMapping[tipoPersonal] || "por_profesor_mes";
  }

  /**
   * Convierte un rol del sistema al tipo de personal correspondiente
   */
  private obtenerTipoPersonalDesdeRolOActor(
    rol: RolesSistema | ActoresSistema
  ): TipoPersonal {
    switch (rol) {
      case RolesSistema.ProfesorPrimaria:
      case ActoresSistema.ProfesorPrimaria:
        return TipoPersonal.PROFESOR_PRIMARIA;
      case RolesSistema.ProfesorSecundaria:
      case RolesSistema.Tutor:
      case ActoresSistema.ProfesorSecundaria:
        return TipoPersonal.PROFESOR_SECUNDARIA;
      case RolesSistema.Auxiliar:
      case ActoresSistema.Auxiliar:
        return TipoPersonal.AUXILIAR;
      case RolesSistema.PersonalAdministrativo:
      case ActoresSistema.PersonalAdministrativo:
        return TipoPersonal.PERSONAL_ADMINISTRATIVO;
      default:
        throw new Error(`Rol no válido o no soportado: ${rol}`);
    }
  }

  /**
   * Determina el estado de asistencia basado en el desfase de tiempo
   */
  private determinarEstadoAsistencia(
    desfaseSegundos: number,
    modoRegistro: ModoRegistro
  ): EstadosAsistenciaPersonal {
    const TOLERANCIA_TARDANZA = MINUTOS_TOLERANCIA_ENTRADA_PERSONAL * 60;
    const TOLERANCIA_TEMPRANO = MINUTOS_TOLERANCIA_SALIDA_PERSONAL * 60;

    if (modoRegistro === ModoRegistro.Entrada) {
      if (desfaseSegundos <= 0) {
        return EstadosAsistenciaPersonal.En_Tiempo;
      } else if (desfaseSegundos <= TOLERANCIA_TARDANZA) {
        return EstadosAsistenciaPersonal.En_Tiempo; // Tolerancia de 5 minutos
      } else {
        return EstadosAsistenciaPersonal.Tarde;
      }
    } else {
      if (desfaseSegundos >= 0) {
        return EstadosAsistenciaPersonal.Cumplido;
      } else if (desfaseSegundos >= -TOLERANCIA_TEMPRANO) {
        return EstadosAsistenciaPersonal.Cumplido; // Tolerancia de 15 minutos
      } else {
        return EstadosAsistenciaPersonal.Salida_Anticipada;
      }
    }
  }

  /**
   * Calcula el día escolar del mes (sin contar fines de semana)
   */
  private calcularDiaEscolarDelMes(): number {
    const fechaActual = new Date();
    const anio = fechaActual.getFullYear();
    const mes = fechaActual.getMonth(); // 0-11
    const diaActual = fechaActual.getDate();

    let diaEscolar = 0;

    // Contar solo días hábiles (lunes a viernes) desde el inicio del mes hasta hoy
    for (let dia = 1; dia <= diaActual; dia++) {
      const fecha = new Date(anio, mes, dia);
      const diaSemana = fecha.getDay(); // 0=domingo, 1=lunes, ..., 6=sábado

      // Si es día hábil (lunes a viernes)
      if (diaSemana >= 1 && diaSemana <= 5) {
        diaEscolar++;
      }
    }

    return diaEscolar;
  }

  /**
   * Determina si debemos consultar la API basándose en el día escolar
   */
  private debeConsultarAPI(diaEscolar: number): boolean {
    // Si estamos en el primer día escolar del mes, es seguro que no hay IDs en PostgreSQL
    if (diaEscolar <= 1) {
      return false;
    }

    // A partir del segundo día escolar, es probable que ya tengamos registros con IDs
    return diaEscolar >= DIA_ESCOLAR_MINIMO_PARA_CONSULTAR_API;
  }

  /**
   * ✅ NUEVA FUNCIÓN: Verifica si los registros locales necesitan actualización
   */
  private verificarSiNecesitaActualizacion(
    registroEntrada: AsistenciaMensualPersonal | null,
    registroSalida: AsistenciaMensualPersonal | null,
    diaActual: number
  ): boolean {
    // Calcular el último día registrado en ambos registros
    let ultimoDiaEntrada = 0;
    let ultimoDiaSalida = 0;

    if (registroEntrada && registroEntrada.registros) {
      const diasEntrada = Object.keys(registroEntrada.registros)
        .map((d) => parseInt(d))
        .filter((d) => !isNaN(d));
      ultimoDiaEntrada = diasEntrada.length > 0 ? Math.max(...diasEntrada) : 0;
    }

    if (registroSalida && registroSalida.registros) {
      const diasSalida = Object.keys(registroSalida.registros)
        .map((d) => parseInt(d))
        .filter((d) => !isNaN(d));
      ultimoDiaSalida = diasSalida.length > 0 ? Math.max(...diasSalida) : 0;
    }

    const ultimoDiaLocal = Math.max(ultimoDiaEntrada, ultimoDiaSalida);

    // Si el último día local es menor que el día actual - 1, necesita actualización
    // (dejamos margen de 1 día para evitar consultas constantes)
    const necesitaActualizacion = ultimoDiaLocal < diaActual - 1;

    console.log(`🔍 Verificación actualización:`, {
      ultimoDiaEntrada,
      ultimoDiaSalida,
      ultimoDiaLocal,
      diaActual,
      necesitaActualizacion,
    });

    return necesitaActualizacion;
  }

  /**
   * ✅ NUEVA FUNCIÓN: Elimina registros mensuales locales
   */
  private async eliminarRegistroMensual(
    tipoPersonal: TipoPersonal,
    modoRegistro: ModoRegistro,
    dni: string,
    mes: number
  ): Promise<void> {
    try {
      await IndexedDBConnection.init();
      const storeName = this.getStoreName(tipoPersonal, modoRegistro);
      const store = await IndexedDBConnection.getStore(storeName, "readwrite");
      const indexName = this.getIndexNameForPersonalMes(tipoPersonal);

      return new Promise((resolve, reject) => {
        try {
          const index = store.index(indexName);
          const keyValue = [dni, mes];
          const request = index.get(keyValue);

          request.onsuccess = () => {
            if (request.result) {
              const idField = this.getIdFieldForStore(
                tipoPersonal,
                modoRegistro
              );
              const id = request.result[idField];

              const deleteRequest = store.delete(id);
              deleteRequest.onsuccess = () => {
                console.log(
                  `🗑️ Registro eliminado: ${storeName} - ${dni} - mes ${mes}`
                );
                resolve();
              };
              deleteRequest.onerror = (event) => {
                reject(
                  new Error(
                    `Error al eliminar registro: ${
                      (event.target as IDBRequest).error
                    }`
                  )
                );
              };
            } else {
              resolve(); // No hay registro que eliminar
            }
          };

          request.onerror = (event) => {
            reject(
              new Error(
                `Error al buscar registro para eliminar: ${
                  (event.target as IDBRequest).error
                }`
              )
            );
          };
        } catch (error) {
          reject(error);
        }
      });
    } catch (error) {
      console.error("Error al eliminar registro mensual:", error);
      throw error;
    }
  }

  /**
   * Maneja los errores según su tipo y realiza logout si es necesario
   */
  private handleError(
    error: unknown,
    operacion: string,
    detalles?: Record<string, any>
  ): void {
    console.error(`Error en AsistenciaDePersonalIDB (${operacion}):`, error);

    const errorDetails: ErrorDetailsForLogout = {
      origen: `AsistenciaDePersonalIDB.${operacion}`,
      mensaje: error instanceof Error ? error.message : String(error),
      timestamp: Date.now(),
      contexto: JSON.stringify(detalles || {}),
      siasisComponent: "CLN01",
    };

    let logoutType: LogoutTypes;

    if (error instanceof Error) {
      if (error.name === "QuotaExceededError") {
        logoutType = LogoutTypes.ERROR_BASE_DATOS;
      } else if (error.name === "AbortError") {
        logoutType = LogoutTypes.ERROR_BASE_DATOS;
      } else {
        logoutType = LogoutTypes.ERROR_SISTEMA;
      }
    } else {
      logoutType = LogoutTypes.ERROR_SISTEMA;
    }

    logout(logoutType, errorDetails);
  }

  /**
   * Verifica si existe un registro mensual para un personal específico
   */
  private async verificarExistenciaRegistroMensual(
    tipoPersonal: TipoPersonal,
    modoRegistro: ModoRegistro,
    dni: string,
    mes: number
  ): Promise<number | null> {
    try {
      await IndexedDBConnection.init();
      const storeName = this.getStoreName(tipoPersonal, modoRegistro);
      const store = await IndexedDBConnection.getStore(storeName, "readonly");
      const indexName = this.getIndexNameForPersonalMes(tipoPersonal);
      const idField = this.getIdFieldForStore(tipoPersonal, modoRegistro);

      return new Promise((resolve, reject) => {
        try {
          const index = store.index(indexName);
          const keyValue = [dni, mes];
          const request = index.get(keyValue);

          request.onsuccess = () => {
            if (request.result) {
              resolve(request.result[idField]);
            } else {
              resolve(null);
            }
          };

          request.onerror = (event) => {
            reject(
              new Error(
                `Error al verificar existencia: ${
                  (event.target as IDBRequest).error
                }`
              )
            );
          };
        } catch (error) {
          reject(error);
        }
      });
    } catch (error) {
      console.error(
        "Error al verificar existencia de registro mensual:",
        error
      );
      return null;
    }
  }

  /**
   * Consulta la API para obtener asistencias mensuales
   */
  private async consultarAsistenciasMensualesAPI(
    rol: RolesSistema | ActoresSistema,
    dni: string,
    mes: number
  ): Promise<AsistenciaCompletaMensualDePersonal | null> {
    try {
      const { fetchSiasisAPI } = fetchSiasisApiGenerator(this.siasisAPI);

      const fetchCancelable = await fetchSiasisAPI({
        endpoint: `/api/personal/asistencias-mensuales?Rol=${rol}&DNI=${dni}&Mes=${mes}`,
        method: "GET",
      });

      if (!fetchCancelable) {
        throw new Error(
          "No se pudo crear la petición de asistencias mensuales"
        );
      }

      const response = await fetchCancelable.fetch();

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`Error al obtener asistencias: ${response.statusText}`);
      }

      const objectResponse = (await response.json()) as ApiResponseBase;

      if (!objectResponse.success) {
        if (
          (objectResponse as ErrorResponseAPIBase).errorType ===
          DataErrorTypes.NO_DATA_AVAILABLE
        ) {
          return null;
        }
        throw new Error(`Error en respuesta: ${objectResponse.message}`);
      }

      const { data } =
        objectResponse as GetAsistenciaMensualDePersonalSuccessResponse;
      return data;
    } catch (error) {
      console.error(
        "Error al consultar asistencias mensuales desde API:",
        error
      );
      return null;
    }
  }

  /**
   * Procesa los registros JSON de la API
   */
  private procesarRegistrosJSON(
    registrosJSON: any,
    modoRegistro: ModoRegistro
  ): Record<string, RegistroEntradaSalida> {
    const registrosProcesados: Record<string, RegistroEntradaSalida> = {};

    Object.entries(registrosJSON).forEach(
      ([dia, registroRaw]: [string, any]) => {
        if (registroRaw === null) {
          registrosProcesados[dia] = {
            timestamp: 0,
            desfaseSegundos: 0,
            estado: EstadosAsistenciaPersonal.Inactivo,
          };
          return;
        }

        if (registroRaw && typeof registroRaw === "object") {
          const timestamp = registroRaw.Timestamp;
          const desfaseSegundos = registroRaw.DesfaseSegundos;

          if (timestamp === null && desfaseSegundos === null) {
            registrosProcesados[dia] = {
              timestamp: 0,
              desfaseSegundos: 0,
              estado: EstadosAsistenciaPersonal.Falta,
            };
            return;
          }

          if (timestamp === null) {
            registrosProcesados[dia] = {
              timestamp: 0,
              desfaseSegundos: 0,
              estado: EstadosAsistenciaPersonal.Inactivo,
            };
            return;
          }

          if (desfaseSegundos === null) {
            registrosProcesados[dia] = {
              timestamp: timestamp || 0,
              desfaseSegundos: 0,
              estado: EstadosAsistenciaPersonal.Sin_Registro,
            };
            return;
          }

          const estado = this.determinarEstadoAsistencia(
            desfaseSegundos,
            modoRegistro
          );

          registrosProcesados[dia] = {
            timestamp: timestamp || 0,
            desfaseSegundos: desfaseSegundos || 0,
            estado,
          };
        }
      }
    );

    return registrosProcesados;
  }

  /**
   * Guarda un registro mensual de asistencia usando el ID real de la API
   */
  public async guardarRegistroMensual(
    tipoPersonal: TipoPersonal,
    modoRegistro: ModoRegistro,
    datos: AsistenciaMensualPersonal
  ): Promise<void> {
    try {
      await IndexedDBConnection.init();
      const storeName = this.getStoreName(tipoPersonal, modoRegistro);
      const store = await IndexedDBConnection.getStore(storeName, "readwrite");
      const idFieldName = this.getIdFieldName(tipoPersonal);
      const idField = this.getIdFieldForStore(tipoPersonal, modoRegistro);

      return new Promise((resolve, reject) => {
        try {
          const registroToSave: any = {
            [idField]: datos.Id_Registro_Mensual,
            Mes: datos.mes,
            [idFieldName]: datos.Dni_Personal,
          };

          if (modoRegistro === ModoRegistro.Entrada) {
            registroToSave.Entradas = datos.registros;
          } else {
            registroToSave.Salidas = datos.registros;
          }

          const putRequest = store.put(registroToSave);

          putRequest.onsuccess = () => {
            resolve();
          };

          putRequest.onerror = (event) => {
            reject(
              new Error(
                `Error al guardar registro mensual: ${
                  (event.target as IDBRequest).error
                }`
              )
            );
          };
        } catch (error) {
          reject(error);
        }
      });
    } catch (error) {
      this.handleError(error, "guardarRegistroMensual", {
        tipoPersonal,
        modoRegistro,
        Dni_Personal: datos.Dni_Personal,
        mes: datos.mes,
        Id_Registro_Mensual: datos.Id_Registro_Mensual,
      });
      throw error;
    }
  }

  /**
   * Obtiene el registro mensual de asistencia para un personal específico
   */
  public async obtenerRegistroMensual(
    tipoPersonal: TipoPersonal,
    modoRegistro: ModoRegistro,
    Dni_Personal: string,
    mes: number,
    id_registro_mensual?: number
  ): Promise<AsistenciaMensualPersonal | null> {
    try {
      await IndexedDBConnection.init();
      const storeName = this.getStoreName(tipoPersonal, modoRegistro);
      const store = await IndexedDBConnection.getStore(storeName, "readonly");

      if (id_registro_mensual) {
        return new Promise((resolve, reject) => {
          try {
            const request = store.get(id_registro_mensual);

            request.onsuccess = () => {
              if (request.result) {
                const registroMensual: AsistenciaMensualPersonal =
                  this.mapearRegistroMensualDesdeStore(
                    request.result,
                    tipoPersonal,
                    modoRegistro
                  );
                resolve(registroMensual);
              } else {
                resolve(null);
              }
            };

            request.onerror = (event) => {
              reject(
                new Error(
                  `Error al obtener registro mensual por ID: ${
                    (event.target as IDBRequest).error
                  }`
                )
              );
            };
          } catch (error) {
            reject(error);
          }
        });
      }

      const indexName = this.getIndexNameForPersonalMes(tipoPersonal);

      return new Promise((resolve, reject) => {
        try {
          const index = store.index(indexName);
          const keyValue = [Dni_Personal, mes];
          const request = index.get(keyValue);

          request.onsuccess = () => {
            if (request.result) {
              const registroMensual: AsistenciaMensualPersonal =
                this.mapearRegistroMensualDesdeStore(
                  request.result,
                  tipoPersonal,
                  modoRegistro
                );
              resolve(registroMensual);
            } else {
              resolve(null);
            }
          };

          request.onerror = (event) => {
            reject(
              new Error(
                `Error al obtener registro mensual por índice: ${
                  (event.target as IDBRequest).error
                }`
              )
            );
          };
        } catch (error) {
          reject(error);
        }
      });
    } catch (error) {
      this.handleError(error, "obtenerRegistroMensual", {
        tipoPersonal,
        modoRegistro,
        Dni_Personal,
        mes,
        id_registro_mensual,
      });
      throw error;
    }
  }

  /**
   * Mapea un registro obtenido del store a la interfaz AsistenciaMensualPersonal
   */
  private mapearRegistroMensualDesdeStore(
    registroStore: any,
    tipoPersonal: TipoPersonal,
    modoRegistro: ModoRegistro
  ): AsistenciaMensualPersonal {
    const idField = this.getIdFieldForStore(tipoPersonal, modoRegistro);
    const idPersonalField = this.getIdFieldName(tipoPersonal);

    return {
      Id_Registro_Mensual: registroStore[idField],
      mes: registroStore.Mes,
      Dni_Personal: registroStore[idPersonalField],
      registros:
        modoRegistro === ModoRegistro.Entrada
          ? registroStore.Entradas
          : registroStore.Salidas,
    };
  }

  /**
   * Actualiza un registro existente agregando un nuevo día
   */
  private async actualizarRegistroExistente(
    tipoPersonal: TipoPersonal,
    modoRegistro: ModoRegistro,
    dni: string,
    mes: number,
    dia: number,
    registro: RegistroEntradaSalida,
    idRegistroExistente: number
  ): Promise<void> {
    try {
      const registroActual = await this.obtenerRegistroMensual(
        tipoPersonal,
        modoRegistro,
        dni,
        mes,
        idRegistroExistente
      );

      if (registroActual) {
        registroActual.registros[dia.toString()] = registro;
        await this.guardarRegistroMensual(
          tipoPersonal,
          modoRegistro,
          registroActual
        );
      }
    } catch (error) {
      this.handleError(error, "actualizarRegistroExistente", {
        tipoPersonal,
        modoRegistro,
        dni,
        mes,
        dia,
      });
      throw error;
    }
  }

  /**
   * ✅ FUNCIÓN MODIFICADA: Obtiene asistencias mensuales con lógica inteligente de actualización
   */
  public async obtenerAsistenciaMensualConAPI(
    rol: RolesSistema,
    dni: string,
    mes: number
  ): Promise<{
    entrada?: AsistenciaMensualPersonal;
    salida?: AsistenciaMensualPersonal;
    encontrado: boolean;
    mensaje: string;
  }> {
    try {
      const tipoPersonal = this.obtenerTipoPersonalDesdeRolOActor(rol);

      // PASO 1: Buscar primero en local (entrada y salida)
      const [registroEntradaLocal, registroSalidaLocal] = await Promise.all([
        this.obtenerRegistroMensual(
          tipoPersonal,
          ModoRegistro.Entrada,
          dni,
          mes
        ),
        this.obtenerRegistroMensual(
          tipoPersonal,
          ModoRegistro.Salida,
          dni,
          mes
        ),
      ]);

      // PASO 2: ✅ NUEVA LÓGICA - Verificar si los datos están actualizados
      const fechaActual = new Date();
      const mesActual = fechaActual.getMonth() + 1;
      const diaActual = fechaActual.getDate();
      const anioActual = fechaActual.getFullYear();

      // Solo verificar actualización para el mes en curso
      if (mes === mesActual && (registroEntradaLocal || registroSalidaLocal)) {
        const necesitaActualizacion = this.verificarSiNecesitaActualizacion(
          registroEntradaLocal,
          registroSalidaLocal,
          diaActual
        );

        if (necesitaActualizacion) {
          console.log(
            `🔄 Datos locales desactualizados para mes ${mes}, consultando API...`
          );

          // Hacer petición a la API para obtener datos actualizados
          const asistenciaAPI = await this.consultarAsistenciasMensualesAPI(
            rol,
            dni,
            mes
          );

          if (asistenciaAPI) {
            // Eliminar registros locales antiguos
            await Promise.all([
              this.eliminarRegistroMensual(
                tipoPersonal,
                ModoRegistro.Entrada,
                dni,
                mes
              ),
              this.eliminarRegistroMensual(
                tipoPersonal,
                ModoRegistro.Salida,
                dni,
                mes
              ),
            ]);

            // Actualizar datos locales con la información más reciente
            await this.procesarYGuardarAsistenciaDesdeAPI(asistenciaAPI);

            // Obtener los registros actualizados
            const [nuevaEntrada, nuevaSalida] = await Promise.all([
              this.obtenerRegistroMensual(
                tipoPersonal,
                ModoRegistro.Entrada,
                dni,
                mes,
                asistenciaAPI.Id_Registro_Mensual_Entrada
              ),
              this.obtenerRegistroMensual(
                tipoPersonal,
                ModoRegistro.Salida,
                dni,
                mes,
                asistenciaAPI.Id_Registro_Mensual_Salida
              ),
            ]);

            return {
              entrada: nuevaEntrada || undefined,
              salida: nuevaSalida || undefined,
              encontrado: true,
              mensaje: "Datos actualizados desde la API", // ← Nuevo mensaje
            };
          }
        }
      }

      // PASO 3: Si hay datos locales y no necesitan actualización, usarlos
      if (registroEntradaLocal || registroSalidaLocal) {
        return {
          entrada: registroEntradaLocal || undefined,
          salida: registroSalidaLocal || undefined,
          encontrado: true,
          mensaje: "Datos obtenidos desde caché local",
        };
      }

      // PASO 4: No hay datos locales, verificar si debemos consultar la API
      // Solo consultar API para mes actual o anteriores del año actual
      if (mes > mesActual && anioActual === new Date().getFullYear()) {
        return {
          encontrado: false,
          mensaje: "No hay datos disponibles para meses futuros",
        };
      }

      // PASO 5: Consultar la API una sola vez
      console.log(`📡 Consultando API para ${rol} ${dni} - mes ${mes}...`);

      const asistenciaAPI = await this.consultarAsistenciasMensualesAPI(
        rol,
        dni,
        mes
      );

      if (asistenciaAPI) {
        // PASO 6: Procesar y guardar datos de la API
        await this.procesarYGuardarAsistenciaDesdeAPI(asistenciaAPI);

        // Obtener los registros recién guardados
        const [nuevaEntrada, nuevaSalida] = await Promise.all([
          this.obtenerRegistroMensual(
            tipoPersonal,
            ModoRegistro.Entrada,
            dni,
            mes,
            asistenciaAPI.Id_Registro_Mensual_Entrada
          ),
          this.obtenerRegistroMensual(
            tipoPersonal,
            ModoRegistro.Salida,
            dni,
            mes,
            asistenciaAPI.Id_Registro_Mensual_Salida
          ),
        ]);

        return {
          entrada: nuevaEntrada || undefined,
          salida: nuevaSalida || undefined,
          encontrado: true,
          mensaje: "Datos obtenidos y sincronizados desde la API",
        };
      } else {
        // PASO 7: La API no tiene datos
        return {
          encontrado: false,
          mensaje:
            "No se encontraron registros de asistencia para el mes consultado",
        };
      }
    } catch (error) {
      console.error("Error al obtener asistencias mensuales con API:", error);
      this.handleError(error, "obtenerAsistenciaMensualConAPI", {
        rol,
        dni,
        mes,
      });

      return {
        encontrado: false,
        mensaje: "Error al obtener los datos de asistencia",
      };
    }
  }

  private async procesarYGuardarAsistenciaDesdeAPI(
    asistenciaAPI: AsistenciaCompletaMensualDePersonal,
    modoRegistroSolicitado?: ModoRegistro
  ): Promise<void> {
    const tipoPersonal = this.obtenerTipoPersonalDesdeRolOActor(
      asistenciaAPI.Rol
    );

    const procesarYGuardar = async (modoRegistro: ModoRegistro) => {
      const registrosData =
        modoRegistro === ModoRegistro.Entrada
          ? asistenciaAPI.Entradas
          : asistenciaAPI.Salidas;

      const idReal =
        modoRegistro === ModoRegistro.Entrada
          ? asistenciaAPI.Id_Registro_Mensual_Entrada
          : asistenciaAPI.Id_Registro_Mensual_Salida;

      const registrosProcesados = this.procesarRegistrosJSON(
        registrosData,
        modoRegistro
      );

      if (Object.keys(registrosProcesados).length > 0) {
        await this.guardarRegistroMensual(tipoPersonal, modoRegistro, {
          Id_Registro_Mensual: idReal,
          mes: asistenciaAPI.Mes,
          Dni_Personal: asistenciaAPI.DNI_Usuario,
          registros: registrosProcesados,
        });
      }
    };

    if (modoRegistroSolicitado) {
      await procesarYGuardar(modoRegistroSolicitado);
    } else {
      await Promise.all([
        procesarYGuardar(ModoRegistro.Entrada),
        procesarYGuardar(ModoRegistro.Salida),
      ]);
    }
  }

  /**
   * ✅ NUEVA FUNCIÓN: Fuerza la actualización desde la API eliminando datos locales
   */
  public async forzarActualizacionDesdeAPI(
    rol: RolesSistema,
    dni: string,
    mes: number
  ): Promise<{
    entrada?: AsistenciaMensualPersonal;
    salida?: AsistenciaMensualPersonal;
    encontrado: boolean;
    mensaje: string;
  }> {
    try {
      const tipoPersonal = this.obtenerTipoPersonalDesdeRolOActor(rol);

      console.log(
        `🔄 Forzando actualización desde API para ${rol} ${dni} - mes ${mes}...`
      );

      // Eliminar registros locales existentes
      await Promise.all([
        this.eliminarRegistroMensual(
          tipoPersonal,
          ModoRegistro.Entrada,
          dni,
          mes
        ),
        this.eliminarRegistroMensual(
          tipoPersonal,
          ModoRegistro.Salida,
          dni,
          mes
        ),
      ]);

      // Consultar API y guardar
      return await this.obtenerAsistenciaMensualConAPI(rol, dni, mes);
    } catch (error) {
      console.error("Error al forzar actualización desde API:", error);
      this.handleError(error, "forzarActualizacionDesdeAPI", {
        rol,
        dni,
        mes,
      });

      return {
        encontrado: false,
        mensaje: "Error al forzar la actualización de datos",
      };
    }
  }

  /**
   * Marca la asistencia de entrada o salida para un personal específico
   * Implementa lógica inteligente para evitar consultas innecesarias
   */
  public async marcarAsistencia({
    datos,
  }: {
    datos: RegistroAsistenciaUnitariaPersonal;
  }): Promise<void> {
    try {
      const {
        ModoRegistro: modoRegistro,
        DNI: dni,
        Rol: rol,
        Dia: dia,
        Detalles,
      } = datos;

      const tipoPersonal = this.obtenerTipoPersonalDesdeRolOActor(rol);
      const fecha = new Date(
        (Detalles as DetallesAsistenciaUnitariaPersonal)!.Timestamp
      );
      const mes = fecha.getMonth() + 1;

      // Calcular el día escolar del mes
      const diaEscolar = this.calcularDiaEscolarDelMes();

      const estado = this.determinarEstadoAsistencia(
        (Detalles as DetallesAsistenciaUnitariaPersonal)!.DesfaseSegundos,
        modoRegistro
      );

      const registro: RegistroEntradaSalida = {
        timestamp: (Detalles as DetallesAsistenciaUnitariaPersonal)!.Timestamp,
        estado: estado,
        desfaseSegundos: (Detalles as DetallesAsistenciaUnitariaPersonal)!
          .DesfaseSegundos,
      };

      // PASO 1: Verificar si ya existe un registro mensual en local
      const idRegistroExistente = await this.verificarExistenciaRegistroMensual(
        tipoPersonal,
        modoRegistro,
        dni,
        mes
      );

      if (idRegistroExistente) {
        // Caso 1: Ya existe registro local, simplemente agregar el día
        console.log(
          `Registro existente encontrado (ID: ${idRegistroExistente}), agregando día ${dia}`
        );
        await this.actualizarRegistroExistente(
          tipoPersonal,
          modoRegistro,
          dni,
          mes,
          dia,
          registro,
          idRegistroExistente
        );

        console.log(
          `Asistencia marcada exitosamente: ${rol} ${dni} - ${modoRegistro} - ${estado}`
        );
        return;
      }

      // PASO 2: No existe registro local, aplicar lógica inteligente
      console.log(`Día escolar del mes: ${diaEscolar}`);

      if (!this.debeConsultarAPI(diaEscolar)) {
        // Caso 2: Primer día escolar del mes - es seguro que no hay IDs en PostgreSQL
        console.log(
          `Primer día escolar del mes (${diaEscolar}), omitiendo guardado hasta que se generen los IDs en PostgreSQL`
        );

        // TODO: Implementar tabla temporal para asistencias del día actual
        // Esta tabla almacenaría los registros de asistencia del día actual que aún no tienen
        // ID de PostgreSQL. Se podría llamar "asistencias_diarias_temporales" y tendría:
        // - id_local (generado automáticamente)
        // - dni, rol, modo_registro, dia, mes, timestamp, desfase_segundos, estado
        // - fecha_creacion (para limpiar registros antiguos)
        //
        // Luego, cuando la tarea nocturna transfiera los datos a PostgreSQL, se podría
        // implementar un proceso que:
        // 1. Consulte la API para obtener los nuevos IDs
        // 2. Migre los datos de la tabla temporal a las tablas definitivas
        // 3. Limpie los registros temporales procesados

        console.log(
          `Registro omitido temporalmente - Día: ${dia}, DNI: ${dni}, Modo: ${modoRegistro}`
        );
        return;
      }

      // Caso 3: A partir del segundo día escolar - consultar API para verificar si ya hay registros
      console.log(
        `Día escolar ${diaEscolar} >= ${DIA_ESCOLAR_MINIMO_PARA_CONSULTAR_API}, consultando API...`
      );

      const asistenciaAPI = await this.consultarAsistenciasMensualesAPI(
        rol,
        dni,
        mes
      );

      if (asistenciaAPI) {
        // Caso 3a: La API devolvió datos - procesar y guardar con IDs reales
        console.log(
          `Datos obtenidos de la API para ${dni} - mes ${mes}, procesando...`
        );
        await this.procesarYGuardarAsistenciaDesdeAPI(
          asistenciaAPI,
          modoRegistro
        );

        // Ahora obtener el registro recién guardado y agregar el día actual
        const idRegistroNuevo =
          modoRegistro === ModoRegistro.Entrada
            ? asistenciaAPI.Id_Registro_Mensual_Entrada
            : asistenciaAPI.Id_Registro_Mensual_Salida;

        await this.actualizarRegistroExistente(
          tipoPersonal,
          modoRegistro,
          dni,
          mes,
          dia,
          registro,
          idRegistroNuevo
        );

        console.log(
          `Asistencia marcada con datos de API: ${rol} ${dni} - ${modoRegistro} - ${estado}`
        );
      } else {
        // Caso 3b: La API no devolvió datos - aún no se ha transferido desde Redis
        console.log(
          `API no devolvió datos para ${dni} - mes ${mes}, registro aún en Redis. Omitiendo guardado.`
        );

        // TODO: También se podría guardar en la tabla temporal mencionada arriba
        // para procesar más tarde cuando los datos estén disponibles en PostgreSQL

        console.log(`Registro omitido - Redis aún no transferido a PostgreSQL`);
        return;
      }
    } catch (error) {
      this.handleError(error, "marcarAsistencia", {
        modo: datos.ModoRegistro,
        dni: datos.DNI,
        rol: datos.Rol,
        dia: datos.Dia,
      });
      throw error;
    }
  }

  /**
   * Sincroniza las asistencias registradas en Redis con la base de datos local IndexedDB
   */
  public async sincronizarAsistenciasDesdeRedis(
    datosRedis: ConsultarAsistenciasDiariasPorActorEnRedisResponseBody
  ): Promise<{
    totalRegistros: number;
    registrosNuevos: number;
    registrosExistentes: number;
    errores: number;
  }> {
    const stats = {
      totalRegistros: datosRedis.Resultados.length,
      registrosNuevos: 0,
      registrosExistentes: 0,
      errores: 0,
    };

    try {
      const tipoPersonal = this.obtenerTipoPersonalDesdeRolOActor(
        datosRedis.Actor
      );

      const mesActual = datosRedis.Mes;
      const diaActual = datosRedis.Dia;

      if (diaActual === 0) {
        console.error(
          "No se pudo determinar el día desde los resultados de Redis"
        );
        return {
          ...stats,
          errores: stats.totalRegistros,
        };
      }

      for (const resultado of datosRedis.Resultados) {
        try {
          const registroExistente = await this.verificarSiExisteRegistroDiario(
            tipoPersonal,
            datosRedis.ModoRegistro,
            resultado.DNI,
            mesActual,
            diaActual
          );

          if (registroExistente) {
            stats.registrosExistentes++;
            continue;
          }

          const registro: RegistroAsistenciaUnitariaPersonal = {
            ModoRegistro: datosRedis.ModoRegistro,
            DNI: resultado.DNI,
            Rol: datosRedis.Actor,
            Dia: diaActual,
            Detalles: resultado.Detalles && {
              Timestamp: (
                resultado.Detalles as DetallesAsistenciaUnitariaPersonal
              ).Timestamp,
              DesfaseSegundos: (
                resultado.Detalles as DetallesAsistenciaUnitariaPersonal
              ).DesfaseSegundos,
            },
            esNuevoRegistro: true,
          };

          await this.marcarAsistencia({
            datos: registro,
          });

          stats.registrosNuevos++;
        } catch (error) {
          console.error(
            `Error al sincronizar registro para DNI ${resultado.DNI}:`,
            error
          );
          stats.errores++;
        }
      }

      return stats;
    } catch (error) {
      this.handleError(error, "sincronizarAsistenciasDesdeRedis", {
        actor: datosRedis.Actor,
        modoRegistro: datosRedis.ModoRegistro,
        mes: datosRedis.Mes,
        totalRegistros: datosRedis.Resultados.length,
      });

      return {
        ...stats,
        errores: stats.totalRegistros,
      };
    }
  }

  /**
   * Verifica si ya existe un registro diario para un personal específico
   */
  private async verificarSiExisteRegistroDiario(
    tipoPersonal: TipoPersonal,
    modoRegistro: ModoRegistro,
    dni: string,
    mes: number,
    dia: number
  ): Promise<boolean> {
    try {
      await IndexedDBConnection.init();
      const storeName = this.getStoreName(tipoPersonal, modoRegistro);
      const store = await IndexedDBConnection.getStore(storeName, "readonly");
      const indexName = this.getIndexNameForPersonalMes(tipoPersonal);

      return new Promise((resolve, reject) => {
        try {
          const index = store.index(indexName);
          const keyValue = [dni, mes];
          const request = index.get(keyValue);

          request.onsuccess = () => {
            if (request.result) {
              const registrosDias =
                modoRegistro === ModoRegistro.Entrada
                  ? request.result.Entradas
                  : request.result.Salidas;

              if (registrosDias && registrosDias[dia.toString()]) {
                resolve(true);
                return;
              }
            }
            resolve(false);
          };

          request.onerror = (event) => {
            reject(
              new Error(
                `Error al verificar existencia de registro diario: ${
                  (event.target as IDBRequest).error
                }`
              )
            );
          };
        } catch (error) {
          reject(error);
        }
      });
    } catch (error) {
      console.error("Error al verificar existencia de registro diario:", error);
      return false;
    }
  }

  /**
   * Verifica si un personal ha marcado asistencia (entrada o salida) hoy
   */
  public async hasMarcadoHoy(
    modoRegistro: ModoRegistro,
    rol: RolesSistema,
    dni: string
  ): Promise<{
    marcado: boolean;
    timestamp?: number;
    desfaseSegundos?: number;
    estado?: string;
  }> {
    try {
      const tipoPersonal = this.obtenerTipoPersonalDesdeRolOActor(rol);
      const fecha = new Date();
      const mes = fecha.getMonth() + 1;
      const dia = fecha.getDate();

      const haRegistrado = await this.verificarSiExisteRegistroDiario(
        tipoPersonal,
        modoRegistro,
        dni,
        mes,
        dia
      );

      if (haRegistrado) {
        // Obtener los detalles del registro
        const registroMensual = await this.obtenerRegistroMensual(
          tipoPersonal,
          modoRegistro,
          dni,
          mes
        );

        if (registroMensual && registroMensual.registros[dia.toString()]) {
          const registroDia = registroMensual.registros[dia.toString()];
          return {
            marcado: true,
            timestamp: registroDia.timestamp,
            desfaseSegundos: registroDia.desfaseSegundos,
            estado: registroDia.estado,
          };
        }
      }

      return { marcado: false };
    } catch (error) {
      console.error("Error al verificar si ha marcado hoy:", error);
      return { marcado: false };
    }
  }

  /**
   * Obtiene todos los registros mensuales para un tipo de personal y un mes específico
   */
  public async obtenerTodosRegistrosMensuales(
    tipoPersonal: TipoPersonal,
    modoRegistro: ModoRegistro,
    mes: Meses
  ): Promise<AsistenciaMensualPersonal[]> {
    try {
      await IndexedDBConnection.init();
      const storeName = this.getStoreName(tipoPersonal, modoRegistro);
      const store = await IndexedDBConnection.getStore(storeName, "readonly");
      const idFieldName = this.getIdFieldName(tipoPersonal);
      const idField = this.getIdFieldForStore(tipoPersonal, modoRegistro);

      return new Promise((resolve, reject) => {
        try {
          const index = store.index("por_mes");
          const request = index.getAll(mes);

          request.onsuccess = () => {
            if (request.result && request.result.length > 0) {
              const registrosMensuales: AsistenciaMensualPersonal[] =
                request.result.map((item) => ({
                  Id_Registro_Mensual: item[idField], // Corregido: usar el valor real del campo ID
                  mes: item.Mes,
                  Dni_Personal: item[idFieldName],
                  registros:
                    modoRegistro === ModoRegistro.Entrada
                      ? item.Entradas
                      : item.Salidas,
                }));

              resolve(registrosMensuales);
            } else {
              resolve([]);
            }
          };

          request.onerror = (event) => {
            reject(
              new Error(
                `Error al obtener registros mensuales: ${
                  (event.target as IDBRequest).error
                }`
              )
            );
          };
        } catch (error) {
          reject(error);
        }
      });
    } catch (error) {
      this.handleError(error, "obtenerTodosRegistrosMensuales", {
        tipoPersonal,
        modoRegistro,
        mes,
      });
      throw error;
    }
  }

  /**
   * Maneja los errores de operaciones con IndexedDB adaptado al patrón actual
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

    this.setError({
      success: false,
      message: message,
      errorType: errorType,
    });
  }

  /**
   * Establece un mensaje de éxito usando el patrón actual
   */
  private handleSuccess(message: string): void {
    const successResponse: MessageProperty = { message };
    this.setSuccessMessage?.(successResponse);
  }
}
