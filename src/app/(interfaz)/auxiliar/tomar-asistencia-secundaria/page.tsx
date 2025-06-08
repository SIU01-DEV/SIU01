"use client";

import { useSS01 } from "@/hooks/useSS01";
import "dotenv/config";
import React, { useEffect, useRef, useCallback } from "react";
import { TomaAsistenciaPersonalSIU01Events } from "@/SS01/sockets/events/AsistenciaDePersonal/frontend/TomaAsistenciaPersonalSIU01Events";

const TomarAsistenciaSecundaria = () => {
  const { globalSocket, isConnected } = useSS01();

  // Ref para mantener referencia al handler
  const saludoHandlerRef = useRef<InstanceType<
    typeof TomaAsistenciaPersonalSIU01Events.RESPUESTA_SALUDO_HANDLER
  > | null>(null);

  // Configurar handlers cuando el socket esté disponible
  useEffect(() => {
    if (!globalSocket || !isConnected) {
      return;
    }

    // Asignar la conexión a la clase de eventos
    TomaAsistenciaPersonalSIU01Events.socketConnection = globalSocket;

    // Configurar handler para respuesta de saludo
    saludoHandlerRef.current =
      new TomaAsistenciaPersonalSIU01Events.RESPUESTA_SALUDO_HANDLER(
        (saludo) => {
          console.log("👋 [Componente] Saludo recibido:", saludo);
          // Aquí puedes actualizar el estado del componente, mostrar notificación, etc.
        }
      );

    // Registrar el handler
    const handlerRegistered = saludoHandlerRef.current.hand();

    if (handlerRegistered) {
      console.log("✅ [Componente] Handler de saludo registrado correctamente");
    }

    // Cleanup al desmontar o cambiar de socket
    return () => {
      console.log("🧹 [Componente] Limpiando handlers de eventos");

      if (saludoHandlerRef.current) {
        saludoHandlerRef.current.unhand();
        saludoHandlerRef.current = null;
      }

      // Limpiar la referencia del socket en la clase de eventos
      TomaAsistenciaPersonalSIU01Events.socketConnection = null;
    };
  }, [globalSocket, isConnected]);

  // Función para enviar saludo
  const saludarme = useCallback(() => {
    if (!isConnected) {
      console.warn("⚠️ [Componente] No hay conexión disponible");
      alert("No hay conexión con el servidor");
      return;
    }

    console.log("👋 [Componente] Enviando saludo...");

    const emitter =
      new TomaAsistenciaPersonalSIU01Events.SALUDAME_SOCKET_EMITTER();
    const sent = emitter.execute();

    if (sent) {
      console.log("✅ [Componente] Saludo enviado correctamente");
    } else {
      console.error("❌ [Componente] Error al enviar saludo");
      alert("Error al enviar saludo");
    }
  }, [isConnected]);

  // Debug del estado de conexión
  const debugConnection = useCallback(() => {
    const status = TomaAsistenciaPersonalSIU01Events.getConnectionStatus();
    console.log("🔍 [Debug] Estado de conexión:", status);
    alert(`Estado: ${JSON.stringify(status, null, 2)}`);
  }, []);

  return (
    <div className="p-4 max-w-lg mx-auto">
      <h1 className="text-xl font-bold mb-4">Tomar Asistencia Secundaria</h1>

      {/* Estado de conexión */}
      <div className="mb-4 p-3 border rounded">
        <div className="flex items-center gap-2">
          <div
            className={`w-3 h-3 rounded-full ${
              isConnected ? "bg-green-500" : "bg-red-500"
            }`}
          />
          <span className="text-sm">
            {isConnected ? "Conectado al SS01" : "Desconectado del SS01"}
          </span>
        </div>
        {globalSocket?.id && (
          <div className="text-xs text-gray-600 mt-1">
            Socket ID: {globalSocket.id}
          </div>
        )}
      </div>

      {/* Botones de acción */}
      <div className="space-y-2">
        <button
          onClick={saludarme}
          disabled={!isConnected}
          className="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isConnected ? "SALUDARME DESDE EL SS01" : "Esperando conexión..."}
        </button>

        <button
          onClick={debugConnection}
          className="w-full bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 text-sm"
        >
          Debug Conexión
        </button>
      </div>

      {/* Información adicional */}
      <div className="mt-4 text-xs text-gray-600">
        <div>Handler registrado: {saludoHandlerRef.current ? "✅" : "❌"}</div>
        <div>
          Socket asignado:{" "}
          {TomaAsistenciaPersonalSIU01Events.socketConnection ? "✅" : "❌"}
        </div>
      </div>
    </div>
  );
};

export default TomarAsistenciaSecundaria;
