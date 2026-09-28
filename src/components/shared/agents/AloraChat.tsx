"use client";

import AloraLogo from "@/components/icons/fullColor/AloraLogo";
import React, { useState, useRef, useEffect, useMemo } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/global/store";

// --- TIPOS E INTERFACES ---
export type EmisorMensaje = "USR" | "LLM";

export interface ArchivoAdjunto {
  nombre: string;
  tipoMime: "application/pdf" | "image/png" | "image/jpeg" | string;
  googleDriveId: string;
  urlDrive: string;
}

export interface MensajeChat {
  id: number;
  emisor: EmisorMensaje;
  contenido: string;
  fechaEmision: string; // ISO 8601: "2026-09-26T20:01:00Z"
  toolCall?: {
    nombre: string;
    parametros: string;
  };
  archivo?: ArchivoAdjunto;
}

export interface SesionChat {
  idChat: number;
  titulo: string;
  fechaCreacion: string; // ISO 8601
}

// --- UTILIDADES DE FECHAS (ESTILO WHATSAPP / TELEGRAM) ---
const formatearHora = (isoString: string): string => {
  const fecha = new Date(isoString);
  return fecha
    .toLocaleTimeString("es-PE", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
    .toLowerCase();
};

const obtenerEtiquetaDia = (isoString: string): string => {
  const fechaMensaje = new Date(isoString);
  const ahora = new Date();

  const fechaMsgSinHora = new Date(
    fechaMensaje.getFullYear(),
    fechaMensaje.getMonth(),
    fechaMensaje.getDate(),
  );
  const hoySinHora = new Date(
    ahora.getFullYear(),
    ahora.getMonth(),
    ahora.getDate(),
  );

  const diferenciaDias = Math.round(
    (hoySinHora.getTime() - fechaMsgSinHora.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diferenciaDias === 0) return "Hoy";
  if (diferenciaDias === 1) return "Ayer";

  return fechaMensaje.toLocaleDateString("es-PE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

const calcularDiasRestantes = (fechaCreacionIso: string): string => {
  const creacion = new Date(fechaCreacionIso).getTime();
  const ahora = new Date().getTime();
  const diasTranscurridos = (ahora - creacion) / (1000 * 60 * 60 * 24);
  const diasRestantes = Math.max(0, Math.ceil(7 - diasTranscurridos));

  if (diasRestantes === 0) return "Expira hoy";
  if (diasRestantes === 1) return "Expira en 1 día";
  return `Expira en ${diasRestantes} días`;
};

// --- MOCKS INICIALES ---
const MOCK_HISTORIAL_INICIAL: SesionChat[] = [
  {
    idChat: 1,
    titulo: "Búsqueda estudiantes 3° B",
    fechaCreacion: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    idChat: 2,
    titulo: "Reporte de asistencia mensual",
    fechaCreacion: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

const MOCK_MENSAJES_DB: Record<number, MensajeChat[]> = {
  1: [
    {
      id: 101,
      emisor: "USR",
      contenido: "Busca estudiantes de apellido Quispe en 3° B",
      fechaEmision: new Date(
        Date.now() - 24 * 60 * 60 * 1000 + 10000,
      ).toISOString(),
    },
    {
      id: 102,
      emisor: "LLM",
      contenido:
        "Encontré 2 estudiantes en 3° B:\n1. Quispe Ramos, Luis Alberto — DNI 71234567\n2. Quispe Huamán, María José — DNI 71239876",
      fechaEmision: new Date(
        Date.now() - 24 * 60 * 60 * 1000 + 20000,
      ).toISOString(),
      toolCall: {
        nombre: "buscar_estudiantes",
        parametros: 'apellido="Quispe", aula="3° B"',
      },
    },
    {
      id: 103,
      emisor: "USR",
      contenido: "Genera el QR de Luis",
      fechaEmision: new Date().toISOString(),
    },
    {
      id: 104,
      emisor: "LLM",
      contenido: "Listo, este es el QR de Luis Alberto Quispe Ramos.",
      fechaEmision: new Date(Date.now() + 5000).toISOString(),
      toolCall: {
        nombre: "generar_qr",
        parametros: "DNI 71234567",
      },
      archivo: {
        nombre: "qr_quispe_luis.png",
        tipoMime: "image/png",
        googleDriveId: "1abc9876xyz_mock",
        urlDrive: "https://drive.google.com",
      },
    },
  ],
  2: [
    {
      id: 201,
      emisor: "USR",
      contenido: "Generar reporte de ausencias sin justificar",
      fechaEmision: new Date(
        Date.now() - 5 * 24 * 60 * 60 * 1000,
      ).toISOString(),
    },
    {
      id: 202,
      emisor: "LLM",
      contenido:
        "Reporte generado con 4 alumnos con más de 3 faltas en Secundaria.",
      fechaEmision: new Date(
        Date.now() - 5 * 24 * 60 * 60 * 1000 + 15000,
      ).toISOString(),
    },
  ],
};

const SUGERENCIAS = ["Buscar estudiante", "Generar QR", "Registrar estudiante"];
const MAX_CARACTERES = 400;

const AloraChat = () => {
  const headerHeight = useSelector(
    (state: RootState) => state.elementsDimensions.headerHeight,
  );
  const windowHeight = useSelector(
    (state: RootState) => state.elementsDimensions.windowHeight,
  );
  const windowWidth = useSelector(
    (state: RootState) => state.elementsDimensions.windowWidth,
  );

  const alturaDisponible =
    windowHeight && headerHeight ? windowHeight - headerHeight : 0;

  const [expanded, setExpanded] = useState<boolean>(false);
  const [historial, setHistorial] = useState<SesionChat[]>(
    MOCK_HISTORIAL_INICIAL,
  );
  const [chatActivo, setChatActivo] = useState<number | null>(null);

  const [mensajes, setMensajes] = useState<MensajeChat[]>([]);
  const [cargandoMensajes, setCargandoMensajes] = useState<boolean>(false);
  const [esperandoRespuestaLLM, setEsperandoRespuestaLLM] =
    useState<boolean>(false);
  const [liveModeActivo, setLiveModeActivo] = useState<boolean>(false);

  const [inputPrompt, setInputPrompt] = useState<string>("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const sesionActiva = useMemo(
    () => historial.find((h) => h.idChat === chatActivo),
    [historial, chatActivo],
  );

  const mensajesAgrupadosPorDia = useMemo(() => {
    const grupos: { fechaLabel: string; items: MensajeChat[] }[] = [];

    mensajes.forEach((msg) => {
      const label = obtenerEtiquetaDia(msg.fechaEmision);
      const ultimoGrupo = grupos[grupos.length - 1];

      if (ultimoGrupo && ultimoGrupo.fechaLabel === label) {
        ultimoGrupo.items.push(msg);
      } else {
        grupos.push({ fechaLabel: label, items: [msg] });
      }
    });

    return grupos;
  }, [mensajes]);

  useEffect(() => {
    if (expanded && chatActivo !== null && !cargandoMensajes) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [mensajes, chatActivo, expanded, cargandoMensajes, esperandoRespuestaLLM]);

  const toggleChat = () => setExpanded((prev) => !prev);

  const handleSeleccionarChat = (idChat: number) => {
    setChatActivo(idChat);
    setCargandoMensajes(true);
    setEsperandoRespuestaLLM(false);

    setTimeout(() => {
      setMensajes(MOCK_MENSAJES_DB[idChat] || []);
      setCargandoMensajes(false);
    }, 700);
  };

  const handleCrearNuevoChat = () => {
    const nuevoId = Date.now();
    const ahoraIso = new Date().toISOString();

    const nuevoChat: SesionChat = {
      idChat: nuevoId,
      titulo: "Nueva consulta",
      fechaCreacion: ahoraIso,
    };

    const mensajeBienvenida: MensajeChat = {
      id: Date.now(),
      emisor: "LLM",
      contenido:
        "¡Hola! Soy tu asistente ALORA. ¿En qué te puedo colaborar hoy?",
      fechaEmision: ahoraIso,
    };

    setHistorial((prev) => [nuevoChat, ...prev]);
    setChatActivo(nuevoId);
    setCargandoMensajes(false);
    setEsperandoRespuestaLLM(false);
    setMensajes([mensajeBienvenida]);
    MOCK_MENSAJES_DB[nuevoId] = [mensajeBienvenida];
  };

  const handleEnviarMensaje = (textoAEnviar?: string) => {
    const texto = (textoAEnviar ?? inputPrompt).trim();
    if (!texto || chatActivo === null || esperandoRespuestaLLM) return;

    const ahoraIso = new Date().toISOString();
    const nuevoMsgUsuario: MensajeChat = {
      id: Date.now(),
      emisor: "USR",
      contenido: texto,
      fechaEmision: ahoraIso,
    };

    setMensajes((prev) => [...prev, nuevoMsgUsuario]);

    setHistorial((prev) =>
      prev.map((c) => {
        if (c.idChat === chatActivo && c.titulo === "Nueva consulta") {
          return {
            ...c,
            titulo: texto.length > 28 ? texto.substring(0, 28) + "..." : texto,
          };
        }
        return c;
      }),
    );

    setInputPrompt("");
    setEsperandoRespuestaLLM(true);

    setTimeout(() => {
      const respuestaLLM: MensajeChat = {
        id: Date.now() + 1,
        emisor: "LLM",
        contenido: `He procesado tu solicitud: "${texto}". Toda la información escolar se encuentra actualizada en el registro de SIASIS.`,
        fechaEmision: new Date().toISOString(),
        toolCall: {
          nombre: "procesar_consulta_siasis",
          parametros: `consulta="${texto.slice(0, 20)}..."`,
        },
      };

      setMensajes((prev) => [...prev, respuestaLLM]);
      setEsperandoRespuestaLLM(false);

      if (MOCK_MENSAJES_DB[chatActivo]) {
        MOCK_MENSAJES_DB[chatActivo].push(nuevoMsgUsuario, respuestaLLM);
      }
    }, 1800);
  };

  return (
    <>
      {/* BOTÓN FLOTANTE MÓVIL */}
      <div className="md:hidden fixed bottom-5 left-5 z-40 flex items-center gap-2">
        <button
          onClick={toggleChat}
          className="min-w-11 aspect-square rounded-full bg-white border border-gray-300 text-white flex items-center justify-center shadow-2xl active:scale-95 transition-transform"
          aria-label="Abrir Asistente ALORA"
        >
          <AloraLogo className="w-7" title="Asistente ALORA" />
        </button>

        <div className="bg-[#1f2937] text-white text-xs font-semibold py-1.5 px-3 rounded-xl shadow-lg border border-gray-700 pointer-events-none select-none">
          ¿Te ayudo con algo?
        </div>
      </div>

      {/* PANEL LATERAL CHAT ALORA */}
      <aside
        id="alora-chat-aside"
        style={{
          top: windowWidth >= 768 ? `${headerHeight}px` : undefined,
          height:
            windowWidth >= 768 && alturaDisponible
              ? `${alturaDisponible}px`
              : undefined,
          maxHeight:
            windowWidth >= 768 && alturaDisponible
              ? `${alturaDisponible}px`
              : undefined,
        }}
        className={`
          fixed md:sticky right-0 bg-white border-l border-gray-200
          transition-all duration-300 ease-in-out flex flex-col overflow-hidden shrink-0
          ${
            expanded
              ? "w-full z-[1001] md:w-[410px] md:z-30 xl:w-[430px]"
              : "w-0 md:w-11 pointer-events-none md:pointer-events-auto border-none md:border-l md:z-30"
          }
        `}
      >
        {/* ESTADO COLAPSADO */}
        {!expanded && (
          <div className="hidden md:flex flex-col items-center py-3 w-11 h-full select-none gap-3">
            <button
              onClick={toggleChat}
              className="w-8 h-8 rounded-md border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition shadow-sm"
              title="Expandir Asistente"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>

            <div className="relative">
              <AloraLogo className="w-7" />
              <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></span>
            </div>

            <span
              onClick={toggleChat}
              className="cursor-pointer [writing-mode:vertical-rl] tracking-wider text-[0.85rem] font-medium text-gray-700 mt-1 hover:text-[#dd3524] transition-colors"
            >
              Asistente ALORA
            </span>
          </div>
        )}

        {/* ESTADO EXPANDIDO */}
        {expanded && (
          <div className="flex flex-col h-full w-full bg-white relative">
            {/* CABECERA */}
            <header className="p-3 border-b border-gray-200 flex items-center justify-between bg-white shrink-0">
              <div className="flex items-center gap-2">
                {chatActivo !== null && (
                  <button
                    onClick={() => {
                      setChatActivo(null);
                      setEsperandoRespuestaLLM(false);
                    }}
                    className="p-1 rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition mr-0.5"
                    title="Volver al historial"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2.5}
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15 19l-7-7 7-7"
                      />
                    </svg>
                  </button>
                )}

                <div className="relative">
                  <AloraLogo className="w-7 mr-0.5" />
                </div>

                <div className="min-w-0 max-w-[190px]">
                  <h3 className="font-bold text-sm text-gray-800 leading-tight truncate">
                    {chatActivo !== null
                      ? sesionActiva?.titulo || "Chat Activo"
                      : "Asistente ALORA"}
                  </h3>
                  <p className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full inline-block"></span>
                    En línea
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 text-gray-500">
                <button
                  onClick={handleCrearNuevoChat}
                  className="p-1.5 rounded-md hover:bg-gray-100 transition"
                  title="Nueva conversación"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                </button>

                <button
                  onClick={toggleChat}
                  className="p-1.5 rounded-md hover:bg-gray-100 transition"
                  title="Minimizar panel"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </button>
              </div>
            </header>

            {/* MODAL MODO VOZ GEMINI LIVE */}
            {liveModeActivo && (
              <div className="absolute inset-0 top-[57px] z-30 bg-neutral-950/95 text-white flex flex-col items-center justify-between p-6 backdrop-blur-md">
                <div className="text-center pt-8">
                  <span className="text-xs tracking-widest uppercase font-mono text-red-400">
                    Gemini Live Voice
                  </span>
                  <h4 className="text-xl font-semibold mt-1">Escuchando...</h4>
                  <p className="text-xs text-neutral-400 mt-2 max-w-xs">
                    Comunícate por voz para gestionar asistencias y consultas
                    del colegio.
                  </p>
                </div>

                <div className="relative flex items-center justify-center">
                  <div className="w-32 h-32 rounded-full bg-red-600/20 animate-ping absolute"></div>
                  <div className="w-24 h-24 rounded-full bg-red-500/40 animate-pulse absolute"></div>
                  <div className="w-16 h-16 rounded-full bg-[#dd3524] flex items-center justify-center shadow-2xl z-10">
                    <svg
                      className="w-8 h-8 text-white fill-current"
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                      <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                    </svg>
                  </div>
                </div>

                <button
                  onClick={() => setLiveModeActivo(false)}
                  className="px-6 py-2 rounded-full border border-neutral-700 bg-neutral-900 hover:bg-neutral-800 text-xs font-semibold tracking-wide transition"
                >
                  Finalizar sesión de voz
                </button>
              </div>
            )}

            {/* VISTA 1: LISTADO DE HISTORIAL */}
            {chatActivo === null ? (
              <div className="flex-1 flex flex-col overflow-y-auto p-4 bg-gray-50/50">
                <div className="mb-3 px-3 py-2 bg-amber-50 border border-amber-200/80 rounded-xl flex items-center gap-2 text-[11px] text-amber-800">
                  <svg
                    className="w-4 h-4 text-amber-600 shrink-0"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span>
                    Por seguridad y espacio, los chats se conservan por un
                    máximo de 7 días.
                  </span>
                </div>

                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                    Tus Conversaciones
                  </h4>
                  <span className="text-[11px] text-gray-400 font-mono">
                    {historial.length} activas
                  </span>
                </div>

                {historial.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-4">
                    <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-300">
                      <svg
                        className="w-7 h-7"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={1.5}
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                        />
                      </svg>
                    </div>

                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-gray-400">
                        Aún no tienes conversaciones
                      </p>
                      <p className="text-xs text-gray-300 max-w-[220px]">
                        Comienza a utilizar el asistente ALORA para resolver
                        dudas, buscar datos y generar reportes escolares.
                      </p>
                    </div>

                    <button
                      onClick={handleCrearNuevoChat}
                      className="px-4 py-2 bg-[#dd3524] text-white rounded-xl text-xs font-semibold hover:bg-red-700 active:scale-95 transition shadow-sm"
                    >
                      Iniciar una conversación
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {historial.map((chat) => (
                      <div
                        key={chat.idChat}
                        onClick={() => handleSeleccionarChat(chat.idChat)}
                        className="cursor-pointer group p-3 bg-white hover:bg-red-50/40 rounded-xl border border-gray-200 hover:border-red-200 transition shadow-xs flex items-center justify-between"
                      >
                        <div className="min-w-0 flex-1 pr-3">
                          <p className="text-xs font-semibold text-gray-800 group-hover:text-[#dd3524] transition-colors truncate">
                            {chat.titulo}
                          </p>
                          <p className="text-[10px] text-amber-700 font-medium mt-0.5">
                            {calcularDiasRestantes(chat.fechaCreacion)}
                          </p>
                        </div>
                        <svg
                          className="w-4 h-4 text-gray-300 group-hover:text-[#dd3524] transition-colors shrink-0"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2}
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              // VISTA 2: CONVERSACIÓN ACTIVA
              <>
                {cargandoMensajes ? (
                  <div className="flex-1 flex flex-col justify-center items-center p-6 space-y-4 bg-gray-50/50">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-8 h-8 rounded-full border-2 border-red-200 border-t-[#dd3524] animate-spin"></div>
                      <p className="text-xs font-medium text-gray-400 animate-pulse text-center">
                        Recuperando mensajes de la conversación...
                      </p>
                    </div>

                    <div className="w-full space-y-3 pt-4 opacity-50">
                      <div className="w-3/4 h-8 bg-gray-200 rounded-2xl rounded-tr-none ml-auto animate-pulse"></div>
                      <div className="w-2/3 h-12 bg-gray-200 rounded-2xl rounded-tl-none animate-pulse"></div>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
                    {mensajesAgrupadosPorDia.map((grupo, gIndex) => (
                      <div key={gIndex} className="space-y-3.5">
                        <div className="flex justify-center my-2">
                          <span className="bg-white/80 backdrop-blur-xs border border-gray-200 text-gray-500 text-[10px] font-semibold px-3 py-0.5 rounded-full shadow-2xs select-none">
                            {grupo.fechaLabel}
                          </span>
                        </div>

                        {grupo.items.map((msg) => (
                          <div key={msg.id} className="space-y-1.5">
                            {msg.toolCall && (
                              <div className="flex items-center gap-1.5 text-[11px] font-mono bg-emerald-50 text-emerald-800 px-2.5 py-1 rounded-md border border-emerald-200 w-fit">
                                <span className="text-emerald-600 font-bold">
                                  ✓
                                </span>
                                <span>{msg.toolCall.nombre}</span>
                                <span className="text-gray-400">•</span>
                                <span className="text-gray-600 truncate max-w-[200px]">
                                  {msg.toolCall.parametros}
                                </span>
                              </div>
                            )}

                            <div
                              className={`flex ${
                                msg.emisor === "USR"
                                  ? "justify-end"
                                  : "justify-start"
                              }`}
                            >
                              <div
                                className={`max-w-[85%] rounded-2xl px-3.5 pt-2 pb-1.5 text-xs shadow-sm relative ${
                                  msg.emisor === "USR"
                                    ? "bg-[#dd3524] text-white rounded-tr-none"
                                    : "bg-white text-gray-800 border border-gray-200 rounded-tl-none whitespace-pre-line leading-relaxed"
                                }`}
                              >
                                <div>{msg.contenido}</div>

                                {msg.archivo && (
                                  <div className="mt-2.5 p-2 bg-gray-50 text-gray-800 rounded-xl border border-dashed border-gray-300 flex items-center gap-3">
                                    <div className="w-11 h-11 bg-white border border-gray-200 rounded-lg flex items-center justify-center text-[10px] font-bold text-gray-400 uppercase shrink-0">
                                      {msg.archivo.tipoMime.includes("pdf")
                                        ? "PDF"
                                        : "QR"}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <p className="text-[11px] font-semibold text-gray-800 truncate">
                                        {msg.archivo.nombre}
                                      </p>
                                      <div className="flex items-center gap-2 mt-0.5 text-[10px]">
                                        <a
                                          href={msg.archivo.urlDrive}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="text-[#dd3524] hover:underline font-medium"
                                        >
                                          Descargar
                                        </a>
                                        <span className="text-gray-300">•</span>
                                        <button
                                          onClick={() => window.print()}
                                          className="text-gray-600 hover:underline"
                                        >
                                          Imprimir
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                )}

                                <div
                                  className={`flex items-center justify-end gap-1 mt-1 text-[9.5px] select-none ${
                                    msg.emisor === "USR"
                                      ? "text-red-100"
                                      : "text-gray-400"
                                  }`}
                                >
                                  <span>{formatearHora(msg.fechaEmision)}</span>
                                  {msg.emisor === "USR" && (
                                    <svg
                                      className="w-3 h-3 stroke-current stroke-2"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M5 13l4 4L19 7"
                                      />
                                    </svg>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}

                    {/* INDICADOR DE ESCRITURA LLM */}
                    {esperandoRespuestaLLM && (
                      <div className="space-y-1.5 animate-fadeIn">
                        <div className="flex items-center gap-1.5 text-[11px] font-mono bg-red-50/70 text-[#dd3524] px-2.5 py-1 rounded-md border border-red-200/80 w-fit">
                          <div className="w-2.5 h-2.5 rounded-full border-2 border-red-300 border-t-[#dd3524] animate-spin"></div>
                          <span className="text-[10px] font-medium tracking-wide">
                            ALORA está procesando...
                          </span>
                        </div>

                        <div className="flex justify-start">
                          <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-none px-4 py-3 shadow-xs flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-[#dd3524] animate-bounce [animation-delay:-0.3s]"></span>
                            <span className="w-2 h-2 rounded-full bg-[#dd3524] animate-bounce [animation-delay:-0.15s]"></span>
                            <span className="w-2 h-2 rounded-full bg-[#dd3524] animate-bounce"></span>
                          </div>
                        </div>
                      </div>
                    )}

                    <div ref={messagesEndRef} />
                  </div>
                )}

                {/* SUGERENCIAS RÁPIDAS */}
                <div className="px-3 pt-2 pb-1 bg-white flex gap-1.5 overflow-x-auto no-scrollbar shrink-0">
                  {SUGERENCIAS.map((sug, i) => (
                    <button
                      key={i}
                      disabled={esperandoRespuestaLLM}
                      onClick={() => handleEnviarMensaje(sug)}
                      className="text-[11px] bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-gray-700 py-1 px-2.5 rounded-full border border-gray-200 whitespace-nowrap transition"
                    >
                      {sug}
                    </button>
                  ))}
                </div>

                {/* INPUT Y BOTONES */}
                <footer className="p-3 bg-white border-t border-gray-200 shrink-0">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleEnviarMensaje();
                    }}
                    className="flex items-center gap-1.5"
                  >
                    <div className="relative flex-1">
                      <input
                        type="text"
                        maxLength={MAX_CARACTERES}
                        disabled={esperandoRespuestaLLM}
                        value={inputPrompt}
                        onChange={(e) => setInputPrompt(e.target.value)}
                        placeholder={
                          esperandoRespuestaLLM
                            ? "ALORA está respondiendo..."
                            : "Escribe una instrucción..."
                        }
                        className="w-full text-xs py-2.5 pl-3.5 pr-14 rounded-xl border border-gray-300 focus:outline-none focus:border-[#dd3524] disabled:bg-gray-50 disabled:text-gray-400 transition placeholder-gray-400"
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] text-gray-400 font-mono">
                        {inputPrompt.length}/{MAX_CARACTERES}
                      </span>
                    </div>

                    {/* BOTÓN MODO VOZ GEMINI LIVE */}
                    <button
                      type="button"
                      disabled={esperandoRespuestaLLM}
                      onClick={() => setLiveModeActivo(true)}
                      className="w-9 h-9 rounded-xl border border-gray-200 text-gray-500 hover:text-[#dd3524] hover:bg-red-50 disabled:opacity-40 flex items-center justify-center transition shrink-0"
                      title="Activar Gemini Live (Modo Voz)"
                    >
                      <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                        <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                        <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                      </svg>
                    </button>

                    {/* BOTÓN ENVIAR */}
                    <button
                      type="submit"
                      disabled={!inputPrompt.trim() || esperandoRespuestaLLM}
                      className="w-9 h-9 rounded-xl bg-[#dd3524] text-white flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:bg-red-700 active:scale-95 transition shadow-sm shrink-0"
                      title="Enviar mensaje"
                    >
                      {esperandoRespuestaLLM ? (
                        <div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin"></div>
                      ) : (
                        <svg
                          className="w-4 h-4 fill-none stroke-current stroke-2"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M14 5l7 7m0 0l-7 7m7-7H3"
                          />
                        </svg>
                      )}
                    </button>
                  </form>
                </footer>
              </>
            )}
          </div>
        )}
      </aside>

      <style jsx>{`
        @media screen and (max-width: 768px) {
          #alora-chat-aside {
            top: 0 !important;
            height: 100dvh !important;
            max-height: 100dvh !important;
          }
        }
      `}</style>
    </>
  );
};

export default AloraChat;
