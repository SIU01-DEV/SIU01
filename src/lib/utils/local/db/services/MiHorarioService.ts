import { ActoresSistema } from "@/interfaces/shared/ActoresSistema";
import { GetMiHorarioSuccessResponse } from "@/interfaces/shared/apis/api01/mi-horario/types";
import TablasSistema, { ITablaInfo } from "@/interfaces/shared/TablasSistema";
import { Endpoint_Get_Mi_Horario_API01 } from "@/lib/utils/backend/endpoints/api01/MiHorario";
import { SiasisService } from "./types/SiasisService";
import { RolesSistema } from "@/interfaces/shared/RolesSistema";
import { SiasisAPIS } from "@/interfaces/shared/SiasisComponents";
import {
  ErrorResponseAPIBase,
  MessageProperty,
} from "@/interfaces/shared/apis/types";
import { AjustesGeneralesSistema } from "../models/AjustesGenerales/AjustesGeneralesSistemaIDB";

export class MiHorarioService extends SiasisService {
  tablasSistemaRelacionadas: ITablaInfo[] = [
    TablasSistema.AJUSTES_SISTEMA,
    TablasSistema.HORARIOS_GENERALES,
    TablasSistema.CURSOS_HORARIO,
  ];

  siasisEndpointFuente = Endpoint_Get_Mi_Horario_API01;

  constructor(
    private siasisAPI: SiasisAPIS = "API01",
    private setIsSomethingLoading?: (isLoading: boolean) => void,
    private setError?: (error: ErrorResponseAPIBase | null) => void,
    private setSuccessMessage?: (message: MessageProperty | null) => void,
  ) {
    super();
  }

  protected async guardarDatosEnIndexedDB(
    datos: GetMiHorarioSuccessResponse["data"],
  ): Promise<void> {
    // IMPLEMENTAR TODA LA LOGICA QUE PERMITA GUARDAR LOS DATOS RECIBIDOS DE LA API EN
    // SUS MODELOS CORRESPONDIENTES DE INDEXED DB

    const { AjustesGeneralesSistemaIDB } =
      await import("../models/AjustesGenerales/AjustesGeneralesSistemaIDB");
    const ajustesGeneralesSistemaIDB = new AjustesGeneralesSistemaIDB(
      this.siasisAPI,
      this.setIsSomethingLoading,
      this.setError,
      this.setSuccessMessage
    );

    switch (datos.Actor) {
      case ActoresSistema.Directivo:

        // ajustesGeneralesSistemaIDB.updateValorByNombre(AjustesGeneralesSistema.)


        break;
      case ActoresSistema.ProfesorPrimaria:
        break;
      case ActoresSistema.Auxiliar:
        break;
      case ActoresSistema.ProfesorSecundaria:
      case ActoresSistema.Tutor:
        break;
      case ActoresSistema.PersonalAdministrativo:
        break;
      default:
        throw new Error(
          "ROL INVALIDO | MiHorarioService.guardarDatosEnIndexedDB",
        );
    }
  }

  // async getMiHorario(): Promise<
  //   ReturnType<GetMiHorarioSuccessResponse["data"]>
  // > {
  //   if (await this.seNecesitaConsultar()) {
  //     const datosObtenidosDeAPI = await this.obtenerDatosDeAPI();
  //     this.guardarDatosEnIndexedDB(datosObtenidosDeAPI.data);
  //     return datosObtenidosDeAPI.data;
  //   }

  //   const { IndexedDBConnection } = await import("../IndexedDBConnection");

  //   switch (IndexedDBConnection.rol) {
  //     case RolesSistema.Directivo:
  //       break;
  //     case RolesSistema.ProfesorPrimaria:
  //       break;
  //     case RolesSistema.Auxiliar:
  //       break;

  //     case RolesSistema.ProfesorSecundaria:
  //     case RolesSistema.Tutor:
  //       break;
  //     case RolesSistema.PersonalAdministrativo:
  //       break;

  //     default:
  //       throw new Error("ROL INVALIDO | MiHorarioService.getMiHorario");
  //   }
  // }
}
