import { RolesSistema } from "@/interfaces/shared/RolesSistema";

const rolBaseMap: Record<RolesSistema, RolesSistema> = {
  [RolesSistema.Directivo]: RolesSistema.Directivo,
  [RolesSistema.PersonalAdministrativo]: RolesSistema.PersonalAdministrativo,
  [RolesSistema.ProfesorPrimaria]: RolesSistema.ProfesorPrimaria,
  [RolesSistema.Auxiliar]: RolesSistema.Auxiliar,
  [RolesSistema.ProfesorSecundaria]: RolesSistema.ProfesorSecundaria,
  [RolesSistema.Tutor]: RolesSistema.ProfesorSecundaria,
  [RolesSistema.Responsable]: RolesSistema.Responsable,
};

export function obtenerRolBaseApartirDeRolSistema(
  rolSistema: RolesSistema,
): RolesSistema {
  return rolBaseMap[rolSistema];
}
