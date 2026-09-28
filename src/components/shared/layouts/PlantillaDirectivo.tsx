import Header from "./Header";
import { RequestCookie } from "next/dist/compiled/@edge-runtime/cookies";
import SidebarDirectivo from "./sidebars/SidebarDirectivo";
import { RolesSistema } from "@/interfaces/shared/RolesSistema";

const PlantillaDirectivo = ({
  children,
  Nombres,
  Apellidos,
  Google_Drive_Foto_ID,
  Genero,
}: {
  children: React.ReactNode;
  Nombres: RequestCookie;
  Apellidos: RequestCookie;
  Genero: RequestCookie;
  Google_Drive_Foto_ID: string | null;
}) => {
  return (
    <>
      <section className="w-full flex flex-col relative">
        <Header
          Genero={Genero}
          Nombres={Nombres}
          Apellidos={Apellidos}
          Rol={RolesSistema.Directivo}
          Google_Drive_Foto_ID={Google_Drive_Foto_ID}
        />
        <div
          style={{ contain: "inline-size" }}
          className="w-full flex flex-1 items-start relative"
        >
          <SidebarDirectivo />
          {children}
        </div>
      </section>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
    </>
  );
};

export default PlantillaDirectivo;
