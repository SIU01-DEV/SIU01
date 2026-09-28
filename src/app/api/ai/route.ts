import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { RolesSistema } from "@/interfaces/shared/RolesSistema";
import { verifyAuthToken } from "@/lib/utils/backend/auth/functions/jwtComprobations";

export async function POST(req: NextRequest) {
  try {
    // 1. Verificar autenticación y roles permitidos
    const { error, rol, decodedToken } = await verifyAuthToken(req, [
      RolesSistema.Directivo,
      RolesSistema.Auxiliar
    ]);

    if (error && !rol && !decodedToken) return error;

    // Si requieres auditoría o vincular consultas al usuario autenticado:
    const idUsuario = decodedToken?.ID_Usuario;

    // 2. Parsear y validar el body
    const body = await req.json();
    const { prompt } = body;

    if (!prompt || typeof prompt !== "string" || prompt.trim() === "") {
      return NextResponse.json(
        {
          success: false,
          message: "Se requiere la propiedad prompt en el body",
        },
        { status: 400 },
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { success: false, message: "GEMINI_API_KEY no configurada" },
        { status: 500 },
      );
    }

    // 3. Ejecutar llamada al modelo
    const ai = new GoogleGenAI({ apiKey });

    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    return NextResponse.json(
      {
        success: true,
        response: result.text,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error al consultar Gemini:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Error interno del servidor",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}