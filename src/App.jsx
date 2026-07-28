import React, { useState, useEffect } from "react";
import { supabase } from "./lib/supabaseClient";
import {
  Plane, BedDouble, Bus, Ticket, MapPin, ExternalLink, WifiOff, Check,
  ChevronRight, Plus, Users, Copy, LogOut, ArrowLeft, X, Compass, Loader2,
  Paperclip, FileText, Image as ImageIcon, AlertCircle, Trash2,
} from "lucide-react";

const C = {
  platinum: "#E2E2DC", bg: "#F6F5F1", silverSand: "#BDC6C7", wheat: "#E6CEA1",
  lightBeige: "#CCA770", copper: "#AF7A38", ink: "#2B3B3C", inkSoft: "#5C6664", card: "#FFFFFF",
};

const TYPE_STYLES = {
  flight: { icon: Plane, label: "Vuelo", accent: "#AF7A38" },
  hotel: { icon: BedDouble, label: "Alojamiento", accent: "#8A6B3E" },
  transport: { icon: Bus, label: "Transporte", accent: "#5F7679" },
  activity: { icon: Ticket, label: "Actividad", accent: "#9C7A2E" },
};

const genCode = () => Math.random().toString(36).slice(2, 8).toUpperCase();

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

function PromptModal({ open, title, label, initialValue = "", placeholder, confirmLabel = "Crear", onCancel, onConfirm }) {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    if (open) setValue(initialValue);
  }, [open, initialValue]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-6" style={{ background: "rgba(43,59,60,0.45)" }}>
      <div className="w-full max-w-sm rounded-2xl overflow-hidden shadow-[0_16px_40px_rgba(43,59,60,0.25)]" style={{ background: C.card }}>
        <div className="px-6 pt-6 pb-5">
          <h3 className="text-[17px] font-semibold mb-4" style={{ color: C.ink }}>{title}</h3>
          <label className="block text-[10px] uppercase tracking-widest mb-1.5" style={{ color: C.inkSoft }}>{label}</label>
          <input
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            onKeyDown={(e) => { if (e.key === "Enter" && value.trim()) onConfirm(value.trim()); }}
            className="w-full text-[16px] pb-2 outline-none bg-transparent"
            style={{ color: C.ink, borderBottom: `2px solid ${C.platinum}` }}
          />
        </div>
        <div className="flex items-center justify-end gap-2 px-6 py-3" style={{ borderTop: `2px dashed ${C.platinum}`, background: C.bg }}>
          <button onClick={onCancel} className="text-[13px] font-semibold px-4 py-2 rounded-full" style={{ color: C.inkSoft }}>
            Cancelar
          </button>
          <button
            onClick={() => value.trim() && onConfirm(value.trim())}
            disabled={!value.trim()}
            className="text-[13px] font-semibold text-white px-4 py-2 rounded-full disabled:opacity-40"
            style={{ background: C.copper }}
          >
            {confirmLabel}
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
      <div className="flex items-center gap-2 mb-8">
        <Compass size={22} color={C.copper} />
        <span className="text-[11px] font-semibold tracking-[0.3em] uppercase" style={{ color: C.inkSoft }}>
          Itinerario
        </span>
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
  const [joinCode, setJoinCode] = useState("");
  const [showJoin, setShowJoin] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [toast, setToast] = useState(null);
  const [tripToDelete, setTripToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const notify = (message, type = "error") => setToast({ message, type });

  const loadTrips = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("trip_members")
      .select("trip_id, trips(id, name, owner_name, date_range)")
      .eq("user_id", user.id);
    if (!error) setTrips((data || []).map((r) => r.trips).filter(Boolean));
    setLoading(false);
  };

  useEffect(() => { loadTrips(); }, []);

  const confirmCreateTrip = async (name) => {
    setShowCreate(false);
    const id = genCode();
    const { error } = await supabase.from("trips").insert({
      id, name, owner_id: user.id,
      owner_name: user.user_metadata?.display_name || user.email,
      date_range: "",
    });
    if (error) { notify(error.message); return; }
    await supabase.from("trip_days").insert({ trip_id: id, day_number: 1, date_label: "Día 1", city: "Sin definir" });
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
      <header className="px-5 pt-6 pb-5 flex items-center justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] mb-0.5" style={{ color: C.inkSoft }}>
            Hola, {user.user_metadata?.display_name || user.email}
          </div>
          <h1 className="text-[26px]" style={{ fontFamily: "Georgia, serif", color: C.ink }}>Tus viajes</h1>
        </div>
        <button onClick={() => supabase.auth.signOut()} style={{ color: C.inkSoft }}><LogOut size={18} /></button>
      </header>

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
              className="px-3 self-stretch flex items-center"
              style={{ color: C.inkSoft, borderLeft: `1px solid ${C.platinum}` }}
              aria-label="Eliminar viaje"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}

        <div className="flex gap-2 mt-2">
          <button onClick={() => setShowCreate(true)} className="flex-1 flex items-center justify-center gap-1.5 text-[13px] font-semibold text-white py-3 rounded-xl" style={{ background: C.copper }}>
            <Plus size={15} /> Nuevo viaje
          </button>
          <button onClick={() => setShowJoin((v) => !v)} className="flex-1 flex items-center justify-center gap-1.5 text-[13px] font-semibold py-3 rounded-xl" style={{ background: C.wheat, color: C.ink }}>
            <Users size={15} /> Unirme con código
          </button>
        </div>

        {showJoin && (
          <div className="rounded-xl p-4 flex gap-2 items-center" style={{ background: C.card, border: `1px solid ${C.platinum}` }}>
            <input value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="Código (ej: QK7F3D)" className="flex-1 text-[14px] font-mono outline-none bg-transparent" style={{ color: C.ink }} />
            <button onClick={joinTrip} className="text-[12px] font-semibold px-3 py-2 rounded-lg text-white" style={{ background: C.lightBeige }}>Unirme</button>
          </div>
        )}
      </main>

      <PromptModal
        open={showCreate}
        title="Nuevo viaje"
        label="Nombre del viaje"
        initialValue=""
        placeholder="Ej: Verano en Madrid"
        confirmLabel="Crear viaje"
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
  const [showAdd, setShowAdd] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data: t } = await supabase.from("trips").select("*").eq("id", tripId).single();
    const { data: d } = await supabase
      .from("trip_days")
      .select("*, trip_items(*)")
      .eq("trip_id", tripId)
      .order("day_number");
    setTrip(t);
    setDays(d || []);
    if (d?.length && !selectedDay) setSelectedDay(d[0].day_number);
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
        </div>
        <h1 className="text-[24px]" style={{ fontFamily: "Georgia, serif", color: C.ink }}>{trip.name}</h1>
        <p className="text-[12px] mt-0.5" style={{ color: C.inkSoft }}>de {trip.owner_name}</p>

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
        <button onClick={() => setShowAdd(true)} className="mt-4 w-full flex items-center justify-center gap-1.5 text-[13px] font-semibold py-3 rounded-xl" style={{ background: C.wheat, color: C.ink }}>
          <Plus size={15} /> Agregar reserva
        </button>
        <div className="mt-4 flex items-center gap-2 text-[11px]" style={{ color: C.inkSoft }}>
          <Check size={13} /> Sincronizado con Supabase.
        </div>
      </main>
    </div>
  );
}

/* ---------- AddItem ---------- */

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
  const [meta1Label, setMeta1Label] = useState("");
  const [meta1Value, setMeta1Value] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

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

    const meta = [];
    if (meta1Label && meta1Value) meta.push({ label: meta1Label, value: meta1Value });

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
        <div className="flex gap-2">
          <Field label="Detalle (etiqueta)" value={meta1Label} onChange={setMeta1Label} placeholder="Check-in" />
          <Field label="Valor" value={meta1Value} onChange={setMeta1Value} placeholder="15:00" />
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

export default function App() {
  const [session, setSession] = useState(undefined);
  const [tripId, setTripId] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (session === undefined) {
    return <div className="min-h-screen flex items-center justify-center" style={{ background: C.bg }}><Loader2 className="animate-spin" color={C.copper} /></div>;
  }
  if (!session) return <AuthScreen />;

  if (tripId) return <TripView tripId={tripId} onBack={() => setTripId(null)} />;
  return <TripsHome user={session.user} onOpenTrip={setTripId} />;
}
