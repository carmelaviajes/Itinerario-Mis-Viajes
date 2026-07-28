import React, { useState, useEffect } from "react";
import { supabase } from "./lib/supabaseClient";
import {
  Plane, BedDouble, Bus, Ticket, MapPin, ExternalLink, WifiOff, Check,
  ChevronRight, Plus, Users, Copy, LogOut, ArrowLeft, X, Compass, Loader2,
  Paperclip, FileText, Image as ImageIcon, AlertCircle, Trash2,
} from "lucide-react";

/* Paleta de marca "itinerario · mis viajes":
   navy #0A2C47, teal #1A657B, sage #B5D7C5, cream #F5EDDE, white #FFFFFF.
   Se mantienen los mismos nombres de token para no tocar los ~100 usos en
   el resto del archivo; lo que cambia es a qué color de marca apunta cada uno. */
const C = {
  bg: "#F5EDDE",          // cream — fondo de pantalla
  card: "#FFFFFF",        // white — superficies (cards, modales)
  platinum: "#B5D7C5",    // sage — bordes y divisores punteados
  wheat: "#E4EFE9",       // tint claro de sage — fondos secundarios (banner, botón "Unirme")
  lightBeige: "#1A657B",  // teal — íconos y acentos secundarios
  copper: "#0A2C47",      // navy — acción principal (botones, día seleccionado)
  ink: "#0A2C47",         // navy — texto principal
  inkSoft: "#1A657B",     // teal — texto secundario / labels
};

const FONT_SCRIPT = "'Mr Leopolde', 'Georgia', serif";

const TYPE_STYLES = {
  flight: { icon: Plane, label: "Vuelo", accent: "#1A657B" },
  hotel: { icon: BedDouble, label: "Alojamiento", accent: "#0A2C47" },
  transport: { icon: Bus, label: "Transporte", accent: "#6B9C8F" },
  activity: { icon: Ticket, label: "Actividad", accent: "#B99B6B" },
};

const genCode = () => Math.random().toString(36).slice(2, 8).toUpperCase();

/* ---------- Identidad: fuente y logo ---------- */

function GlobalFonts() {
  return (
    <style>{`
      @font-face {
        font-family: 'Mr Leopolde';
        src: url('/assets/fonts/Mr_Leopolde.ttf') format('truetype');
        font-weight: normal;
        font-style: normal;
        font-display: swap;
      }
    `}</style>
  );
}

/* Isotipo de marca: avión de papel navy con estela curva sage, subiendo en
   diagonal. Un solo componente para no repetir el SVG en cada pantalla.
   background="none" para uso suelto (headers); pasar un color de fondo
   (ej. C.ink) para el ícono cuadrado tipo app icon. */
function LogoMark({ size = 32, background = "none" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      {background !== "none" && <rect width="200" height="200" rx="44" fill={background} />}
      {/* Estela */}
      <path
        d="M 30 150 Q 55 90 130 60"
        fill="none"
        stroke="#B5D7C5"
        strokeWidth="10"
        strokeLinecap="round"
      />
      {/* Avión */}
      <path
        d="M 176 40 L 96 96 L 60 84 L 50 94 L 82 108 L 68 138 L 78 146 L 100 118 L 176 40 Z"
        fill="#0A2C47"
      />
    </svg>
  );
}

/* Lockup horizontal de marca: isotipo + "itinerario" en script + "MIS VIAJES"
   en versalitas separadas por puntos, tal cual el manual de marca. */
function BrandLockup({ iconSize = 34, scriptSize = 32 }) {
  return (
    <div className="flex items-center gap-3">
      <LogoMark size={iconSize} />
      <div className="h-10 border-l" style={{ borderColor: C.platinum, borderStyle: "dotted", borderLeftWidth: 2 }} />
      <div className="flex flex-col">
        <span className="leading-none" style={{ fontFamily: FONT_SCRIPT, fontSize: scriptSize, color: C.ink }}>
          itinerario
        </span>
        <span className="text-[10px] font-semibold tracking-[0.3em] mt-1" style={{ color: C.platinum }}>
          · MIS VIAJES ·
        </span>
      </div>
    </div>
  );
}

/* ---------- Cache offline (solo lectura) ---------- */
/* Guardamos la última respuesta buena de Supabase en localStorage. Si el
   fetch siguiente falla (sin conexión), mostramos esa última copia y
   avisamos con un banner. No hay escritura offline: crear/editar/unirse
   sigue necesitando conexión. */
const OFFLINE_PREFIX = "itinerario:cache:";
const readCache = (key) => {
  try {
    const raw = localStorage.getItem(OFFLINE_PREFIX + key);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
};
const writeCache = (key, value) => {
  try { localStorage.setItem(OFFLINE_PREFIX + key, JSON.stringify(value)); } catch { /* storage llena o no disponible */ }
};

function OfflineBanner({ show }) {
  if (!show) return null;
  return (
    <div className="mx-5 mb-3 flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] font-medium"
      style={{ background: C.wheat, color: C.ink }}>
      <WifiOff size={14} /> Sin conexión — mostrando la última versión guardada.
    </div>
  );
}

/* ---------- Componentes compartidos: Toast y Modal ---------- */

function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [toast]);

  if (!toast) return null;

  const isError = toast.type === "error";
  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 max-w-[92%] w-fit">
      <div
        className="flex items-center gap-2 px-4 py-3 rounded-xl shadow-[0_8px_24px_rgba(43,59,60,0.18)]"
        style={{
          background: isError ? "#3A2320" : C.ink,
          color: "#fff",
        }}
      >
        <AlertCircle size={16} color={isError ? "#F2A38C" : C.wheat} />
        <span className="text-[13px] font-medium">{toast.message}</span>
        <button onClick={onClose} className="ml-2 opacity-70"><X size={14} /></button>
      </div>
    </div>
  );
}

function ConfirmModal({ open, title, message, confirmLabel = "Confirmar", danger = false, onCancel, onConfirm }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-6" style={{ background: "rgba(43,59,60,0.45)" }}>
      <div className="w-full max-w-sm rounded-2xl overflow-hidden shadow-[0_16px_40px_rgba(43,59,60,0.25)]" style={{ background: C.card }}>
        <div className="px-6 pt-6 pb-5">
          <h3 className="text-[17px] font-semibold mb-2" style={{ color: C.ink }}>{title}</h3>
          <p className="text-[13px]" style={{ color: C.inkSoft }}>{message}</p>
        </div>
        <div className="flex items-center justify-end gap-2 px-6 py-3" style={{ borderTop: `2px dashed ${C.platinum}`, background: C.bg }}>
          <button onClick={onCancel} className="text-[13px] font-semibold px-4 py-2 rounded-full" style={{ color: C.inkSoft }}>
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="text-[13px] font-semibold text-white px-4 py-2 rounded-full"
            style={{ background: danger ? "#B7391F" : C.copper }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function NewTripModal({ open, onCancel, onConfirm }) {
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [destinations, setDestinations] = useState("");

  useEffect(() => {
    if (open) { setName(""); setStartDate(""); setEndDate(""); setDestinations(""); }
  }, [open]);

  if (!open) return null;

  const canSave = name.trim() && startDate && endDate && destinations.trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-6" style={{ background: "rgba(43,59,60,0.45)" }}>
      <div className="w-full max-w-sm rounded-2xl overflow-hidden shadow-[0_16px_40px_rgba(43,59,60,0.25)] max-h-[85vh] flex flex-col" style={{ background: C.card }}>
        <div className="px-6 pt-6 pb-2 overflow-y-auto flex flex-col gap-4">
          <h3 className="text-[17px] font-semibold" style={{ color: C.ink }}>Nuevo viaje</h3>

          <div>
            <label className="block text-[10px] uppercase tracking-widest mb-1.5" style={{ color: C.inkSoft }}>Nombre del viaje</label>
            <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Verano en Madrid"
              className="w-full text-[15px] pb-2 outline-none bg-transparent" style={{ color: C.ink, borderBottom: `2px solid ${C.platinum}` }} />
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-[10px] uppercase tracking-widest mb-1.5" style={{ color: C.inkSoft }}>Fecha inicio</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                className="w-full text-[14px] pb-2 outline-none bg-transparent" style={{ color: C.ink, borderBottom: `2px solid ${C.platinum}` }} />
            </div>
            <div className="flex-1">
              <label className="block text-[10px] uppercase tracking-widest mb-1.5" style={{ color: C.inkSoft }}>Fecha fin</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                className="w-full text-[14px] pb-2 outline-none bg-transparent" style={{ color: C.ink, borderBottom: `2px solid ${C.platinum}` }} />
            </div>
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-widest mb-1.5" style={{ color: C.inkSoft }}>Destinos (separados por coma)</label>
            <input value={destinations} onChange={(e) => setDestinations(e.target.value)} placeholder="Ej: Madrid, Barcelona, Roma"
              className="w-full text-[14px] pb-2 outline-none bg-transparent" style={{ color: C.ink, borderBottom: `2px solid ${C.platinum}` }} />
            <p className="text-[11px] mt-1.5" style={{ color: C.inkSoft }}>Se van a repartir entre los días del viaje, en el orden en que los escribís.</p>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-6 py-3 mt-2" style={{ borderTop: `2px dashed ${C.platinum}`, background: C.bg }}>
          <button onClick={onCancel} className="text-[13px] font-semibold px-4 py-2 rounded-full" style={{ color: C.inkSoft }}>
            Cancelar
          </button>
          <button
            onClick={() => canSave && onConfirm({
              name: name.trim(),
              startDate,
              endDate,
              destinations: destinations.split(",").map((d) => d.trim()).filter(Boolean),
            })}
            disabled={!canSave}
            className="text-[13px] font-semibold text-white px-4 py-2 rounded-full disabled:opacity-40"
            style={{ background: C.copper }}
          >
            Crear viaje
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- AuthScreen ---------- */

function AuthScreen() {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    setBusy(true);
    setError("");
    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { display_name: displayName || email.split("@")[0] } },
      });
      if (error) setError(error.message);
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
    }
    setBusy(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ background: C.bg }}>
      <div className="mb-8">
        <BrandLockup />
      </div>

      <div className="w-full max-w-sm rounded-2xl overflow-hidden shadow-[0_8px_24px_rgba(43,59,60,0.12)]" style={{ background: C.card, border: `1px solid ${C.platinum}` }}>
        <div className="px-6 pt-6 pb-5 flex flex-col gap-3">
          {mode === "signup" && (
            <div>
              <label className="block text-[10px] uppercase tracking-widest mb-1" style={{ color: C.inkSoft }}>Nombre</label>
              <input value={displayName} onChange={(e) => setDisplayName(e.target.value)}
                className="w-full text-[15px] pb-2 outline-none bg-transparent" style={{ color: C.ink, borderBottom: `2px solid ${C.platinum}` }} />
            </div>
          )}
          <div>
            <label className="block text-[10px] uppercase tracking-widest mb-1" style={{ color: C.inkSoft }}>Email</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email"
              className="w-full text-[15px] pb-2 outline-none bg-transparent" style={{ color: C.ink, borderBottom: `2px solid ${C.platinum}` }} />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-widest mb-1" style={{ color: C.inkSoft }}>Contraseña</label>
            <input value={password} onChange={(e) => setPassword(e.target.value)} type="password"
              className="w-full text-[15px] pb-2 outline-none bg-transparent" style={{ color: C.ink, borderBottom: `2px solid ${C.platinum}` }} />
          </div>
          {error && <p className="text-[12px]" style={{ color: "#B7391F" }}>{error}</p>}
        </div>
        <div className="flex items-center justify-between px-6 py-3" style={{ borderTop: `2px dashed ${C.platinum}`, background: C.bg }}>
          <button onClick={() => setMode(mode === "login" ? "signup" : "login")} className="text-[11px]" style={{ color: C.inkSoft }}>
            {mode === "login" ? "Crear cuenta" : "Ya tengo cuenta"}
          </button>
          <button onClick={submit} disabled={busy || !email || !password}
            className="flex items-center gap-1.5 text-[13px] font-semibold text-white px-4 py-2 rounded-full disabled:opacity-50"
            style={{ background: C.copper }}>
            {busy && <Loader2 size={14} className="animate-spin" />}
            {mode === "login" ? "Entrar" : "Registrarme"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- TripsHome ---------- */

function TripsHome({ user, onOpenTrip }) {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [showJoin, setShowJoin] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [toast, setToast] = useState(null);
  const [tripToDelete, setTripToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const notify = (message, type = "error") => setToast({ message, type });
  const cacheKey = `trips:${user.id}`;

  const loadTrips = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("trip_members")
        .select("trip_id, trips(id, name, owner_name, date_range)")
        .eq("user_id", user.id);
      if (error) throw error;
      const list = (data || []).map((r) => r.trips).filter(Boolean);
      setTrips(list);
      setOffline(false);
      writeCache(cacheKey, list);
    } catch (err) {
      const cached = readCache(cacheKey);
      if (cached) {
        setTrips(cached);
        setOffline(true);
      } else {
        notify("No pudimos cargar tus viajes y todavía no hay una copia guardada para ver sin conexión.");
      }
    }
    setLoading(false);
  };

  useEffect(() => { loadTrips(); }, []);

  const fmtDate = (d) => d.toLocaleDateString("es-AR", { day: "numeric", month: "short" });

  const confirmCreateTrip = async ({ name, startDate, endDate, destinations }) => {
    setShowCreate(false);
    const id = genCode();

    const start = new Date(startDate + "T00:00:00");
    const end = new Date(endDate + "T00:00:00");
    let numDays = Math.round((end - start) / 86400000) + 1;
    if (!(numDays > 0)) numDays = 1;

    const dests = destinations.length ? destinations : ["Sin definir"];
    const groupSize = Math.ceil(numDays / dests.length);

    const dayRows = Array.from({ length: numDays }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      const city = dests[Math.min(dests.length - 1, Math.floor(i / groupSize))];
      return { trip_id: id, day_number: i + 1, date_label: fmtDate(d), city };
    });

    const dateRange = numDays === 1 ? fmtDate(start) : `${fmtDate(start)} → ${fmtDate(end)}`;

    const { error } = await supabase.from("trips").insert({
      id, name, owner_id: user.id,
      owner_name: user.user_metadata?.display_name || user.email,
      date_range: dateRange,
    });
    if (error) { notify(error.message); return; }
    await supabase.from("trip_days").insert(dayRows);
    await loadTrips();
    onOpenTrip(id);
  };

  const deleteTrip = async () => {
    if (!tripToDelete) return;
    setDeleting(true);
    const id = tripToDelete.id;
    const { data: dayRows } = await supabase.from("trip_days").select("id").eq("trip_id", id);
    const dayIds = (dayRows || []).map((d) => d.id);
    if (dayIds.length) await supabase.from("trip_items").delete().in("day_id", dayIds);
    await supabase.from("trip_days").delete().eq("trip_id", id);
    await supabase.from("trip_members").delete().eq("trip_id", id);
    const { error } = await supabase.from("trips").delete().eq("id", id);
    setDeleting(false);
    setTripToDelete(null);
    if (error) { notify(error.message); return; }
    await loadTrips();
    notify("Viaje eliminado.", "success");
  };

  const joinTrip = async () => {
    const code = joinCode.trim().toUpperCase();
    if (!code) return;
    const { data: trip } = await supabase.from("trips").select("id").eq("id", code).single();
    if (!trip) { notify("No encontramos un viaje con ese código."); return; }
    const { error } = await supabase.from("trip_members").insert({ trip_id: code, user_id: user.id });
    if (error && !error.message.includes("duplicate")) { notify(error.message); return; }
    setJoinCode("");
    setShowJoin(false);
    await loadTrips();
  };

  return (
    <div className="min-h-screen" style={{ background: C.bg }}>
      <header className="px-5 pt-6 pb-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <LogoMark size={22} />
            <span className="text-[10px] uppercase tracking-[0.2em]" style={{ color: C.inkSoft }}>
              Hola, {user.user_metadata?.display_name || user.email}
            </span>
          </div>
          <button onClick={() => supabase.auth.signOut()} style={{ color: C.inkSoft }}><LogOut size={18} /></button>
        </div>
        <h1 className="text-[46px] leading-none" style={{ fontFamily: FONT_SCRIPT, color: C.ink }}>Mis viajes</h1>
      </header>

      <OfflineBanner show={offline} />

      <main className="px-5 flex flex-col gap-3">
        {loading && <div className="flex items-center gap-2 text-[13px]" style={{ color: C.inkSoft }}><Loader2 size={14} className="animate-spin" /> Cargando...</div>}
        {!loading && trips.length === 0 && (
          <div className="rounded-xl p-5 text-[13px]" style={{ background: C.card, color: C.inkSoft, border: `1px solid ${C.platinum}` }}>
            Todavía no tenés viajes. Creá uno nuevo o unite con un código.
          </div>
        )}
        {trips.map((t) => (
          <div key={t.id} className="rounded-xl flex items-center" style={{ background: C.card, border: `1px solid ${C.platinum}` }}>
            <button onClick={() => onOpenTrip(t.id)} className="flex-1 text-left p-4 flex items-center justify-between">
              <div>
                <h3 className="text-[16px] font-semibold" style={{ color: C.ink }}>{t.name}</h3>
                <p className="text-[12px]" style={{ color: C.inkSoft }}>{t.date_range || "Sin fechas"} · de {t.owner_name}</p>
              </div>
              <ChevronRight size={18} style={{ color: C.lightBeige }} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setTripToDelete(t); }}
              disabled={offline}
              className="px-3 self-stretch flex items-center disabled:opacity-30"
              style={{ color: C.inkSoft, borderLeft: `1px solid ${C.platinum}` }}
              aria-label="Eliminar viaje"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}

        <div className="flex gap-2 mt-2">
          <button onClick={() => setShowCreate(true)} disabled={offline} className="flex-1 flex items-center justify-center gap-1.5 text-[13px] font-semibold text-white py-3 rounded-xl disabled:opacity-40" style={{ background: C.copper }}>
            <Plus size={15} /> Nuevo viaje
          </button>
          <button onClick={() => setShowJoin((v) => !v)} disabled={offline} className="flex-1 flex items-center justify-center gap-1.5 text-[13px] font-semibold py-3 rounded-xl disabled:opacity-40" style={{ background: C.wheat, color: C.ink }}>
            <Users size={15} /> Unirme con código
          </button>
        </div>

        {offline && (
          <p className="text-[11px] text-center" style={{ color: C.inkSoft }}>
            Crear viajes, unirte con código y eliminar necesitan conexión.
          </p>
        )}

        {showJoin && (
          <div className="rounded-xl p-4 flex gap-2 items-center" style={{ background: C.card, border: `1px solid ${C.platinum}` }}>
            <input value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="Código (ej: QK7F3D)" className="flex-1 text-[14px] font-mono outline-none bg-transparent" style={{ color: C.ink }} />
            <button onClick={joinTrip} className="text-[12px] font-semibold px-3 py-2 rounded-lg text-white" style={{ background: C.lightBeige }}>Unirme</button>
          </div>
        )}
      </main>

      <NewTripModal
        open={showCreate}
        onCancel={() => setShowCreate(false)}
        onConfirm={confirmCreateTrip}
      />
      <ConfirmModal
        open={!!tripToDelete}
        title="Eliminar viaje"
        message={tripToDelete ? `¿Seguro que querés eliminar "${tripToDelete.name}"? Se van a borrar todos sus días y reservas. Esta acción no se puede deshacer.` : ""}
        confirmLabel={deleting ? "Eliminando..." : "Eliminar"}
        danger
        onCancel={() => setTripToDelete(null)}
        onConfirm={deleteTrip}
      />
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}

/* ---------- TicketCard ---------- */

function TicketCard({ item }) {
  const style = TYPE_STYLES[item.type];
  const Icon = style.icon;
  const mapsHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.maps_query || "")}`;

  return (
    <div className="relative flex rounded-lg overflow-hidden" style={{ background: C.card, border: `1px solid ${C.platinum}` }}>
      <div className="flex-1 p-4">
        <div className="flex items-center gap-2 mb-2">
          <Icon size={16} color={style.accent} />
          <span className="text-[11px] font-semibold uppercase" style={{ color: style.accent }}>{style.label}</span>
          <span className="text-[11px] ml-auto" style={{ color: C.inkSoft }}>{item.source}</span>
        </div>
        <h3 className="font-bold text-[15px] mb-2.5" style={{ color: C.ink }}>{item.title}</h3>
        {item.meta?.length > 0 && (
          <div className="flex flex-wrap gap-x-4 gap-y-1 mb-3">
            {item.meta.map((m, i) => (
              <div key={i}>
                <div className="text-[9px] uppercase" style={{ color: C.inkSoft }}>{m.label}</div>
                <div className="text-[13px] font-mono" style={{ color: C.ink }}>{m.value}</div>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-2 flex-wrap">
          {item.maps_query && (
            <a href={mapsHref} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-md" style={{ color: C.ink, background: C.platinum }}>
              <MapPin size={12} /> Cómo llegar
            </a>
          )}
          {item.attachment_url && (
            <a href={item.attachment_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-md" style={{ color: "#fff", background: C.lightBeige }}>
              <Paperclip size={12} /> Comprobante
            </a>
          )}
        </div>
      </div>
      <div className="w-[44px] flex items-center justify-center" style={{ background: C.platinum }}>
        <div className="text-[9px] font-mono font-bold tracking-widest" style={{ writingMode: "vertical-rl", color: C.ink }}>{item.code}</div>
      </div>
    </div>
  );
}

/* ---------- TripView ---------- */

function TripView({ tripId, onBack }) {
  const [trip, setTrip] = useState(null);
  const [days, setDays] = useState([]);
  const [selectedDay, setSelectedDay] = useState(null);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [copied, setCopied] = useState(false);

  const cacheKey = `trip:${tripId}`;

  const load = async () => {
    setLoading(true);
    try {
      const { data: t, error: tErr } = await supabase.from("trips").select("*").eq("id", tripId).single();
      if (tErr) throw tErr;
      const { data: d, error: dErr } = await supabase
        .from("trip_days")
        .select("*, trip_items(*)")
        .eq("trip_id", tripId)
        .order("day_number");
      if (dErr) throw dErr;
      setTrip(t);
      setDays(d || []);
      setOffline(false);
      if (d?.length && !selectedDay) setSelectedDay(d[0].day_number);
      writeCache(cacheKey, { trip: t, days: d || [] });
    } catch (err) {
      const cached = readCache(cacheKey);
      if (cached) {
        setTrip(cached.trip);
        setDays(cached.days);
        setOffline(true);
        if (cached.days?.length && !selectedDay) setSelectedDay(cached.days[0].day_number);
      }
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [tripId]);

  if (loading || !trip) {
    return <div className="min-h-screen flex items-center justify-center" style={{ background: C.bg }}><Loader2 className="animate-spin" color={C.copper} /></div>;
  }

  const dayData = days.find((d) => d.day_number === selectedDay) || days[0];
  const copyCode = () => { navigator.clipboard.writeText(trip.id); setCopied(true); setTimeout(() => setCopied(false), 1500); };

  const destinations = [...new Set(days.map((d) => d.city).filter((c) => c && c !== "Sin definir"))];
  const dateStart = days[0]?.date_label;
  const dateEnd = days[days.length - 1]?.date_label;
  const dateRangeLabel = dateStart && dateEnd
    ? (dateStart === dateEnd ? dateStart : `${dateStart} → ${dateEnd}`)
    : null;

  if (showAdd) {
    return <AddItem trip={trip} days={days} initialDay={selectedDay} onCancel={() => setShowAdd(false)} onSaved={async () => { setShowAdd(false); await load(); }} />;
  }

  return (
    <div className="min-h-screen" style={{ background: C.bg }}>
      <header className="px-5 pt-6 pb-4" style={{ borderBottom: `1px solid ${C.platinum}` }}>
        <div className="flex items-center justify-between mb-2">
          <button onClick={onBack} style={{ color: C.inkSoft }}><ArrowLeft size={18} /></button>
          <LogoMark size={20} />
        </div>
        <h1 className="text-[36px] leading-none" style={{ fontFamily: FONT_SCRIPT, color: C.ink }}>{trip.name}</h1>
        <p className="text-[12px] mt-1.5" style={{ color: C.inkSoft }}>de {trip.owner_name}</p>

        {(destinations.length > 0 || dateRangeLabel) && (
          <div className="mt-3 flex flex-col gap-1.5 rounded-xl p-3" style={{ background: C.card, border: `1px solid ${C.platinum}` }}>
            {destinations.length > 0 && (
              <div className="flex items-start gap-2">
                <MapPin size={14} color={C.copper} className="mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-[9px] uppercase tracking-widest" style={{ color: C.inkSoft }}>Destinos</div>
                  <div className="text-[13px] font-semibold" style={{ color: C.ink }}>{destinations.join(" · ")}</div>
                </div>
              </div>
            )}
            {dateRangeLabel && (
              <div className="flex items-start gap-2">
                <Compass size={14} color={C.copper} className="mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-[9px] uppercase tracking-widest" style={{ color: C.inkSoft }}>Fechas</div>
                  <div className="text-[13px] font-semibold font-mono" style={{ color: C.ink }}>{dateRangeLabel}</div>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-end mt-2">
          <button onClick={copyCode} className="flex items-center gap-1 text-[11px] font-mono px-2 py-1 rounded-md" style={{ background: C.platinum, color: C.ink }}>
            <Copy size={11} /> {copied ? "¡Copiado!" : trip.id}
          </button>
        </div>
      </header>

      <OfflineBanner show={offline} />

      <div className="flex gap-2 px-5 py-4 overflow-x-auto" style={{ borderBottom: `1px solid ${C.platinum}` }}>
        {days.map((d) => (
          <button key={d.day_number} onClick={() => setSelectedDay(d.day_number)}
            className="flex-shrink-0 flex flex-col items-center px-3.5 py-2 rounded-xl"
            style={{ background: d.day_number === selectedDay ? C.copper : "transparent", border: `1px solid ${d.day_number === selectedDay ? C.copper : C.platinum}`, color: d.day_number === selectedDay ? "#fff" : C.inkSoft }}>
            <span className="text-[9px] uppercase">Día {d.day_number}</span>
            <span className="text-[13px] font-bold font-mono">{d.date_label}</span>
          </button>
        ))}
      </div>

      <main className="px-5 py-5">
        {dayData && (
          <>
            <div className="flex items-center gap-2 mb-4">
              <ChevronRight size={16} color={C.copper} />
              <h2 className="text-[15px] font-bold" style={{ color: C.ink }}>{dayData.city}</h2>
            </div>
            <div className="flex flex-col gap-3">
              {(dayData.trip_items || []).map((item) => <TicketCard key={item.id} item={item} />)}
              {(dayData.trip_items || []).length === 0 && <p className="text-[13px]" style={{ color: C.inkSoft }}>Sin reservas todavía.</p>}
            </div>
          </>
        )}
        <button onClick={() => setShowAdd(true)} disabled={offline} className="mt-4 w-full flex items-center justify-center gap-1.5 text-[13px] font-semibold py-3 rounded-xl disabled:opacity-40" style={{ background: C.wheat, color: C.ink }}>
          <Plus size={15} /> Agregar reserva
        </button>
        {offline ? (
          <div className="mt-4 flex items-center gap-2 text-[11px]" style={{ color: C.inkSoft }}>
            <WifiOff size={13} /> Viendo la copia guardada del {trip.name}; agregar reservas necesita conexión.
          </div>
        ) : (
          <div className="mt-4 flex items-center gap-2 text-[11px]" style={{ color: C.inkSoft }}>
            <Check size={13} /> Sincronizado con Supabase.
          </div>
        )}
      </main>
    </div>
  );
}

/* ---------- AddItem ---------- */

/* Campos específicos por tipo de reserva. Cada uno arma su propio arreglo de
   { label, value } que termina en trip_items.meta, así que TicketCard no
   necesita cambios: ya sabe renderizar cualquier lista de meta. */
function useTypeFields(type) {
  const [airline, setAirline] = useState("");
  const [departureTime, setDepartureTime] = useState("");
  const [arrivalTime, setArrivalTime] = useState("");
  const [boardingTime, setBoardingTime] = useState("");
  const [hasConnection, setHasConnection] = useState(false);
  const [connectionDetail, setConnectionDetail] = useState("");
  const [baggageIncluded, setBaggageIncluded] = useState("no_especificado");
  const [checkinDone, setCheckinDone] = useState(false);

  const [checkInDateTime, setCheckInDateTime] = useState("");
  const [checkOutDateTime, setCheckOutDateTime] = useState("");
  const [roomType, setRoomType] = useState("");

  const [operator, setOperator] = useState("");
  const [seat, setSeat] = useState("");

  const [activityTime, setActivityTime] = useState("");
  const [duration, setDuration] = useState("");
  const [meetingPoint, setMeetingPoint] = useState("");

  const buildMeta = () => {
    const meta = [];
    if (type === "flight") {
      if (airline) meta.push({ label: "Aerolínea", value: airline });
      if (departureTime) meta.push({ label: "Salida", value: departureTime });
      if (arrivalTime) meta.push({ label: "Llegada", value: arrivalTime });
      if (boardingTime) meta.push({ label: "Embarque", value: boardingTime });
      meta.push({ label: "Escalas", value: hasConnection ? (connectionDetail || "Sí") : "Directo" });
      if (baggageIncluded !== "no_especificado") {
        meta.push({ label: "Equipaje incluido", value: baggageIncluded === "si" ? "Sí" : "No" });
      }
      meta.push({ label: "Check-in", value: checkinDone ? "Hecho" : "Pendiente" });
    } else if (type === "hotel") {
      if (checkInDateTime) meta.push({ label: "Check-in", value: checkInDateTime });
      if (checkOutDateTime) meta.push({ label: "Check-out", value: checkOutDateTime });
      if (roomType) meta.push({ label: "Habitación", value: roomType });
    } else if (type === "transport") {
      if (operator) meta.push({ label: "Empresa", value: operator });
      if (departureTime) meta.push({ label: "Salida", value: departureTime });
      if (arrivalTime) meta.push({ label: "Llegada", value: arrivalTime });
      if (seat) meta.push({ label: "Asiento", value: seat });
    } else if (type === "activity") {
      if (activityTime) meta.push({ label: "Hora", value: activityTime });
      if (duration) meta.push({ label: "Duración", value: duration });
      if (meetingPoint) meta.push({ label: "Punto de encuentro", value: meetingPoint });
    }
    return meta;
  };

  return {
    fields: {
      airline, setAirline, departureTime, setDepartureTime, arrivalTime, setArrivalTime,
      boardingTime, setBoardingTime, hasConnection, setHasConnection, connectionDetail, setConnectionDetail,
      baggageIncluded, setBaggageIncluded, checkinDone, setCheckinDone,
      checkInDateTime, setCheckInDateTime, checkOutDateTime, setCheckOutDateTime, roomType, setRoomType,
      operator, setOperator, seat, setSeat,
      activityTime, setActivityTime, duration, setDuration, meetingPoint, setMeetingPoint,
    },
    buildMeta,
  };
}

function AddItem({ trip, days, initialDay, onCancel, onSaved }) {
  const [dayMode, setDayMode] = useState("existing");
  const [day, setDay] = useState(initialDay);
  const [newDate, setNewDate] = useState("");
  const [newCity, setNewCity] = useState("");
  const [type, setType] = useState("flight");
  const [source, setSource] = useState("");
  const [title, setTitle] = useState("");
  const [code, setCode] = useState("");
  const [mapsQuery, setMapsQuery] = useState("");
  const [extraLabel, setExtraLabel] = useState("");
  const [extraValue, setExtraValue] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const { fields: f, buildMeta } = useTypeFields(type);

  const notify = (message, type = "error") => setToast({ message, type });

  const canSave = title.trim() && (dayMode === "existing" || (newDate.trim() && newCity.trim()));

  const submit = async () => {
    setSaving(true);
    let dayId;
    if (dayMode === "existing") {
      dayId = days.find((d) => d.day_number === day)?.id;
    } else {
      const nextNum = Math.max(0, ...days.map((d) => d.day_number)) + 1;
      const { data, error } = await supabase.from("trip_days")
        .insert({ trip_id: trip.id, day_number: nextNum, date_label: newDate.trim(), city: newCity.trim() })
        .select().single();
      if (error) { notify(error.message); setSaving(false); return; }
      dayId = data.id;
    }

    let finalAttachmentUrl = attachmentUrl.trim() || null;
    if (file) {
      const path = `${trip.id}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from("vouchers").upload(path, file);
      if (upErr) { notify("No se pudo subir el archivo: " + upErr.message); }
      else {
        const { data: pub } = supabase.storage.from("vouchers").getPublicUrl(path);
        finalAttachmentUrl = pub.publicUrl;
      }
    }

    const meta = buildMeta();
    if (extraLabel && extraValue) meta.push({ label: extraLabel, value: extraValue });

    const { error } = await supabase.from("trip_items").insert({
      day_id: dayId, type, source: source || "Manual", title: title.trim(),
      meta, code: code || genCode(), maps_query: mapsQuery.trim(),
      voucher_label: "Ver reserva", attachment_url: finalAttachmentUrl,
    });
    setSaving(false);
    if (error) { notify(error.message); return; }
    onSaved();
  };

  return (
    <div className="min-h-screen" style={{ background: C.bg }}>
      <header className="px-5 pt-6 pb-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${C.platinum}` }}>
        <h1 className="text-[19px] font-bold" style={{ color: C.ink }}>Nueva reserva</h1>
        <button onClick={onCancel} style={{ color: C.inkSoft }}><X size={20} /></button>
      </header>

      <main className="px-5 py-5 flex flex-col gap-4">
        <div>
          <label className="block text-[10px] uppercase mb-2" style={{ color: C.inkSoft }}>Tipo</label>
          <div className="flex gap-2 flex-wrap">
            {Object.entries(TYPE_STYLES).map(([key, s]) => {
              const Icon = s.icon; const active = type === key;
              return (
                <button key={key} onClick={() => setType(key)} className="flex items-center gap-1.5 text-[12px] font-semibold px-3 py-2 rounded-full"
                  style={{ background: active ? s.accent : C.card, color: active ? "#fff" : C.ink, border: `1px solid ${active ? s.accent : C.platinum}` }}>
                  <Icon size={13} /> {s.label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="block text-[10px] uppercase mb-2" style={{ color: C.inkSoft }}>Día</label>
          <div className="flex gap-2 mb-2">
            <button onClick={() => setDayMode("existing")} className="flex-1 text-[12px] font-semibold py-2 rounded-lg" style={{ background: dayMode === "existing" ? C.copper : C.card, color: dayMode === "existing" ? "#fff" : C.ink, border: `1px solid ${C.platinum}` }}>Día existente</button>
            <button onClick={() => setDayMode("new")} className="flex-1 text-[12px] font-semibold py-2 rounded-lg" style={{ background: dayMode === "new" ? C.copper : C.card, color: dayMode === "new" ? "#fff" : C.ink, border: `1px solid ${C.platinum}` }}>Día nuevo</button>
          </div>
          {dayMode === "existing" ? (
            <select value={day} onChange={(e) => setDay(Number(e.target.value))} className="w-full text-[14px] p-3 rounded-lg outline-none" style={{ background: C.card, border: `1px solid ${C.platinum}`, color: C.ink }}>
              {days.map((d) => <option key={d.day_number} value={d.day_number}>Día {d.day_number} · {d.date_label} · {d.city}</option>)}
            </select>
          ) : (
            <div className="flex gap-2">
              <input value={newDate} onChange={(e) => setNewDate(e.target.value)} placeholder="Fecha" className="flex-1 text-[14px] p-3 rounded-lg outline-none" style={{ background: C.card, border: `1px solid ${C.platinum}`, color: C.ink }} />
              <input value={newCity} onChange={(e) => setNewCity(e.target.value)} placeholder="Ciudad" className="flex-1 text-[14px] p-3 rounded-lg outline-none" style={{ background: C.card, border: `1px solid ${C.platinum}`, color: C.ink }} />
            </div>
          )}
        </div>

        <Field label="Título" value={title} onChange={setTitle} placeholder="Ej: Vuelo AR1130 a Madrid" />
        <Field label="Fuente" value={source} onChange={setSource} placeholder="Booking, Despegar, Airbnb..." />

        {type === "flight" && (
          <div className="flex flex-col gap-3 p-3 rounded-lg" style={{ background: C.card, border: `1px solid ${C.platinum}` }}>
            <Field label="Aerolínea" value={f.airline} onChange={f.setAirline} placeholder="Aerolíneas Argentinas" />
            <div className="flex gap-2">
              <Field label="Hora de salida" value={f.departureTime} onChange={f.setDepartureTime} placeholder="23:40" />
              <Field label="Hora de llegada" value={f.arrivalTime} onChange={f.setArrivalTime} placeholder="14:10" />
            </div>
            <Field label="Hora de embarque" value={f.boardingTime} onChange={f.setBoardingTime} placeholder="23:00" />
            <Toggle label="Tiene escala/conexión" checked={f.hasConnection} onChange={f.setHasConnection} />
            {f.hasConnection && (
              <Field label="Detalle de la escala" value={f.connectionDetail} onChange={f.setConnectionDetail} placeholder="Bogotá, 2h de espera" />
            )}
            <SelectField
              label="¿Incluye valijas?"
              value={f.baggageIncluded}
              onChange={f.setBaggageIncluded}
              options={[
                { value: "no_especificado", label: "No especificado" },
                { value: "si", label: "Sí" },
                { value: "no", label: "No" },
              ]}
            />
            <Toggle label="Check-in ya hecho" checked={f.checkinDone} onChange={f.setCheckinDone} />
          </div>
        )}

        {type === "hotel" && (
          <div className="flex flex-col gap-3 p-3 rounded-lg" style={{ background: C.card, border: `1px solid ${C.platinum}` }}>
            <div className="flex gap-2">
              <Field label="Check-in" value={f.checkInDateTime} onChange={f.setCheckInDateTime} placeholder="15:00" />
              <Field label="Check-out" value={f.checkOutDateTime} onChange={f.setCheckOutDateTime} placeholder="11:00" />
            </div>
            <Field label="Tipo de habitación (opcional)" value={f.roomType} onChange={f.setRoomType} placeholder="Doble con balcón" />
          </div>
        )}

        {type === "transport" && (
          <div className="flex flex-col gap-3 p-3 rounded-lg" style={{ background: C.card, border: `1px solid ${C.platinum}` }}>
            <Field label="Empresa / línea" value={f.operator} onChange={f.setOperator} placeholder="Flixbus, Renfe..." />
            <div className="flex gap-2">
              <Field label="Hora de salida" value={f.departureTime} onChange={f.setDepartureTime} placeholder="09:00" />
              <Field label="Hora de llegada" value={f.arrivalTime} onChange={f.setArrivalTime} placeholder="12:30" />
            </div>
            <Field label="Asiento (opcional)" value={f.seat} onChange={f.setSeat} placeholder="14A" />
          </div>
        )}

        {type === "activity" && (
          <div className="flex flex-col gap-3 p-3 rounded-lg" style={{ background: C.card, border: `1px solid ${C.platinum}` }}>
            <div className="flex gap-2">
              <Field label="Hora" value={f.activityTime} onChange={f.setActivityTime} placeholder="10:00" />
              <Field label="Duración (opcional)" value={f.duration} onChange={f.setDuration} placeholder="2h" />
            </div>
            <Field label="Punto de encuentro (opcional)" value={f.meetingPoint} onChange={f.setMeetingPoint} placeholder="Entrada principal" />
          </div>
        )}

        <div className="flex gap-2">
          <Field label="Otro detalle (opcional)" value={extraLabel} onChange={setExtraLabel} placeholder="Etiqueta" />
          <Field label="Valor" value={extraValue} onChange={setExtraValue} placeholder="Valor" />
        </div>
        <Field label="Código de reserva" value={code} onChange={setCode} placeholder="Se genera solo si lo dejás vacío" />
        <Field label="Dirección para Maps" value={mapsQuery} onChange={setMapsQuery} placeholder="Hotel Atlántico Madrid, Gran Vía 38" />
        <Field label="Link a comprobante (opcional)" value={attachmentUrl} onChange={setAttachmentUrl} placeholder="https://drive.google.com/..." />

        <div>
          <label className="flex items-center gap-1.5 text-[12px] font-semibold px-3 py-2 rounded-lg cursor-pointer w-fit" style={{ background: C.card, border: `1px solid ${C.platinum}`, color: C.ink }}>
            <Paperclip size={13} /> {file ? file.name : "O subir archivo (foto/PDF)"}
            <input type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </label>
        </div>

        <button onClick={submit} disabled={!canSave || saving} className="mt-2 w-full flex items-center justify-center gap-1.5 text-[14px] font-semibold text-white py-3.5 rounded-xl disabled:opacity-40" style={{ background: C.copper }}>
          {saving ? <Loader2 size={15} className="animate-spin" /> : "Guardar reserva"}
        </button>
      </main>
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}

function Field({ label, value, onChange, placeholder }) {
  return (
    <div className="flex-1">
      <label className="block text-[10px] uppercase mb-1" style={{ color: C.inkSoft }}>{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full text-[14px] p-3 rounded-lg outline-none" style={{ background: C.card, border: `1px solid ${C.platinum}`, color: C.ink }} />
    </div>
  );
}

function Toggle({ label, checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center justify-between text-[13px] font-medium py-1"
      style={{ color: C.ink }}
    >
      {label}
      <span
        className="relative inline-flex items-center rounded-full transition-colors"
        style={{ width: 38, height: 22, background: checked ? C.copper : C.platinum }}
      >
        <span
          className="absolute rounded-full bg-white transition-transform"
          style={{ width: 18, height: 18, left: 2, transform: checked ? "translateX(16px)" : "translateX(0)" }}
        />
      </span>
    </button>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <div className="flex-1">
      <label className="block text-[10px] uppercase mb-1" style={{ color: C.inkSoft }}>{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full text-[14px] p-3 rounded-lg outline-none" style={{ background: C.card, border: `1px solid ${C.platinum}`, color: C.ink }}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState(undefined);
  const [tripId, setTripId] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  let content;
  if (session === undefined) {
    content = <div className="min-h-screen flex items-center justify-center" style={{ background: C.bg }}><Loader2 className="animate-spin" color={C.copper} /></div>;
  } else if (!session) {
    content = <AuthScreen />;
  } else if (tripId) {
    content = <TripView tripId={tripId} onBack={() => setTripId(null)} />;
  } else {
    content = <TripsHome user={session.user} onOpenTrip={setTripId} />;
  }

  return (
    <>
      <GlobalFonts />
      {content}
    </>
  );
}
