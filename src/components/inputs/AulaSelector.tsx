"use client";
import React, { useEffect, useState, useCallback } from "react";
import SiasisSelect from "../inputs/SiasisSelect";
import { NivelEducativo } from "@/interfaces/shared/NivelEducativo";
import { SiasisAPIS } from "@/interfaces/shared/SiasisComponents";
import { BaseAulasIDB as AulasIDB } from "@/lib/utils/local/db/models/Aulas/AulasBase";

interface AulaSelectorProps {
  nivelEducativo: NivelEducativo;
  grado: string;
  setGrado: (grado: string) => void;
  seccion: string;
  setSeccion: (seccion: string) => void;
  incluirOpcionTodosGrados?: boolean;
  incluirOpcionTodasSecciones?: boolean;
  siasisAPI?: SiasisAPIS | SiasisAPIS[];
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}

const AulaSelector = ({
  nivelEducativo,
  grado,
  setGrado,
  seccion,
  setSeccion,
  incluirOpcionTodosGrados = true,
  incluirOpcionTodasSecciones = true,
  siasisAPI,
  onChange,
}: AulaSelectorProps) => {
  const [grados, setGrados] = useState<number[]>([]);
  const [secciones, setSecciones] = useState<string[]>([]);
  const [isLoadingGrados, setIsLoadingGrados] = useState(false);
  const [isLoadingSecciones, setIsLoadingSecciones] = useState(false);

  // Secciones de un grado específico
  const cargarSeccionesPorGrado = useCallback(
    async (gradoSeleccionado: number) => {
      setIsLoadingSecciones(true);
      try {
        const aulasIDB = new AulasIDB(siasisAPI);
        const seccionesEncontradas = await aulasIDB.getSeccionesPorNivelYGrado(
          nivelEducativo,
          gradoSeleccionado,
        );
        setSecciones(seccionesEncontradas);
      } catch (error) {
        console.error("Error al cargar secciones por grado:", error);
        setSecciones([]);
      } finally {
        setIsLoadingSecciones(false);
      }
    },
    [nivelEducativo, siasisAPI],
  );

  // Unión de secciones entre todos los grados del nivel (cuando grado === "T")
  const cargarSeccionesPorNivel = useCallback(async () => {
    setIsLoadingSecciones(true);
    try {
      const aulasIDB = new AulasIDB(siasisAPI);
      const seccionesEncontradas =
        await aulasIDB.getSeccionesPorNivel(nivelEducativo);
      setSecciones(seccionesEncontradas);
    } catch (error) {
      console.error("Error al cargar secciones por nivel:", error);
      setSecciones([]);
    } finally {
      setIsLoadingSecciones(false);
    }
  }, [nivelEducativo, siasisAPI]);

  // Cargar grados disponibles y secciones (union) cada vez que cambia el nivel educativo
  useEffect(() => {
    const cargarGradosYSecciones = async () => {
      setIsLoadingGrados(true);
      // Al cambiar de nivel, el grado/sección previamente elegidos ya no son válidos
      setGrado("T");
      setSeccion("T");
      try {
        const aulasIDB = new AulasIDB(siasisAPI);
        const gradosEncontrados =
          await aulasIDB.getGradosPorNivel(nivelEducativo);
        setGrados(gradosEncontrados);
      } catch (error) {
        console.error("Error al cargar grados:", error);
        setGrados([]);
      } finally {
        setIsLoadingGrados(false);
      }

      // Como el grado arranca en "T", cargamos la unión de secciones del nivel
      await cargarSeccionesPorNivel();
    };

    cargarGradosYSecciones();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nivelEducativo, siasisAPI]);

  const handleGradoChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const valor = e.target.value;
    setGrado(valor);
    // Al cambiar de grado, la sección anterior ya no es válida
    setSeccion("T");

    if (valor === "T") {
      cargarSeccionesPorNivel();
    } else {
      cargarSeccionesPorGrado(Number(valor));
    }

    onChange?.(e);
  };

  const handleSeccionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSeccion(e.target.value);
    onChange?.(e);
  };

  return (
    <div className="flex font-medium text-[1rem] gap-3 items-center">
      <label className="flex gap-3 items-center justify-center text-[1rem]">
        Aula:
        <section className="flex gap-3.5 items-center border-2 rounded-[10px] border-color-interfaz p-2">
          <label className="text-[0.9rem]">
            Grado:{" "}
            <SiasisSelect
              placeholder="Todos"
              className="text-[0.9rem] text-white w-6"
              value={grado}
              onChange={handleGradoChange}
              disabled={isLoadingGrados}
            >
              {incluirOpcionTodosGrados && <option value="T">Todos</option>}
              {grados.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </SiasisSelect>
          </label>
          <label className="text-[0.9rem]">
            Seccion:{" "}
            <SiasisSelect
              placeholder="Todos"
              className="text-[0.9rem] text-white w-6"
              value={seccion}
              onChange={handleSeccionChange}
              disabled={isLoadingSecciones}
            >
              {incluirOpcionTodasSecciones && <option value="T">Todos</option>}
              {secciones.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </SiasisSelect>
          </label>
        </section>
      </label>
    </div>
  );
};

export default AulaSelector;
