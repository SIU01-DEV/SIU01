import { SuccessResponseAPIBase } from "@/interfaces/shared/apis/types";
import { ITablaInfo } from "@/interfaces/shared/TablasSistema";
import comprobarSincronizacionDeTabla from "@/lib/helpers/validations/comprobarSincronizacionDeTabla";
import { EndpointSiasis } from "@/lib/utils/backend/endpoints/EndpointSiasis";

export abstract class SiasisService {

  abstract siasisEndpointFuente: EndpointSiasis<string, SuccessResponseAPIBase>;
  abstract tablasSistemaRelacionadas: ITablaInfo[];

  protected async seNecesitaConsultar(): Promise<boolean> {
    for (const tablaSistema of this.tablasSistemaRelacionadas) {
      if (await comprobarSincronizacionDeTabla(tablaSistema, "API01")) {
        return true;
      }
    }
    return false;
  }

  protected abstract guardarDatosEnIndexedDB(
    datos: SuccessResponseAPIBase["data"]
  ): Promise<void>;

  async obtenerDatosDeAPI(): Promise<SuccessResponseAPIBase> {
    return await this.siasisEndpointFuente.realizarPeticion();
  }
}
