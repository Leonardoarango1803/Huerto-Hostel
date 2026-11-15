import { useEffect, useMemo, useState } from "react";
import { reservasApi } from "../../api/reservas";
import { clientesApi } from "../../api/clientes";
import { mensajeDeError } from "../../api/errores";
import { hoyISO } from "../../utils/fechas";
import { AvisoIncidencia } from "../../components/AvisoIncidencia";
import { useIncidenciasPorHabitacion } from "../../hooks/useIncidenciasPorHabitacion";
import { AlertBanner, FormField, FormModal, Input, Select } from "../../components/ui";
import type { Cliente, Reserva } from "../../api/types";
import { useDisponibilidad } from "./useDisponibilidad";

interface Props {
  /** Se monta una vez por edicion: el formulario parte de los datos actuales de la reserva. */
  reserva: Reserva;
  /** Total ya pagado de la reserva: con pagos no se cambia el huesped y se avisa si el nuevo total queda por debajo. */
  pagado: number;
  onClose: () => void;
  onGuardada: (r: Reserva) => void;
}

const soles = (n: number) => `S/ ${n.toFixed(2)}`;

function noches(checkin: string, checkout: string): number {
  if (!checkin || !checkout) return 0;
  const [a1, m1, d1] = checkin.split("-").map(Number);
  const [a2, m2, d2] = checkout.split("-").map(Number);
  return Math.round((Date.UTC(a2, m2 - 1, d2) - Date.UTC(a1, m1 - 1, d1)) / 86_400_000);
}

/** Modificar una reserva antes del check-in (RF05): huesped, habitacion, fechas y observaciones. */
export function EditarReservaModal({ reserva, pagado, onClose, onGuardada }: Props) {
  const incidencias = useIncidenciasPorHabitacion();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [idCliente, setIdCliente] = useState(reserva.cliente.idCliente);
  const [idHabitacion, setIdHabitacion] = useState(reserva.habitacion.idHabitacion);
  const [checkin, setCheckin] = useState(reserva.fechaCheckinPrevisto);
  const [checkout, setCheckout] = useState(reserva.fechaCheckoutPrevisto);
  const [observaciones, setObservaciones] = useState(reserva.observaciones ?? "");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Con pagos el titular no cambia: no hace falta la lista de huespedes.
    if (pagado > 0) return;
    let vigente = true;
    clientesApi.listar().then((c) => vigente && setClientes(c)).catch(() => undefined);
    return () => {
      vigente = false;
    };
  }, [pagado]);

  const disp = useDisponibilidad(checkin, checkout, reserva.idReserva);

  const cambiaPrecio = idHabitacion !== reserva.habitacion.idHabitacion
    || checkin !== reserva.fechaCheckinPrevisto || checkout !== reserva.fechaCheckoutPrevisto;
  const n = noches(checkin, checkout);
  const habElegida = disp.habitaciones?.find((h) => h.idHabitacion === idHabitacion);
  const precioNoche = habElegida?.precioNoche ?? reserva.habitacion.tipoHabitacion.precioNoche ?? 0;
  const nuevoTotal = cambiaPrecio ? Number(precioNoche) * n : Number(reserva.montoAlojamientoTotal ?? 0);
  const ocupante = disp.ocupadas.get(idHabitacion);

  const problema = useMemo(() => {
    if (!checkin || !checkout) return "Indica las fechas de llegada y salida.";
    if (n <= 0) return "La salida debe ser posterior a la llegada.";
    if (checkin !== reserva.fechaCheckinPrevisto && checkin < hoyISO()) return "La nueva llegada no puede ser anterior a hoy.";
    if (ocupante) return `La habitación ya está reservada en esas noches (RES-${String(ocupante.idReserva).padStart(3, "0")}, ${ocupante.huesped}).`;
    return null;
  }, [checkin, checkout, n, reserva, ocupante]);

  async function guardar() {
    if (problema) {
      setError(problema);
      return;
    }
    setGuardando(true);
    setError(null);
    try {
      const editada = await reservasApi.editar(reserva.idReserva, {
        idCliente: idCliente !== reserva.cliente.idCliente ? idCliente : undefined,
        idHabitacion,
        fechaCheckinPrevisto: checkin,
        fechaCheckoutPrevisto: checkout,
        observaciones,
      });
      onGuardada(editada);
    } catch (err) {
      setError(mensajeDeError(err, "No se pudo modificar la reserva."));
    } finally {
      setGuardando(false);
    }
  }

  const habitaciones = disp.habitaciones ?? [reserva.habitacion].map((h) => ({
    idHabitacion: h.idHabitacion, numero: h.numero, tipo: h.tipoHabitacion.nombre, precioNoche: h.tipoHabitacion.precioNoche,
  }));
  const totalAntes = Number(reserva.montoAlojamientoTotal);

  return (
    <FormModal
      open
      title={`Modificar RES-${String(reserva.idReserva).padStart(3, "0")}`}
      subtitle="Cambia huésped, habitación, fechas u observaciones antes del check-in"
      submitLabel="Guardar cambios"
      loading={guardando}
      submitDisabled={!!problema}
      onClose={onClose}
      onSubmit={guardar}
      size="md"
    >
      {error && <AlertBanner type="error" message={error} dismissible={false} />}

      <FormField label="Huésped" required>
        {pagado > 0 ? (
          <>
            <Input value={`${reserva.cliente.nombres} ${reserva.cliente.apellidos}`} disabled />
            <p className="text-[12px] text-slate-500 mt-1">Ya tiene pagos ({soles(pagado)}): el titular no se cambia. Para otro huésped, cancela y crea una reserva nueva.</p>
          </>
        ) : (
          <Select value={idCliente || ""} onChange={(e) => setIdCliente(Number(e.target.value))}>
            {clientes.length === 0 && <option value={reserva.cliente.idCliente}>{reserva.cliente.nombres} {reserva.cliente.apellidos}</option>}
            {clientes.map((c) => (
              <option key={c.idCliente} value={c.idCliente}>
                {c.nombres} {c.apellidos} ({c.numeroDocumento ? `${c.tipoDocumento} ${c.numeroDocumento}` : "sin documento"})
              </option>
            ))}
          </Select>
        )}
      </FormField>

      <div className="grid grid-cols-2 gap-3">
        <FormField label="Llegada" required>
          <Input type="date" value={checkin} onChange={(e) => setCheckin(e.target.value)} />
        </FormField>
        <FormField label="Salida" required>
          <Input type="date" value={checkout} min={checkin || undefined} onChange={(e) => setCheckout(e.target.value)} />
        </FormField>
      </div>

      <FormField label="Habitación" required>
        <Select value={idHabitacion || ""} onChange={(e) => setIdHabitacion(Number(e.target.value))}>
          {habitaciones.map((h) => {
            const ocupada = disp.ocupadas.get(h.idHabitacion);
            return (
              <option key={h.idHabitacion} value={h.idHabitacion} disabled={!!ocupada && h.idHabitacion !== idHabitacion}>
                Hab. {h.numero} — {h.tipo} (S/ {h.precioNoche}/noche){ocupada ? " · ocupada esas noches" : ""}{incidencias.has(h.idHabitacion) ? " ⚠ incidencia" : ""}
              </option>
            );
          })}
        </Select>
        {disp.cargando && <p className="text-[12px] text-slate-500 mt-1">Revisando disponibilidad…</p>}
        {disp.error && <p className="text-[12px] text-amber-700 mt-1">{disp.error}</p>}
        <AvisoIncidencia inc={incidencias.get(idHabitacion)} className="mt-1.5" />
      </FormField>

      <FormField label="Observaciones">
        <Input type="text" value={observaciones} placeholder="Notas adicionales (opcional)" onChange={(e) => setObservaciones(e.target.value)} />
      </FormField>

      {problema && checkin && checkout && <AlertBanner type="warning" message={problema} dismissible={false} />}

      <div className="bg-slate-50 rounded-lg p-3 space-y-1 text-xs">
        <div className="flex justify-between"><span className="text-slate-500">Noches</span><span>{n > 0 ? n : "—"}</span></div>
        <div className="flex justify-between"><span className="text-slate-500">Total actual</span><span>{soles(totalAntes)}</span></div>
        <div className="flex justify-between font-bold text-slate-800">
          <span>Nuevo total</span>
          <span>{n > 0 ? soles(nuevoTotal) : "—"}</span>
        </div>
        {!cambiaPrecio && <p className="text-[12px] text-slate-500">Sin cambio de habitación ni fechas se respeta el precio pactado.</p>}
        {pagado > 0 && n > 0 && nuevoTotal < pagado && (
          <p className="text-[12px] text-amber-700">Lo pagado ({soles(pagado)}) supera el nuevo total: quedará saldo a favor del huésped, que se devuelve al hacer el check-out.</p>
        )}
      </div>
    </FormModal>
  );
}
