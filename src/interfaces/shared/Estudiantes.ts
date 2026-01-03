import { T_Aulas, T_Estudiantes } from "@prisma/client";
import { RelacionesEstudianteResponsable } from "./RelacionesEstudianteResponsable";

export type EstudianteBasico = Omit<T_Estudiantes, "Id_Aula">;

export interface EstudianteConAula extends EstudianteBasico {
  aula: T_Aulas | null | undefined;
}

// --------------------------------------------------------
// |               EstudianteDelResponsable               |
// --------------------------------------------------------

export interface EstudianteDelResponsable extends T_Estudiantes {
  Tipo_Relacion: RelacionesEstudianteResponsable;
}

export interface EstudianteConAulaYRelacion
  extends Omit<EstudianteDelResponsable, "Id_Aula"> {
  aula: T_Aulas | null | undefined;
}
