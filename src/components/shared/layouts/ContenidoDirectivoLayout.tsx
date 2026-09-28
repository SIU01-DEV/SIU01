"use client";

import React from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/global/store";
import PlantillaDirectivo from "./PlantillaDirectivo";
import AloraChat from "../agents/AloraChat";
import { RequestCookie } from "next/dist/compiled/@edge-runtime/cookies";

interface ContenidoDirectivoLayoutProps {
  children: React.ReactNode;
  genero: RequestCookie;
  nombres: RequestCookie;
  apellidos: RequestCookie;
  googleDriveFotoId: string | null;
}

const ContenidoDirectivoLayout = ({
  children,
  genero,
  nombres,
  apellidos,
  googleDriveFotoId,
}: ContenidoDirectivoLayoutProps) => {
  const headerHeight = useSelector(
    (state: RootState) => state.elementsDimensions.headerHeight,
  );
  const windowHeight = useSelector(
    (state: RootState) => state.elementsDimensions.windowHeight,
  );

  const alturaDisponible =
    windowHeight && headerHeight
      ? windowHeight - headerHeight
      : "calc(100vh - 5rem)";

  return (
    <PlantillaDirectivo
      Genero={genero}
      Nombres={nombres}
      Apellidos={apellidos}
      Google_Drive_Foto_ID={googleDriveFotoId}
    >
      <main
        style={{
          minHeight:
            typeof alturaDisponible === "number"
              ? `${alturaDisponible}px`
              : alturaDisponible,
        }}
        className="flex-1 min-w-0 py-4 px-8 flex flex-col justify-center items-center"
      >
        {children}
      </main>
      <AloraChat />
    </PlantillaDirectivo>
  );
};

export default ContenidoDirectivoLayout;
