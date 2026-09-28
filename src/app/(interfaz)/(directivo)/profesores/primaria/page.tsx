"use client";
import AgregarUsuarioIcon from "@/components/icons/AgregarUsuarioIcon";
import PrimariaIcon from "@/components/icons/PrimariaIcon";
import AulaSelector from "@/components/inputs/AulaSelector";
import Breadcrumb from "@/components/shared/Breadcrumb";
import Switch from "@/components/shared/Switch";
import ErrorMessage from "@/components/shared/errors/ErrorMessage";
import Loader from "@/components/shared/loaders/Loader";
import { NivelEducativo } from "@/interfaces/shared/NivelEducativo";
import { ErrorResponseAPIBase } from "@/interfaces/shared/apis/types";
import {
  PaginacionInfo,
  ProfesorPrimariaListItem,
} from "@/interfaces/shared/apis/api01/profesores-primaria/types";
import React, { useEffect, useRef, useState } from "react";
import useDebouncedValue from "@/hooks/useDebounceValue";
import { ProfesoresParaDirectivosIDB } from "@/lib/utils/local/db/models/Profesores/Para Directivos/ProfesoresParaDirectivosIDB";
import FotoPerfilClientSide from "@/components/utils/photos/FotoPerfilClientSide";

const DEBOUNCE_MS = 400;
const RESULTADOS_POR_PAGINA = 5;
const MAX_BOTONES_PAGINA = 4;

const ProfesoresPrimaria = () => {
  // --- Filtros de texto (valor "en vivo" del input) ---
  const [identificador, setIdentificador] = useState("");
  const [nombres, setNombres] = useState("");
  const [apellidos, setApellidos] = useState("");
  const [sinAula, setSinAula] = useState(true);

  // --- Filtro de aula (controlado, viene de AulaSelector) ---
  const [grado, setGrado] = useState<string>("T");
  const [seccion, setSeccion] = useState<string>("T");

  // --- Paginación ---
  const [numeroPagina, setNumeroPagina] = useState(1);

  // --- Resultado de la búsqueda ---
  const [profesores, setProfesores] = useState<ProfesorPrimariaListItem[]>([]);
  const [paginacion, setPaginacion] = useState<PaginacionInfo | null>(null);
  const [isSomethingLoading, setIsSomethingLoading] = useState(true);
  const [error, setError] = useState<ErrorResponseAPIBase | null>(null);

  // --- Debounce de los filtros de texto/aula/switch (NO de la página) ---
  const identificadorDebounced = useDebouncedValue(identificador, DEBOUNCE_MS);
  const nombresDebounced = useDebouncedValue(nombres, DEBOUNCE_MS);
  const apellidosDebounced = useDebouncedValue(apellidos, DEBOUNCE_MS);
  const sinAulaDebounced = useDebouncedValue(sinAula, DEBOUNCE_MS);
  const gradoDebounced = useDebouncedValue(grado, DEBOUNCE_MS);
  const seccionDebounced = useDebouncedValue(seccion, DEBOUNCE_MS);

  // Referencia para saber si es el primer render (evita resetear página al montar)
  const esPrimerRender = useRef(true);

  // Cuando cambia cualquier filtro (ya debounced), volvemos a la página 1
  useEffect(() => {
    if (esPrimerRender.current) {
      esPrimerRender.current = false;
      return;
    }
    setNumeroPagina(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    identificadorDebounced,
    nombresDebounced,
    apellidosDebounced,
    sinAulaDebounced,
    gradoDebounced,
    seccionDebounced,
  ]);

  // Búsqueda real: se ejecuta cuando cambian los filtros debounced O la página (sin debounce adicional)
  useEffect(() => {
    const buscar = async () => {
      const { resultados, paginacion: paginacionResultado } =
        await new ProfesoresParaDirectivosIDB(
          "API01",
          setIsSomethingLoading,
          setError,
        ).buscarProfesoresPrimaria({
          Identificador: identificadorDebounced,
          Nombres: nombresDebounced,
          Apellidos: apellidosDebounced,
          SinAula: sinAulaDebounced,
          Grado: gradoDebounced,
          Seccion: seccionDebounced,
          Numero_Pagina: numeroPagina,
          Cantidad_Resultados_Por_Pagina: RESULTADOS_POR_PAGINA,
        });

      setProfesores(resultados);
      setPaginacion(paginacionResultado);
    };

    buscar();
  }, [
    identificadorDebounced,
    nombresDebounced,
    apellidosDebounced,
    sinAulaDebounced,
    gradoDebounced,
    seccionDebounced,
    numeroPagina,
  ]);

  // --- Generar números de página a mostrar (con "..." si son muchas) ---
  const generarBotonesPagina = (): (number | "...")[] => {
    if (!paginacion) return [];

    const total = paginacion.Total_Paginas;
    const actual = paginacion.Pagina_Actual;

    if (total <= MAX_BOTONES_PAGINA + 1) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }

    const botones: (number | "...")[] = [1];
    const inicio = Math.max(2, actual - 1);
    const fin = Math.min(total - 1, actual + 1);

    if (inicio > 2) botones.push("...");
    for (let p = inicio; p <= fin; p++) botones.push(p);
    if (fin < total - 1) botones.push("...");
    botones.push(total);

    return botones;
  };

  return (
    <div className="w-full min-h-full">
      <Breadcrumb
        elements={[
          { Ruta: "/profesores", Texto: "Profesores" },
          { Ruta: "", Texto: "Primaria" },
        ]}
      />
      <h1 className=" text-[2rem] flex justify-between items-center -border-2 gap-3 font-semibold text-center leading-8 sxs-only:text-[1.55rem] xs-only:text-[1.65rem] sm-only:text-[1.75rem] flex-wrap my-4 w-full">
        <section className="flex items-center gap-3">
          BUSCAR PROFESORES{" "}
          <PrimariaIcon className="w-[2.7rem] mt-[-0.7rem]" />{" "}
        </section>
        <button className="bg-verde-principal text-[0.9rem] text-white py-1 px-3 rounded-[8px] flex items-center gap-1 hover:bg-verde-principal/90 transition-colors">
          <AgregarUsuarioIcon className="w-4 text-white" /> Registrar Profesores
        </button>
      </h1>

      {/* Contenedor de Filtros */}
      <form
        className="flex gap-4 w-full flex-wrap mt-7 "
        onSubmit={(e) => e.preventDefault()}
      >
        <label className="flex font-medium text-[1rem] gap-3 items-center">
          Identificador:
          <input
            type="text"
            id="identificador"
            value={identificador}
            onChange={(e) => setIdentificador(e.target.value)}
            minLength={0}
            maxLength={12}
            pattern="[0-9]{12}"
            title="Identificador debe contener 12 dígitos numéricos"
            onKeyDown={(event) => {
              return /[0-9]/.test(event.key);
            }}
            className="w-[min(80vw,8rem)]  border-2 border-color-interfaz rounded-[8px] -h-[3rem] px-2 py-1 font-normal"
          />
        </label>
        <label className="flex font-medium text-[1rem] gap-3 items-center">
          Nombres:
          <input
            value={nombres}
            onChange={(e) => setNombres(e.target.value)}
            minLength={0}
            maxLength={14}
            pattern="[A-Za-z\s]+"
            title="Nombres solo puede contener letras y espacios"
            onKeyDown={(event) => {
              return /[A-Za-z\s]/.test(event.key);
            }}
            type="text"
            className="w-[min(80vw,10rem)] border-2 border-color-interfaz rounded-[8px] -h-[3rem] px-2 py-1 font-normal"
          />
        </label>
        <label className="flex font-medium text-[1rem]  gap-3 items-center">
          Apellidos:
          <input
            type="text"
            value={apellidos}
            onChange={(e) => setApellidos(e.target.value)}
            minLength={0}
            maxLength={14}
            pattern="[A-Za-z\s]+"
            title="Apellidos solo puede contener letras y espacios"
            onKeyDown={(event) => {
              return /[A-Za-z\s]/.test(event.key);
            }}
            className="w-[min(80vw,10rem)] border-2 border-color-interfaz rounded-[8px] -h-[3rem] px-2 py-1 font-normal"
          />
        </label>

        <Switch
          activeColor="bg-color-interfaz"
          checked={sinAula}
          onChange={setSinAula}
          label="Sin Aula"
          toggleSize="md"
          labelClassName="text-[1rem] font-medium"
        />

        <AulaSelector
          nivelEducativo={NivelEducativo.PRIMARIA}
          grado={grado}
          setGrado={setGrado}
          seccion={seccion}
          setSeccion={setSeccion}
          incluirOpcionTodosGrados
          incluirOpcionTodasSecciones
        />
      </form>

      {error && <ErrorMessage error={error} />}

      {isSomethingLoading && (
        <div className="flex items-center mt-6 text-[0.95rem] w-full justify-center">
          Actualizando
          <Loader className="w-[2rem] p-[0.45rem] bg-black ml-2" />
        </div>
      )}

      {!isSomethingLoading && profesores.length === 0 && (
        <p className="text-center w-full mt-8 text-[0.95rem]">
          No se encontraron profesores con los filtros aplicados
        </p>
      )}

      {!isSomethingLoading && profesores.length > 0 && (
        <>
          <div className="overflow-x-auto mt-6 rounded-[10px] border-2 border-color-interfaz">
            <table className="w-full text-center">
              <thead>
                <tr className="bg-color-interfaz text-white">
                  <th className="py-3 px-2"></th>
                  <th className="py-3 px-2">DNI</th>
                  <th className="py-3 px-2">Nombres</th>
                  <th className="py-3 px-2">Apellidos</th>
                  <th className="py-3 px-2">Grado</th>
                  <th className="py-3 px-2">Sección</th>
                  <th className="py-3 px-2">Celular</th>
                  <th className="py-3 px-2"></th>
                </tr>
              </thead>
              <tbody>
                {profesores.map((profesor) => (
                  <tr
                    key={profesor.Id_Profesor_Primaria}
                    className="border-t border-gray-200"
                  >
                    <td className="py-2 px-2">
                      <div className="w-9 h-9 rounded-full bg-gray-200 mx-auto overflow-hidden">
                        <FotoPerfilClientSide
                          Google_Drive_Foto_ID={profesor.Google_Drive_Foto_ID}
                        />
                      </div>
                    </td>
                    <td className="py-2 px-2">
                      {profesor.Id_Profesor_Primaria}
                    </td>
                    <td className="py-2 px-2">{profesor.Nombres}</td>
                    <td className="py-2 px-2">{profesor.Apellidos}</td>
                    <td className="py-2 px-2">
                      {profesor.Aula ? profesor.Aula.Grado : "-"}
                    </td>
                    <td className="py-2 px-2">
                      {profesor.Aula ? profesor.Aula.Seccion : "-"}
                    </td>
                    <td className="py-2 px-2">{profesor.Celular}</td>
                    <td className="py-2 px-2">•••</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          {paginacion && paginacion.Total_Paginas > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6 flex-wrap">
              <button
                onClick={() => setNumeroPagina((p) => Math.max(1, p - 1))}
                disabled={numeroPagina === 1}
                className="px-3 py-1 rounded-full border-2 border-color-interfaz text-color-interfaz disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ‹ Anterior
              </button>

              {generarBotonesPagina().map((p, idx) =>
                p === "..." ? (
                  <span key={`ellipsis-${idx}`} className="px-2">
                    …
                  </span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setNumeroPagina(p)}
                    className={`w-8 h-8 rounded-full font-semibold ${
                      p === numeroPagina
                        ? "bg-color-interfaz text-white"
                        : "text-color-interfaz"
                    }`}
                  >
                    {p}
                  </button>
                ),
              )}

              <button
                onClick={() =>
                  setNumeroPagina((p) =>
                    paginacion ? Math.min(paginacion.Total_Paginas, p + 1) : p,
                  )
                }
                disabled={numeroPagina === paginacion.Total_Paginas}
                className="px-3 py-1 rounded-full border-2 border-color-interfaz text-color-interfaz disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Siguiente ›
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ProfesoresPrimaria;
