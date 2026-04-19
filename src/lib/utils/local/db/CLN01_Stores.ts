import { RolesSistema } from "@/interfaces/shared/RolesSistema";
import { TablasLocal } from "@/interfaces/shared/TablasSistema";

export const getAvailableCLN01StoresByRol = (rol: RolesSistema) => {
  console.table(
    Object.fromEntries(
      Object.entries(CLN01_Stores).filter(([nombre, store]) =>
        store.rolesPermitidos.includes(rol)
      )
    )
  );

  return Object.fromEntries(
    Object.entries(CLN01_Stores).filter(([nombre, store]) =>
      store.rolesPermitidos.includes(rol)
    )
  );
};

interface SiasisIndexedDbObjectStore {
  objectStore: any;
  rolesPermitidos: RolesSistema[];
}

export const CLN01_Stores: Record<TablasLocal, SiasisIndexedDbObjectStore> = {
  // ========================================
  // STORES PARA DATOS DE SESIÓN Y CACHE
  // ========================================
  [TablasLocal.Tabla_Datos_Usuario]: {
    objectStore: {
      keyPath: null,
      autoIncrement: false,
      indexes: [],
    },
    rolesPermitidos: [
      RolesSistema.Directivo,
      RolesSistema.ProfesorPrimaria,
      RolesSistema.ProfesorSecundaria,
      RolesSistema.Auxiliar,
      RolesSistema.Tutor,
      RolesSistema.PersonalAdministrativo,
      RolesSistema.Responsable,
    ],
  },
  [TablasLocal.Tabla_Archivos_Asistencia_Hoy]: {
    objectStore: {
      keyPath: null,
      autoIncrement: false,
      indexes: [],
    },
    rolesPermitidos: [
      RolesSistema.Directivo,
      RolesSistema.ProfesorPrimaria,
      RolesSistema.ProfesorSecundaria,
      RolesSistema.Auxiliar,
      RolesSistema.Tutor,
      RolesSistema.PersonalAdministrativo,
      RolesSistema.Responsable,
    ],
  },

  // ========================================
  // USUARIOS Y ROLES
  // ========================================

  [TablasLocal.Tabla_Estudiantes]: {
    objectStore: {
      keyPath: "Id_Estudiante",
      autoIncrement: false,
      indexes: [
        { name: "por_nombres", keyPath: "Nombres", options: { unique: false } },
        {
          name: "por_apellidos",
          keyPath: "Apellidos",
          options: { unique: false },
        },
        { name: "por_aula", keyPath: "Id_Aula", options: { unique: false } },
        { name: "por_estado", keyPath: "Estado", options: { unique: false } },
      ],
    },
    rolesPermitidos: [
      RolesSistema.Directivo,
      RolesSistema.Auxiliar,
      RolesSistema.ProfesorPrimaria,
      RolesSistema.Tutor,
      RolesSistema.Responsable,
    ],
  },

  [TablasLocal.Tabla_Responsables]: {
    objectStore: {
      keyPath: "Id_Responsable",
      autoIncrement: false,
      indexes: [
        {
          name: "por_nombre_usuario",
          keyPath: "Nombre_Usuario",
          options: { unique: true },
        },
        { name: "por_nombres", keyPath: "Nombres", options: { unique: false } },
        {
          name: "por_apellidos",
          keyPath: "Apellidos",
          options: { unique: false },
        },
      ],
    },
    rolesPermitidos: [
      RolesSistema.Directivo,
      RolesSistema.Tutor,
      RolesSistema.Auxiliar,
      RolesSistema.ProfesorPrimaria,
    ],
  },

  [TablasLocal.Tabla_Relaciones_E_R]: {
    objectStore: {
      keyPath: "Id_Relacion",
      autoIncrement: true,
      indexes: [
        {
          name: "por_responsable",
          keyPath: "Id_Responsable",
          options: { unique: false },
        },
        {
          name: "por_estudiante",
          keyPath: "Id_Estudiante",
          options: { unique: false },
        },
        { name: "por_tipo", keyPath: "Tipo", options: { unique: false } },
      ],
    },
    rolesPermitidos: [
      RolesSistema.Directivo,
      RolesSistema.Tutor,
      RolesSistema.Auxiliar,
      RolesSistema.ProfesorPrimaria,
    ],
  },

  [TablasLocal.Tabla_Profesores_Primaria]: {
    objectStore: {
      keyPath: "Id_Profesor_Primaria",
      autoIncrement: false,
      indexes: [
        { name: "por_nombres", keyPath: "Nombres", options: { unique: false } },
        {
          name: "por_apellidos",
          keyPath: "Apellidos",
          options: { unique: false },
        },
        {
          name: "por_ultima_fecha_actualizacion",
          keyPath: "ultima_fecha_actualizacion",
          options: { unique: false },
        },
      ],
    },
    rolesPermitidos: [
      RolesSistema.Directivo,
      RolesSistema.Responsable,
      RolesSistema.Auxiliar,
    ],
  },

  [TablasLocal.Tabla_Profesores_Secundaria]: {
    objectStore: {
      keyPath: "Id_Profesor_Secundaria", // Usa Id_ en lugar de Id_
      autoIncrement: false,
      indexes: [
        {
          name: "por_nombre_usuario",
          keyPath: "Nombre_Usuario",
          options: { unique: true },
        },
        { name: "por_nombres", keyPath: "Nombres", options: { unique: false } },
        {
          name: "por_apellidos",
          keyPath: "Apellidos",
          options: { unique: false },
        },
        {
          name: "por_ultima_fecha_actualizacion",
          keyPath: "ultima_fecha_actualizacion",
          options: { unique: false },
        },
      ],
    },
    rolesPermitidos: [
      RolesSistema.Directivo,
      RolesSistema.Responsable,
      RolesSistema.Auxiliar,
    ],
  },

  [TablasLocal.Tabla_Auxiliares]: {
    objectStore: {
      keyPath: "Id_Auxiliar", // Usa Id_ en lugar de Id_
      autoIncrement: false,
      indexes: [
        {
          name: "por_nombre_usuario",
          keyPath: "Nombre_Usuario",
          options: { unique: true },
        },
        { name: "por_nombres", keyPath: "Nombres", options: { unique: false } },
        {
          name: "por_apellidos",
          keyPath: "Apellidos",
          options: { unique: false },
        },
        { name: "por_estado", keyPath: "Estado", options: { unique: false } },
      ],
    },
    rolesPermitidos: [RolesSistema.Directivo],
  },

  [TablasLocal.Tabla_Personal_Administrativo]: {
    objectStore: {
      keyPath: "Id_Personal_Administrativo", // Usa Id_ en lugar de Id_
      autoIncrement: false,
      indexes: [
        {
          name: "por_nombre_usuario",
          keyPath: "Nombre_Usuario",
          options: { unique: true },
        },
        { name: "por_nombres", keyPath: "Nombres", options: { unique: false } },
        {
          name: "por_apellidos",
          keyPath: "Apellidos",
          options: { unique: false },
        },
        { name: "por_estado", keyPath: "Estado", options: { unique: false } },
        { name: "por_cargo", keyPath: "Cargo", options: { unique: false } },
      ],
    },
    rolesPermitidos: [RolesSistema.Directivo],
  },

  // ========================================
  // ESTRUCTURA ACADÉMICA
  // ========================================

  [TablasLocal.Tabla_Aulas]: {
    objectStore: {
      keyPath: "Id_Aula",
      autoIncrement: true,
      indexes: [
        { name: "por_nivel", keyPath: "Nivel", options: { unique: false } },
        { name: "por_grado", keyPath: "Grado", options: { unique: false } },
        { name: "por_seccion", keyPath: "Seccion", options: { unique: false } },
        {
          name: "por_nivel_grado_seccion",
          keyPath: ["Nivel", "Grado", "Seccion"],
          options: { unique: true },
        },
        {
          name: "por_profesor_primaria",
          keyPath: "Id_Profesor_Primaria", // Cambió de Id_ a Id_
          options: { unique: false },
        },
        {
          name: "por_profesor_secundaria",
          keyPath: "Id_Profesor_Secundaria", // Cambió de Id_ a Id_
          options: { unique: false },
        },
      ],
    },
    rolesPermitidos: [
      RolesSistema.Directivo,
      RolesSistema.Auxiliar,
      RolesSistema.ProfesorPrimaria,
      RolesSistema.ProfesorSecundaria,
      RolesSistema.Tutor,
      RolesSistema.Responsable,
    ],
  },

  [TablasLocal.Tabla_Cursos_Horario]: {
    objectStore: {
      keyPath: "Id_Curso_Horario",
      autoIncrement: true,
      indexes: [
        { name: "por_dia", keyPath: "Dia_Semana", options: { unique: false } },
        {
          name: "por_profesor",
          keyPath: "Id_Profesor_Secundaria", // Cambió de Id_ a Id_
          options: { unique: false },
        },
        {
          name: "por_aula",
          keyPath: "Id_Aula_Secundaria",
          options: { unique: false },
        },
      ],
    },
    rolesPermitidos: [
      RolesSistema.Directivo,
      RolesSistema.Responsable,
      RolesSistema.ProfesorSecundaria,
      RolesSistema.Tutor,
    ],
  },

  // ========================================
  // CONTROL DE ASISTENCIA DEL PERSONAL
  // ========================================

  // PROFESORES PRIMARIA
  [TablasLocal.Tabla_Control_Entrada_Profesores_Primaria]: {
    objectStore: {
      keyPath: "Id_C_E_M_P_Profesores_Primaria",
      autoIncrement: false,
      indexes: [
        {
          name: "por_profesor",
          keyPath: "Id_Profesor_Primaria", // Cambió de Id_ a Id_
          options: { unique: false },
        },
        { name: "por_mes", keyPath: "Mes", options: { unique: false } },
        {
          name: "por_profesor_mes",
          keyPath: ["Id_Profesor_Primaria", "Mes"], // Cambió de Id_ a Id_
          options: { unique: true },
        },
        // ✅ NUEVO: Índice para ultima_fecha_actualizacion
        {
          name: "por_ultima_fecha_actualizacion",
          keyPath: "ultima_fecha_actualizacion",
          options: { unique: false },
        },
      ],
    },
    rolesPermitidos: [RolesSistema.Directivo, RolesSistema.ProfesorPrimaria],
  },

  [TablasLocal.Tabla_Control_Salida_Profesores_Primaria]: {
    objectStore: {
      keyPath: "Id_C_S_M_P_Profesores_Primaria",
      autoIncrement: false,
      indexes: [
        {
          name: "por_profesor",
          keyPath: "Id_Profesor_Primaria", // Cambió de Id_ a Id_
          options: { unique: false },
        },
        { name: "por_mes", keyPath: "Mes", options: { unique: false } },
        {
          name: "por_profesor_mes",
          keyPath: ["Id_Profesor_Primaria", "Mes"], // Cambió de Id_ a Id_
          options: { unique: true },
        },
        // ✅ NUEVO: Índice para ultima_fecha_actualizacion
        {
          name: "por_ultima_fecha_actualizacion",
          keyPath: "ultima_fecha_actualizacion",
          options: { unique: false },
        },
      ],
    },
    rolesPermitidos: [RolesSistema.Directivo, RolesSistema.ProfesorPrimaria],
  },

  // PROFESORES SECUNDARIA
  [TablasLocal.Tabla_Control_Entrada_Profesores_Secundaria]: {
    objectStore: {
      keyPath: "Id_C_E_M_P_Profesores_Secundaria",
      autoIncrement: false,
      indexes: [
        {
          name: "por_profesor",
          keyPath: "Id_Profesor_Secundaria", // Cambió de Id_ a Id_
          options: { unique: false },
        },
        { name: "por_mes", keyPath: "Mes", options: { unique: false } },
        {
          name: "por_profesor_mes",
          keyPath: ["Id_Profesor_Secundaria", "Mes"], // Cambió de Id_ a Id_
          options: { unique: true },
        },
        // ✅ NUEVO: Índice para ultima_fecha_actualizacion
        {
          name: "por_ultima_fecha_actualizacion",
          keyPath: "ultima_fecha_actualizacion",
          options: { unique: false },
        },
      ],
    },
    rolesPermitidos: [
      RolesSistema.Directivo,
      RolesSistema.ProfesorSecundaria,
      RolesSistema.Tutor,
    ],
  },

  [TablasLocal.Tabla_Control_Salida_Profesores_Secundaria]: {
    objectStore: {
      keyPath: "Id_C_S_M_P_Profesores_Secundaria",
      autoIncrement: false,
      indexes: [
        {
          name: "por_profesor",
          keyPath: "Id_Profesor_Secundaria", // Cambió de Id_ a Id_
          options: { unique: false },
        },
        { name: "por_mes", keyPath: "Mes", options: { unique: false } },
        {
          name: "por_profesor_mes",
          keyPath: ["Id_Profesor_Secundaria", "Mes"], // Cambió de Id_ a Id_
          options: { unique: true },
        },
        // ✅ NUEVO: Índice para ultima_fecha_actualizacion
        {
          name: "por_ultima_fecha_actualizacion",
          keyPath: "ultima_fecha_actualizacion",
          options: { unique: false },
        },
      ],
    },
    rolesPermitidos: [
      RolesSistema.Directivo,
      RolesSistema.ProfesorSecundaria,
      RolesSistema.Tutor,
    ],
  },

  // AUXILIARES
  [TablasLocal.Tabla_Control_Entrada_Auxiliares]: {
    objectStore: {
      keyPath: "Id_C_E_M_P_Auxiliar",
      autoIncrement: false,
      indexes: [
        {
          name: "por_auxiliar",
          keyPath: "Id_Auxiliar", // Cambió de Id_ a Id_
          options: { unique: false },
        },
        { name: "por_mes", keyPath: "Mes", options: { unique: false } },
        {
          name: "por_auxiliar_mes",
          keyPath: ["Id_Auxiliar", "Mes"], // Cambió de Id_ a Id_
          options: { unique: true },
        },
        // ✅ NUEVO: Índice para ultima_fecha_actualizacion
        {
          name: "por_ultima_fecha_actualizacion",
          keyPath: "ultima_fecha_actualizacion",
          options: { unique: false },
        },
      ],
    },
    rolesPermitidos: [RolesSistema.Directivo, RolesSistema.Auxiliar],
  },

  [TablasLocal.Tabla_Control_Salida_Auxiliares]: {
    objectStore: {
      keyPath: "Id_C_S_M_P_Auxiliar",
      autoIncrement: false,
      indexes: [
        {
          name: "por_auxiliar",
          keyPath: "Id_Auxiliar", // Cambió de Id_ a Id_
          options: { unique: false },
        },
        { name: "por_mes", keyPath: "Mes", options: { unique: false } },
        {
          name: "por_auxiliar_mes",
          keyPath: ["Id_Auxiliar", "Mes"], // Cambió de Id_ a Id_
          options: { unique: true },
        },
        // ✅ NUEVO: Índice para ultima_fecha_actualizacion
        {
          name: "por_ultima_fecha_actualizacion",
          keyPath: "ultima_fecha_actualizacion",
          options: { unique: false },
        },
      ],
    },
    rolesPermitidos: [RolesSistema.Directivo, RolesSistema.Auxiliar],
  },

  // PERSONAL ADMINISTRATIVO
  [TablasLocal.Tabla_Control_Entrada_Personal_Administrativo]: {
    objectStore: {
      keyPath: "Id_C_E_M_P_Administrativo",
      autoIncrement: false,
      indexes: [
        {
          name: "por_administrativo",
          keyPath: "Id_Personal_Administrativo", // Cambió de Id_ a Id_
          options: { unique: false },
        },
        { name: "por_mes", keyPath: "Mes", options: { unique: false } },
        {
          name: "por_administrativo_mes",
          keyPath: ["Id_Personal_Administrativo", "Mes"], // Cambió de Id_ a Id_
          options: { unique: true },
        },
        // ✅ NUEVO: Índice para ultima_fecha_actualizacion
        {
          name: "por_ultima_fecha_actualizacion",
          keyPath: "ultima_fecha_actualizacion",
          options: { unique: false },
        },
      ],
    },
    rolesPermitidos: [
      RolesSistema.Directivo,
      RolesSistema.PersonalAdministrativo,
    ],
  },

  [TablasLocal.Tabla_Control_Salida_Personal_Administrativo]: {
    objectStore: {
      keyPath: "Id_C_S_M_P_Administrativo",
      autoIncrement: false,
      indexes: [
        {
          name: "por_administrativo",
          keyPath: "Id_Personal_Administrativo", // Cambió de Id_ a Id_
          options: { unique: false },
        },
        { name: "por_mes", keyPath: "Mes", options: { unique: false } },
        {
          name: "por_administrativo_mes",
          keyPath: ["Id_Personal_Administrativo", "Mes"], // Cambió de Id_ a Id_
          options: { unique: true },
        },
        // ✅ NUEVO: Índice para ultima_fecha_actualizacion
        {
          name: "por_ultima_fecha_actualizacion",
          keyPath: "ultima_fecha_actualizacion",
          options: { unique: false },
        },
      ],
    },
    rolesPermitidos: [
      RolesSistema.Directivo,
      RolesSistema.PersonalAdministrativo,
    ],
  },

  // ✅ AGREGADO: DIRECTIVOS
  [TablasLocal.Tabla_Control_Entrada_Directivos]: {
    objectStore: {
      keyPath: "Id_C_E_M_P_Directivo",
      autoIncrement: true,
      indexes: [
        {
          name: "por_directivo",
          keyPath: "Id_Directivo", // Mantiene Id_Directivo
          options: { unique: false },
        },
        { name: "por_mes", keyPath: "Mes", options: { unique: false } },
        {
          name: "por_directivo_mes",
          keyPath: ["Id_Directivo", "Mes"],
          options: { unique: true },
        },
        // ✅ NUEVO: Índice para ultima_fecha_actualizacion
        {
          name: "por_ultima_fecha_actualizacion",
          keyPath: "ultima_fecha_actualizacion",
          options: { unique: false },
        },
      ],
    },
    rolesPermitidos: [RolesSistema.Directivo],
  },

  [TablasLocal.Tabla_Control_Salida_Directivos]: {
    objectStore: {
      keyPath: "Id_C_S_M_P_Directivo",
      autoIncrement: true,
      indexes: [
        {
          name: "por_directivo",
          keyPath: "Id_Directivo", // Mantiene Id_Directivo
          options: { unique: false },
        },
        { name: "por_mes", keyPath: "Mes", options: { unique: false } },
        {
          name: "por_directivo_mes",
          keyPath: ["Id_Directivo", "Mes"],
          options: { unique: true },
        },
        // ✅ NUEVO: Índice para ultima_fecha_actualizacion
        {
          name: "por_ultima_fecha_actualizacion",
          keyPath: "ultima_fecha_actualizacion",
          options: { unique: false },
        },
      ],
    },
    rolesPermitidos: [RolesSistema.Directivo],
  },

  // ========================================
  // ASISTENCIA ESTUDIANTIL
  // ========================================

  // PRIMARIA (6 grados)
  [TablasLocal.Tabla_Asistencia_Primaria_1]: {
    objectStore: {
      keyPath: ["Id_Estudiante", "Mes"],
      autoIncrement: false,
      indexes: [
        {
          name: "por_estudiante",
          keyPath: "Id_Estudiante",
          options: { unique: false },
        },
        { name: "por_mes", keyPath: "Mes", options: { unique: false } },
        {
          name: "por_estudiante_mes",
          keyPath: ["Id_Estudiante", "Mes"],
          options: { unique: true },
        },
        {
          name: "por_ultima_fecha_actualizacion",
          keyPath: "ultima_fecha_actualizacion",
          options: { unique: false },
        },
      ],
    },
    rolesPermitidos: [
      RolesSistema.Directivo,
      RolesSistema.ProfesorPrimaria,
      RolesSistema.Responsable,
    ],
  },

  [TablasLocal.Tabla_Asistencia_Primaria_2]: {
    objectStore: {
      keyPath: ["Id_Estudiante", "Mes"],
      autoIncrement: false,
      indexes: [
        {
          name: "por_estudiante",
          keyPath: "Id_Estudiante",
          options: { unique: false },
        },
        { name: "por_mes", keyPath: "Mes", options: { unique: false } },
        {
          name: "por_estudiante_mes",
          keyPath: ["Id_Estudiante", "Mes"],
          options: { unique: true },
        },
        {
          name: "por_ultima_fecha_actualizacion",
          keyPath: "ultima_fecha_actualizacion",
          options: { unique: false },
        },
      ],
    },
    rolesPermitidos: [
      RolesSistema.Directivo,
      RolesSistema.ProfesorPrimaria,
      RolesSistema.Responsable,
    ],
  },

  [TablasLocal.Tabla_Asistencia_Primaria_3]: {
    objectStore: {
      keyPath: ["Id_Estudiante", "Mes"],
      autoIncrement: false,
      indexes: [
        {
          name: "por_estudiante",
          keyPath: "Id_Estudiante",
          options: { unique: false },
        },
        { name: "por_mes", keyPath: "Mes", options: { unique: false } },
        {
          name: "por_estudiante_mes",
          keyPath: ["Id_Estudiante", "Mes"],
          options: { unique: true },
        },
        {
          name: "por_ultima_fecha_actualizacion",
          keyPath: "ultima_fecha_actualizacion",
          options: { unique: false },
        },
      ],
    },
    rolesPermitidos: [
      RolesSistema.Directivo,
      RolesSistema.ProfesorPrimaria,
      RolesSistema.Responsable,
    ],
  },

  [TablasLocal.Tabla_Asistencia_Primaria_4]: {
    objectStore: {
      keyPath: ["Id_Estudiante", "Mes"],
      autoIncrement: false,
      indexes: [
        {
          name: "por_estudiante",
          keyPath: "Id_Estudiante",
          options: { unique: false },
        },
        { name: "por_mes", keyPath: "Mes", options: { unique: false } },
        {
          name: "por_estudiante_mes",
          keyPath: ["Id_Estudiante", "Mes"],
          options: { unique: true },
        },
        {
          name: "por_ultima_fecha_actualizacion",
          keyPath: "ultima_fecha_actualizacion",
          options: { unique: false },
        },
      ],
    },
    rolesPermitidos: [
      RolesSistema.Directivo,
      RolesSistema.ProfesorPrimaria,
      RolesSistema.Responsable,
    ],
  },

  [TablasLocal.Tabla_Asistencia_Primaria_5]: {
    objectStore: {
      keyPath: ["Id_Estudiante", "Mes"],
      autoIncrement: false,
      indexes: [
        {
          name: "por_estudiante",
          keyPath: "Id_Estudiante",
          options: { unique: false },
        },
        { name: "por_mes", keyPath: "Mes", options: { unique: false } },
        {
          name: "por_estudiante_mes",
          keyPath: ["Id_Estudiante", "Mes"],
          options: { unique: true },
        },
        {
          name: "por_ultima_fecha_actualizacion",
          keyPath: "ultima_fecha_actualizacion",
          options: { unique: false },
        },
      ],
    },
    rolesPermitidos: [
      RolesSistema.Directivo,
      RolesSistema.ProfesorPrimaria,
      RolesSistema.Responsable,
    ],
  },

  asistencias_e_p_6: {
    objectStore: {
      keyPath: ["Id_Estudiante", "Mes"],
      autoIncrement: false,
      indexes: [
        {
          name: "por_estudiante",
          keyPath: "Id_Estudiante",
          options: { unique: false },
        },
        { name: "por_mes", keyPath: "Mes", options: { unique: false } },
        {
          name: "por_estudiante_mes",
          keyPath: ["Id_Estudiante", "Mes"],
          options: { unique: true },
        },
        {
          name: "por_ultima_fecha_actualizacion",
          keyPath: "ultima_fecha_actualizacion",
          options: { unique: false },
        },
      ],
    },
    rolesPermitidos: [
      RolesSistema.Directivo,
      RolesSistema.ProfesorPrimaria,
      RolesSistema.Responsable,
    ],
  },

  // SECUNDARIA (5 grados)
  [TablasLocal.Tabla_Asistencia_Secundaria_1]: {
    objectStore: {
      keyPath: ["Id_Estudiante", "Mes"],
      autoIncrement: false,
      indexes: [
        {
          name: "por_estudiante",
          keyPath: "Id_Estudiante",
          options: { unique: false },
        },
        { name: "por_mes", keyPath: "Mes", options: { unique: false } },
        {
          name: "por_estudiante_mes",
          keyPath: ["Id_Estudiante", "Mes"],
          options: { unique: true },
        },
        {
          name: "por_ultima_fecha_actualizacion",
          keyPath: "ultima_fecha_actualizacion",
          options: { unique: false },
        },
      ],
    },
    rolesPermitidos: [
      RolesSistema.Directivo,
      RolesSistema.Tutor,
      RolesSistema.Responsable,
    ],
  },

  [TablasLocal.Tabla_Asistencia_Secundaria_2]: {
    objectStore: {
      keyPath: ["Id_Estudiante", "Mes"],
      autoIncrement: false,
      indexes: [
        {
          name: "por_estudiante",
          keyPath: "Id_Estudiante",
          options: { unique: false },
        },
        { name: "por_mes", keyPath: "Mes", options: { unique: false } },
        {
          name: "por_estudiante_mes",
          keyPath: ["Id_Estudiante", "Mes"],
          options: { unique: true },
        },
        {
          name: "por_ultima_fecha_actualizacion",
          keyPath: "ultima_fecha_actualizacion",
          options: { unique: false },
        },
      ],
    },
    rolesPermitidos: [
      RolesSistema.Directivo,
      RolesSistema.Tutor,
      RolesSistema.Responsable,
    ],
  },

  [TablasLocal.Tabla_Asistencia_Secundaria_3]: {
    objectStore: {
      keyPath: ["Id_Estudiante", "Mes"],
      autoIncrement: false,
      indexes: [
        {
          name: "por_estudiante",
          keyPath: "Id_Estudiante",
          options: { unique: false },
        },
        { name: "por_mes", keyPath: "Mes", options: { unique: false } },
        {
          name: "por_estudiante_mes",
          keyPath: ["Id_Estudiante", "Mes"],
          options: { unique: true },
        },
        {
          name: "por_ultima_fecha_actualizacion",
          keyPath: "ultima_fecha_actualizacion",
          options: { unique: false },
        },
      ],
    },
    rolesPermitidos: [
      RolesSistema.Directivo,
      RolesSistema.Tutor,
      RolesSistema.Responsable,
    ],
  },

  [TablasLocal.Tabla_Asistencia_Secundaria_4]: {
    objectStore: {
      keyPath: ["Id_Estudiante", "Mes"],
      autoIncrement: false,
      indexes: [
        {
          name: "por_estudiante",
          keyPath: "Id_Estudiante",
          options: { unique: false },
        },
        { name: "por_mes", keyPath: "Mes", options: { unique: false } },
        {
          name: "por_estudiante_mes",
          keyPath: ["Id_Estudiante", "Mes"],
          options: { unique: true },
        },
        {
          name: "por_ultima_fecha_actualizacion",
          keyPath: "ultima_fecha_actualizacion",
          options: { unique: false },
        },
      ],
    },
    rolesPermitidos: [
      RolesSistema.Directivo,
      RolesSistema.Tutor,
      RolesSistema.Responsable,
    ],
  },

  [TablasLocal.Tabla_Asistencia_Secundaria_5]: {
    objectStore: {
      keyPath: ["Id_Estudiante", "Mes"],
      autoIncrement: false,
      indexes: [
        {
          name: "por_estudiante",
          keyPath: "Id_Estudiante",
          options: { unique: false },
        },
        { name: "por_mes", keyPath: "Mes", options: { unique: false } },
        {
          name: "por_estudiante_mes",
          keyPath: ["Id_Estudiante", "Mes"],
          options: { unique: true },
        },
        {
          name: "por_ultima_fecha_actualizacion",
          keyPath: "ultima_fecha_actualizacion",
          options: { unique: false },
        },
      ],
    },
    rolesPermitidos: [
      RolesSistema.Directivo,
      RolesSistema.Tutor,
      RolesSistema.Responsable,
    ],
  },

  [TablasLocal.Tabla_Recreos]: {
    objectStore: {
      keyPath: "Id_Recreo",
      autoIncrement: true,
      indexes: [
        {
          name: "por_nivel_educativo",
          keyPath: "Nivel_Educativo",
          options: { unique: false },
        },
        {
          name: "por_bloque_inicio",
          keyPath: "Bloque_Inicio",
          options: { unique: false },
        },
        {
          name: "por_ultima_modificacion",
          keyPath: "Ultima_Modificacion",
          options: { unique: false },
        },
        {
          name: "por_nivel_bloque",
          keyPath: ["Nivel_Educativo", "Bloque_Inicio"],
          options: { unique: false },
        },
      ],
    },
    rolesPermitidos: [
      RolesSistema.Directivo,
      RolesSistema.ProfesorPrimaria,
      RolesSistema.Auxiliar,
      RolesSistema.ProfesorSecundaria,
      RolesSistema.Tutor,
    ],
  },

  // ========================================
  // CONFIGURACIÓN Y ADMINISTRACIÓN
  // ========================================

  [TablasLocal.Tabla_Bloqueo_Roles]: {
    objectStore: {
      keyPath: "Rol", // Ahora usa Rol como PK en lugar de Id_Bloqueo_Rol
      autoIncrement: false,
      indexes: [
        // 🗑️ REMOVIDO: ya no necesita índice por_rol porque Rol es la PK
      ],
    },
    rolesPermitidos: [RolesSistema.Directivo],
  },

  [TablasLocal.Tabla_Ajustes_Sistema]: {
    objectStore: {
      keyPath: "Id_Constante",
      autoIncrement: true,
      indexes: [
        { name: "por_nombre", keyPath: "Nombre", options: { unique: true } },
      ],
    },
    rolesPermitidos: [
      RolesSistema.Directivo,
      RolesSistema.ProfesorPrimaria,
      RolesSistema.Auxiliar,
      RolesSistema.ProfesorSecundaria,
      RolesSistema.Tutor,
      RolesSistema.PersonalAdministrativo,
      RolesSistema.Responsable,
    ],
  },

  [TablasLocal.Tabla_Horarios_Generales]: {
    objectStore: {
      keyPath: "Id_Horario",
      autoIncrement: true,
      indexes: [
        { name: "por_nombre", keyPath: "Nombre", options: { unique: true } },
      ],
    },
    rolesPermitidos: [
      RolesSistema.Directivo,
      RolesSistema.ProfesorPrimaria,
      RolesSistema.Auxiliar,
      RolesSistema.ProfesorSecundaria,
      RolesSistema.Tutor,
      RolesSistema.PersonalAdministrativo,
      RolesSistema.Responsable,
    ],
  },
  [TablasLocal.Tabla_Horarios_Por_Dias_Personal_Administrativo]: {
    objectStore: {
      keyPath: "Id_Horario_Por_Dia_P_Administrativo",
      autoIncrement: true,
      indexes: [
        {
          name: "por_personal_administrativo",
          keyPath: "Id_Personal_Administrativo",
          options: { unique: false },
        },
        {
          name: "por_dia",
          keyPath: "Dia",
          options: { unique: false },
        },
        {
          name: "por_personal_dia",
          keyPath: ["Id_Personal_Administrativo", "Dia"],
          options: { unique: true },
        },
        {
          name: "por_hora_inicio",
          keyPath: "Hora_Inicio",
          options: { unique: false },
        },
        {
          name: "por_hora_fin",
          keyPath: "Hora_Fin",
          options: { unique: false },
        },
      ],
    },
    rolesPermitidos: [
      RolesSistema.Directivo,
      RolesSistema.PersonalAdministrativo,
    ],
  },

  [TablasLocal.Tabla_Horarios_Por_Dias_Directivos]: {
    objectStore: {
      keyPath: "Id_Horario_Por_Dia_Directivo",
      autoIncrement: true,
      indexes: [
        {
          name: "por_directivo",
          keyPath: "Id_Directivo",
          options: { unique: false },
        },
        {
          name: "por_dia",
          keyPath: "Dia",
          options: { unique: false },
        },
        {
          name: "por_directivo_dia",
          keyPath: ["Id_Directivo", "Dia"],
          options: { unique: true },
        },
        {
          name: "por_hora_inicio",
          keyPath: "Hora_Inicio",
          options: { unique: false },
        },
        {
          name: "por_hora_fin",
          keyPath: "Hora_Fin",
          options: { unique: false },
        },
      ],
    },
    rolesPermitidos: [RolesSistema.Directivo],
  },

  [TablasLocal.Tabla_Eventos]: {
    objectStore: {
      keyPath: "Id_Evento",
      autoIncrement: true,
      indexes: [
        {
          name: "por_fecha_inicio",
          keyPath: "Fecha_Inicio",
          options: { unique: false },
        },
        {
          name: "por_fecha_conclusion",
          keyPath: "Fecha_Conclusion",
          options: { unique: false },
        },
        {
          name: "por_mes_año_inicio",
          keyPath: "mes_año_inicio",
          options: { unique: false },
        },
        {
          name: "por_mes_año_conclusion",
          keyPath: "mes_año_conclusion",
          options: { unique: false },
        },
      ],
    },
    rolesPermitidos: [
      RolesSistema.Directivo,
      RolesSistema.ProfesorPrimaria,
      RolesSistema.Auxiliar,
      RolesSistema.ProfesorSecundaria,
      RolesSistema.Tutor,
      RolesSistema.PersonalAdministrativo,
      RolesSistema.Responsable,
    ],
  },

  [TablasLocal.Tabla_Comunicados]: {
    objectStore: {
      keyPath: "Id_Comunicado",
      autoIncrement: true,
      indexes: [
        {
          name: "por_fecha_inicio",
          keyPath: "Fecha_Inicio",
          options: { unique: false },
        },
        {
          name: "por_fecha_conclusion",
          keyPath: "Fecha_Conclusion",
          options: { unique: false },
        },
      ],
    },
    rolesPermitidos: [
      RolesSistema.Directivo,
      RolesSistema.ProfesorPrimaria,
      RolesSistema.Auxiliar,
      RolesSistema.ProfesorSecundaria,
      RolesSistema.Tutor,
      RolesSistema.PersonalAdministrativo,
      RolesSistema.Responsable,
    ],
  },

  // ✅ AGREGADO: Códigos OTP
  codigos_otp: {
    objectStore: {
      keyPath: "Id_Codigo_OTP",
      autoIncrement: true,
      indexes: [
        {
          name: "por_correo_destino",
          keyPath: "Correo_Destino",
          options: { unique: false },
        },
        {
          name: "por_rol_usuario",
          keyPath: "Rol_Usuario",
          options: { unique: false },
        },
        {
          name: "por_id_usuario",
          keyPath: "Id_Usuario",
          options: { unique: false },
        },
        { name: "por_codigo", keyPath: "Codigo", options: { unique: false } },
        {
          name: "por_fecha_creacion",
          keyPath: "Fecha_Creacion",
          options: { unique: false },
        },
        {
          name: "por_fecha_expiracion",
          keyPath: "Fecha_Expiracion",
          options: { unique: false },
        },
        {
          name: "por_correo_codigo",
          keyPath: ["Correo_Destino", "Codigo"],
          options: { unique: false },
        },
      ],
    },
    rolesPermitidos: [
      RolesSistema.Directivo,
      RolesSistema.Tutor,
      RolesSistema.Auxiliar,
    ],
  },

  [TablasLocal.Tabla_Registro_Fallos]: {
    objectStore: {
      keyPath: "Id_Registro_Fallo_Sistema",
      autoIncrement: true,
      indexes: [
        { name: "por_fecha", keyPath: "Fecha", options: { unique: false } },
        {
          name: "por_componente",
          keyPath: "Componente",
          options: { unique: false },
        },
      ],
    },
    rolesPermitidos: [
      RolesSistema.Directivo,
      RolesSistema.ProfesorPrimaria,
      RolesSistema.Auxiliar,
      RolesSistema.ProfesorSecundaria,
      RolesSistema.Tutor,
      RolesSistema.PersonalAdministrativo,
      RolesSistema.Responsable,
    ],
  },

  [TablasLocal.Tabla_Ultima_Modificacion]: {
    objectStore: {
      keyPath: "Nombre_Tabla",
      autoIncrement: false,
      indexes: [
        {
          name: "por_operacion",
          keyPath: "Operacion",
          options: { unique: false },
        },
        {
          name: "por_fecha",
          keyPath: "Fecha_Modificacion",
          options: { unique: false },
        },
        {
          name: "por_usuario",
          keyPath: "Usuario_Modificacion",
          options: { unique: false },
        },
      ],
    },
    rolesPermitidos: [
      RolesSistema.Directivo,
      RolesSistema.ProfesorPrimaria,
      RolesSistema.Auxiliar,
      RolesSistema.ProfesorSecundaria,
      RolesSistema.Tutor,
      RolesSistema.PersonalAdministrativo,
      RolesSistema.Responsable,
    ],
  },

  [TablasLocal.Tabla_Fechas_Importantes]: {
    objectStore: {
      keyPath: "Id_Fecha_Importante",
      autoIncrement: true,
      indexes: [
        { name: "por_nombre", keyPath: "Nombre", options: { unique: true } },
        { name: "por_valor", keyPath: "Valor", options: { unique: false } },
        {
          name: "por_ultima_modificacion",
          keyPath: "Ultima_Modificacion",
          options: { unique: false },
        },
      ],
    },
    rolesPermitidos: [
      RolesSistema.Directivo,
      RolesSistema.ProfesorPrimaria,
      RolesSistema.Auxiliar,
      RolesSistema.ProfesorSecundaria,
      RolesSistema.Tutor,
      RolesSistema.PersonalAdministrativo,
      RolesSistema.Responsable,
    ],
  },

  [TablasLocal.Tabla_Vacaciones_Interescolares]: {
    objectStore: {
      keyPath: "Id_Vacacion_Interescolar",
      autoIncrement: true,
      indexes: [
        {
          name: "por_fecha_inicio",
          keyPath: "Fecha_Inicio",
          options: { unique: false },
        },
        {
          name: "por_fecha_conclusion",
          keyPath: "Fecha_Conclusion",
          options: { unique: false },
        },
        {
          name: "por_rango_fechas",
          keyPath: ["Fecha_Inicio", "Fecha_Conclusion"],
          options: { unique: false },
        },
      ],
    },
    rolesPermitidos: [
      RolesSistema.Directivo,
      RolesSistema.ProfesorPrimaria,
      RolesSistema.Auxiliar,
      RolesSistema.ProfesorSecundaria,
      RolesSistema.Tutor,
      RolesSistema.Responsable,
    ],
  },

  // ========================================
  // STORES LOCALES Y CACHE
  // ========================================

  [TablasLocal.Tabla_Ultima_Actualizacion]: {
    objectStore: {
      keyPath: "Nombre_Tabla",
      autoIncrement: false,
      indexes: [
        {
          name: "por_operacion",
          keyPath: "Operacion",
          options: { unique: false },
        },
        {
          name: "por_fecha",
          keyPath: "Fecha_Actualizacion",
          options: { unique: false },
        },
      ],
    },
    rolesPermitidos: [
      RolesSistema.Directivo,
      RolesSistema.ProfesorPrimaria,
      RolesSistema.Auxiliar,
      RolesSistema.ProfesorSecundaria,
      RolesSistema.Tutor,
      RolesSistema.PersonalAdministrativo,
      RolesSistema.Responsable,
    ],
  },

  [TablasLocal.Tabla_Solicitudes_Offline]: {
    objectStore: {
      keyPath: "id",
      autoIncrement: true,
      indexes: [
        {
          name: "por_created_at",
          keyPath: "created_at",
          options: { unique: false },
        },
        {
          name: "por_attempts",
          keyPath: "attempts",
          options: { unique: false },
        },
      ],
    },
    rolesPermitidos: [
      RolesSistema.Directivo,
      RolesSistema.ProfesorPrimaria,
      RolesSistema.Auxiliar,
      RolesSistema.ProfesorSecundaria,
      RolesSistema.Tutor,
      RolesSistema.PersonalAdministrativo,
      RolesSistema.Responsable,
    ],
  },

  [TablasLocal.Tabla_Metadatos_Sistema]: {
    objectStore: {
      keyPath: "key",
      autoIncrement: false,
      indexes: [],
    },
    rolesPermitidos: [
      RolesSistema.Directivo,
      RolesSistema.ProfesorPrimaria,
      RolesSistema.Auxiliar,
      RolesSistema.ProfesorSecundaria,
      RolesSistema.Tutor,
      RolesSistema.PersonalAdministrativo,
      RolesSistema.Responsable,
    ],
  },

  // Cache de asistencias consultadas desde Redis
  [TablasLocal.Tabla_Asistencias_Tomadas_Hoy]: {
    objectStore: {
      keyPath: "clave",
      autoIncrement: false,
      indexes: [
        {
          name: "por_identificador",
          keyPath: "identificador",
          options: { unique: false },
        },
        { name: "por_fecha", keyPath: "fecha", options: { unique: false } },
        { name: "por_actor", keyPath: "actor", options: { unique: false } },
        {
          name: "por_modo_registro",
          keyPath: "modoRegistro",
          options: { unique: false },
        },
        {
          name: "por_tipo_asistencia",
          keyPath: "tipoAsistencia",
          options: { unique: false },
        },
        {
          name: "por_timestamp_consulta",
          keyPath: "timestampConsulta",
          options: { unique: false },
        },
        {
          name: "por_identificador_modo",
          keyPath: ["identificador", "modoRegistro"],
          options: { unique: false },
        },
        {
          name: "por_actor_tipo",
          keyPath: ["actor", "tipoAsistencia"],
          options: { unique: false },
        },
        {
          name: "por_fecha_identificador",
          keyPath: ["fecha", "identificador"],
          options: { unique: false },
        },
      ],
    },
    rolesPermitidos: [
      RolesSistema.Directivo,
      RolesSistema.ProfesorPrimaria,
      RolesSistema.Auxiliar,
      RolesSistema.ProfesorSecundaria,
      RolesSistema.Tutor,
      RolesSistema.PersonalAdministrativo,
      RolesSistema.Responsable,
    ],
  },

  [TablasLocal.Tabla_Usuarios_Genericos_Cache]: {
    objectStore: {
      keyPath: "clave_busqueda",
      autoIncrement: false,
      indexes: [
        { name: "por_rol", keyPath: "rol", options: { unique: false } },
        {
          name: "por_criterio",
          keyPath: "criterio",
          options: { unique: false },
        },
        { name: "por_limite", keyPath: "limite", options: { unique: false } },
        {
          name: "por_ultima_actualizacion",
          keyPath: "ultima_actualizacion",
          options: { unique: false },
        },
        {
          name: "por_rol_criterio",
          keyPath: ["rol", "criterio"],
          options: { unique: false },
        },
      ],
    },
    rolesPermitidos: [RolesSistema.Directivo],
  },

  [TablasLocal.Tabla_Cola_Asistencias_Escolares]: {
    objectStore: {
      keyPath: "NumeroDeOrden",
      autoIncrement: false,
      indexes: [
        {
          name: "por_estudiante",
          keyPath: "Id_Estudiante",
          options: { unique: false },
        },
        {
          name: "por_tipo_asistencia",
          keyPath: "TipoAsistencia",
          options: { unique: false },
        },
        {
          name: "por_desfase_segundos",
          keyPath: "DesfaseSegundos",
          options: { unique: false },
        },
        {
          name: "por_estudiante_tipo",
          keyPath: ["Id_Estudiante", "TipoAsistencia"],
          options: { unique: false },
        },
        {
          name: "por_tipo_desfase",
          keyPath: ["TipoAsistencia", "DesfaseSegundos"],
          options: { unique: false },
        },
      ],
    },
    rolesPermitidos: [
      RolesSistema.ProfesorPrimaria,
      RolesSistema.Auxiliar,
    ],
  },

  // ========================================
  // REPORTES
  // ========================================
  [TablasLocal.Tabla_Reportes_Asistencia_Escolar]: {
    objectStore: {
      keyPath: "Combinacion_Parametros_Reporte",
      autoIncrement: false,
      indexes: [
        {
          name: "por_estado",
          keyPath: "Estado_Reporte",
          options: { unique: false },
        },
        {
          name: "por_fecha_generacion",
          keyPath: "Fecha_Generacion",
          options: { unique: false },
        },
        {
          name: "por_google_drive_id",
          keyPath: "Datos_Google_Drive_Id",
          options: { unique: false },
        },
        {
          name: "por_ultima_actualizacion",
          keyPath: "ultima_fecha_actualizacion",
          options: { unique: false },
        },
        {
          name: "por_estado_fecha",
          keyPath: ["Estado_Reporte", "Fecha_Generacion"],
          options: { unique: false },
        },
      ],
    },
    rolesPermitidos: [
      RolesSistema.Directivo,
      RolesSistema.Auxiliar,
      RolesSistema.ProfesorPrimaria,
      RolesSistema.Tutor,
    ],
  },
};