// import { useDelegacionEventos } from "@/hooks/useDelegacionDeEventos";
// import { RolesSistema } from "@/interfaces/shared/RolesSistema";
// import { useEffect, useState } from "react";

// interface SiasisUserSelectorProps {
//   rolUsuariosABuscar?: RolesSistema;
// }

// const SiasisUserSelector = ({
//   rolUsuariosABuscar,
// }: SiasisUserSelectorProps) => {
//   const { estaDesplegado, setEstaDesplegado } = useState(false);

//   const { delegarEvento } = useDelegacionEventos();

//   useEffect(() => {
//     if (!delegarEvento) return;

//     // Cerrar menú desplegable al hacer clic fuera
//     delegarEvento(
//       "mousedown",
//       "#Menu-deplegable, #Menu-deplegable *, #despliegue-icon, #despliegue-icon *",
//       () => {
//         setMenuVisible(false);
//       },
//       true
//     );
//   }, [delegarEvento]);

//   useEffect(() => {}, [rolUsuariosABuscar]);

//   return (
//     <>
//       <div>{estaDesplegado && <div></div>}</div>;
//     </>
//   );
// };

// export default SiasisUserSelector;
