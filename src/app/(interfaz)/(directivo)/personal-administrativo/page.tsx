"use client";
import { PersonalAdministrativoSinContraseña } from "@/interfaces/shared/apis/shared/others/types";
import { ErrorResponseAPIBase } from "@/interfaces/shared/apis/types";
import React, { useEffect, useState } from "react";

import ErrorMessage from "@/components/shared/errors/ErrorMessage";
import Loader from "@/components/shared/loaders/Loader";
import PersonalAdministrativoCard from "./_components/PersonalAdministrativoCard";
import { PersonalAdministrativoIDB } from "@/lib/utils/local/db/models/PersonalAdministrativoIDB";

const PersonalAdministrativo = () => {
  const [personalAdministrivo, setPersonalAdministrivo] =
    useState<PersonalAdministrativoSinContraseña[]>();

  const [isSomethingLoading, setIsSomethingLoading] = useState(true);
  const [error, setError] = useState<ErrorResponseAPIBase | null>(null);

  useEffect(() => {
    const getPersonalAdministrativo = async () => {
      const personalAdministrativo = await new PersonalAdministrativoIDB(
        "API01",
        setIsSomethingLoading,
        setError
      ).getAll();

      setPersonalAdministrivo(personalAdministrativo);
    };

    getPersonalAdministrativo();
  }, []);

  return (
    <div className="w-full max-w-[80rem] h-full flex flex-col justify-start">
      <div className="flex flex-col items-center">
        <h1 className="text-[2.25rem] text-negro font-semibold mt-2 text-center w-full">
          LISTA DE P. ADMINISTRATIVO
        </h1>

        {isSomethingLoading && (
          <span className="mt-4 sxs-only:text-[12px] xs-only:text-[13px] sm-only:text-[14px] flex items-center">
            Actualizando <Loader className="w-[2rem] p-2 bg-black" />
          </span>
        )}

        {error && <ErrorMessage error={error} />}

        {!isSomethingLoading &&
        personalAdministrivo &&
        personalAdministrivo.length === 0 && (
          <span>
            {" "}
            No se encontro Personal Administrativo registrado en el Sistema
          </span>
        )}
      </div>

     <div className="mt-7 xs-only:mt-6 sxs-only:mt-5 flex flex-wrap justify-center w-full gap-y-7 sxs-only:gap-y-5 xs-only:gap-y-6 gap-x-8 sxs-only:gap-x-4 xs-only:gap-x-4">

        {personalAdministrivo &&
          personalAdministrivo.map((unPersonal) => (
            <PersonalAdministrativoCard
              key={unPersonal.DNI_Personal_Administrativo}
              PersonalAdministrativo={unPersonal}
            />
          ))}
      </div>
    </div>
  );
};

export default PersonalAdministrativo;
