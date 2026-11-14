import type { Estado } from "@/hooks/useRecurso";
import { Aviso, Fuente } from "./ui";

export function EstadoDatos<T>({ estado, fuente, simulado }: { estado: Estado<T>; fuente: string; simulado?: boolean }) {
  return (
    <div className="space-y-2">
      {simulado && <Aviso tipo="alerta">⚠️ <b>DATOS SIMULADOS</b>: modo prueba sin internet (MOCK_DATA=1). No usar para decidir.</Aviso>}
      {estado.estado === "cache" && (
        <Aviso tipo="alerta">
          📴 Sin conexión: mostramos los datos guardados el {new Date(estado.t!).toLocaleString("es-AR")}.
        </Aviso>
      )}
      <Fuente>{fuente}</Fuente>
    </div>
  );
}
