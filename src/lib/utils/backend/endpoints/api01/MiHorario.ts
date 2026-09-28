import { GetMiHorarioSuccessResponse } from "@/interfaces/shared/apis/api01/mi-horario/types";
import { EndpointSiasis } from "../EndpointSiasis";

export const Endpoint_Get_Mi_Horario_API01 = new EndpointSiasis<
  "/api/mi-horario",
  GetMiHorarioSuccessResponse
>({
  siasisApi: "API01",
  metodoHttp: "GET",
  ruta: "/api/mi-horario",
});
