import ItemTomaAsistencia, {
  PersonalParaTomarAsistencia,
} from "./ItemTomaAsistencia";
import { Speaker } from "../../lib/utils/voice/Speaker";
import {
  ModoRegistro,
  modoRegistroTextos,
} from "@/interfaces/shared/ModoRegistroPersonal";
import { HandlerDirectivoAsistenciaResponse } from "@/lib/utils/local/db/models/DatosAsistenciaHoy/handlers/HandlerDirectivoAsistenciaResponse";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  RegistrarAsistenciaIndividualRequestBody,
  RegistrarAsistenciaIndividualSuccessResponse,
} from "@/interfaces/shared/apis/api01/asistencia/types";
import { AsistenciaDePersonalIDB } from "../../lib/utils/local/db/models/AsistenciaDePersonal/AsistenciaDePersonalIDB";
import { FechaHoraActualRealState } from "@/global/state/others/fechaHoraActualReal";
import { RolesSistema } from "@/interfaces/shared/RolesSistema";
import { ActoresSistema } from "@/interfaces/shared/ActoresSistema";
import { Loader2 } from "lucide-react";
import { ConsultarAsistenciasDiariasPorActorEnRedisResponseBody } from "@/interfaces/shared/AsistenciaRequests";
import { ErrorResponseAPIBase } from "@/interfaces/shared/apis/types";

// Obtener texto según el rol
export const obtenerTextoRol = (rol: RolesSistema): string => {
  switch (rol) {
    case RolesSistema.ProfesorPrimaria:
      return "Profesores de Primaria";
    case RolesSistema.Auxiliar:
      return "Auxiliares";
    case RolesSistema.ProfesorSecundaria:
    case RolesSistema.Tutor:
      return "Profesores/Tutores de Secundaria";
    case RolesSistema.PersonalAdministrativo:
      return "Personal Administrativo";
    default:
      return "";
  }
};

export const ListaPersonal = ({
  rol,
  modoRegistro,
  handlerDatosAsistenciaHoyDirectivo,
  fechaHoraActual,
}: {
  rol: RolesSistema;
  modoRegistro: ModoRegistro;
  handlerDatosAsistenciaHoyDirectivo: HandlerDirectivoAsistenciaResponse;
  fechaHoraActual: FechaHoraActualRealState;
}) => {
  const { toast } = useToast();
  const [procesando, setProcesando] = useState<string | null>(null);
  const [asistenciasMarcadas, setAsistenciasMarcadas] = useState<string[]>([]);
  const [cargandoAsistencias, setCargandoAsistencias] = useState(true);

  // Estados para el sistema de manejo de errores
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ErrorResponseAPIBase | null>(null);

  // Crear instancia de AsistenciaDePersonalIDB con el constructor actualizado
  const asistenciaDePersonalIDB = new AsistenciaDePersonalIDB(
    "API01",
    setIsLoading,
    setError,
    (message) => {
      console.log("Mensaje de éxito:", message);
    }
  );

  // Obtenemos los datos del personal
  const personal = rol
    ? handlerDatosAsistenciaHoyDirectivo.obtenerPersonalPorRol(rol)
    : [];

  // Cargar las asistencias ya registradas
  useEffect(() => {
    const cargarAsistenciasRegistradas = async () => {
      try {
        setCargandoAsistencias(true);

        // Mapear el rol de RolesSistema a ActoresSistema
        let actorParam: ActoresSistema;
        switch (rol) {
          case RolesSistema.ProfesorPrimaria:
            actorParam = ActoresSistema.ProfesorPrimaria;
            break;
          case RolesSistema.ProfesorSecundaria:
          case RolesSistema.Tutor:
            actorParam = ActoresSistema.ProfesorSecundaria;
            break;
          case RolesSistema.Auxiliar:
            actorParam = ActoresSistema.Auxiliar;
            break;
          case RolesSistema.PersonalAdministrativo:
            actorParam = ActoresSistema.PersonalAdministrativo;
            break;
          default:
            actorParam = ActoresSistema.Auxiliar;
        }

        // Consultar las asistencias ya registradas
        const response = await fetch(
          `/api/asistencia-hoy/consultar-redis?Actor=${actorParam}&ModoRegistro=${modoRegistro}`
        );

        if (response.ok) {
          const data =
            (await response.json()) as ConsultarAsistenciasDiariasPorActorEnRedisResponseBody;

          // Sincronizar con IndexedDB usando la nueva instancia
          const statsSync =
            await asistenciaDePersonalIDB.sincronizarAsistenciasDesdeRedis(
              data
            );

          console.log("Estadísticas de sincronización:", statsSync);

          // Extraer los DNIs de las personas que ya han marcado asistencia
          const dnis = data.Resultados.map((resultado) => resultado.DNI);
          setAsistenciasMarcadas(dnis);
        } else {
          console.error("Error al cargar asistencias:", await response.text());
        }
      } catch (error) {
        console.error("Error al consultar asistencias registradas:", error);
        toast({
          title: "Error",
          description: "No se pudieron cargar las asistencias registradas",
          variant: "destructive",
        });
      } finally {
        setCargandoAsistencias(false);
      }
    };

    if (rol && modoRegistro) {
      cargarAsistenciasRegistradas();
    }
  }, [rol, modoRegistro]);

  // En el manejador de persona seleccionada del componente ListaPersonal:
  const handlePersonaSeleccionada = async (
    personal: PersonalParaTomarAsistencia
  ) => {
    if (procesando !== null) return;

    setProcesando(personal.DNI);

    try {
      // ✅ SÚPER SIMPLE: Obtener la hora como string ISO directamente del JSON
      const horaEsperadaISO =
        handlerDatosAsistenciaHoyDirectivo.obtenerHorarioPersonalISO(
          rol!,
          personal.DNI,
          modoRegistro
        );

      // Debug para verificar
      console.log("🕐 Hora esperada ISO (directa del JSON):", horaEsperadaISO);
      console.log("✅ Sin conversiones, sin problemas de zona horaria!");

      // Feedback por voz
      const speaker = Speaker.getInstance();
      speaker.start(
        `${
          modoRegistroTextos[modoRegistro]
        } registrada para ${personal.Nombres.split(
          " "
        ).shift()} ${personal.Apellidos.split(" ").shift()}`
      );

      // Llamar a la API para registrar en Redis
      const response = await fetch("/api/asistencia-hoy/marcar", {
        method: "POST",
        body: JSON.stringify({
          DNI: personal.DNI,
          Actor: rol,
          ModoRegistro: modoRegistro,
          FechaHoraEsperadaISO: horaEsperadaISO, // String ISO directo del JSON
        } as RegistrarAsistenciaIndividualRequestBody),
      });

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }

      const data =
        (await response.json()) as RegistrarAsistenciaIndividualSuccessResponse;

      console.log("Respuesta de la API:", data);

      if (data.success) {
        // Guardar en IndexedDB
        await asistenciaDePersonalIDB.marcarAsistencia({
          datos: {
            Rol: rol!,
            Dia: fechaHoraActual.utilidades!.diaMes,
            DNI: personal.DNI,
            esNuevoRegistro: data.data.esNuevoRegistro,
            ModoRegistro: modoRegistro,
            Detalles: {
              DesfaseSegundos: data.data.desfaseSegundos,
              Timestamp: data.data.timestamp,
            },
          },
        });

        // Actualizar estado
        setAsistenciasMarcadas((prev) => [...prev, personal.DNI]);

        toast({
          title: "Asistencia registrada",
          description: `${modoRegistro} registrada correctamente`,
          variant: "default",
        });
      } else {
        toast({
          title: "Error",
          description: data.message || "No se pudo registrar la asistencia",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error al registrar asistencia:", error);

      let errorMessage = "Ocurrió un error al procesar la solicitud";

      if (error instanceof Error) {
        errorMessage = error.message;
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setProcesando(null);
    }
  };

  const textoRol = obtenerTextoRol(rol);

  // Mostrar error si existe
  if (error) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center">
        <div className="text-center max-w-md">
          <p className="text-xl text-red-600 mb-2">Error del Sistema</p>
          <p className="text-sm text-gray-600 mb-4">{error.message}</p>
          <button
            onClick={() => setError(null)}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  // Mensaje para cuando no hay personal
  if (personal.length === 0) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center">
        <p className="text-xl text-gray-600">
          No hay personal disponible para este rol
        </p>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col pb-3 px-4 sm-only:pb-4 sm-only:px-3 md-only:pb-4 md-only:px-3 lg-only:pb-4 lg-only:px-4 xl-only:pb-4 xl-only:px-4 bg-gradient-to-b from-white to-gray-50 overflow-auto">
      {/* Encabezados fijos en la parte superior - REDUCIDOS */}
      <div className="sticky top-0 bg-[#ffffffcc] [backdrop-filter:blur(10px)] py-2 sm-only:py-3 md-only:py-3 lg-only:py-3 xl-only:py-4 z-10 mb-2">
        <h2 className="text-base sm-only:text-lg md-only:text-lg lg-only:text-lg xl-only:text-xl font-bold text-blue-800 text-center leading-tight">
          {modoRegistroTextos[modoRegistro]} | {textoRol}
        </h2>

        <h3 className="text-lg sm-only:text-xl md-only:text-xl lg-only:text-2xl xl-only:text-2xl font-bold text-green-600 text-center leading-tight">
          Ahora haz clic en tu nombre
        </h3>

        {(cargandoAsistencias || isLoading) && (
          <p className="text-center text-blue-500 mt-1">
            <Loader2 className="inline-block w-4 h-4 mr-1 animate-spin" />
            {cargandoAsistencias
              ? "Cargando asistencias registradas..."
              : "Procesando asistencia..."}
          </p>
        )}
      </div>

      {/* Contenedor centrado para las tarjetas */}
      <div className="flex-1 flex justify-center">
        <div className="max-w-4xl w-full">
          {/* Lista de personas con flex-wrap - TAMAÑOS REDUCIDOS */}
          <div className="flex flex-wrap justify-center gap-2 sm-only:gap-3 md-only:gap-3 lg-only:gap-3 xl-only:gap-3">
            {personal.map((persona) => (
              <ItemTomaAsistencia
                key={persona.DNI}
                personal={persona}
                handlePersonalSeleccionado={handlePersonaSeleccionada}
                disabled={
                  !cargandoAsistencias &&
                  asistenciasMarcadas.includes(persona.DNI)
                }
                loading={procesando === persona.DNI}
                globalLoading={cargandoAsistencias || isLoading}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
