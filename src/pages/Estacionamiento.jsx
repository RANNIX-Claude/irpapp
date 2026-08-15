import { useModuleAudit } from "../hooks/useAudit"
import { useState, useEffect } from "react"
import { Car, Plus, Pencil, Trash2, ChevronDown, Search, Users } from "lucide-react"
import LoadingSpinner from "../components/ui/LoadingSpinner"
import { supabase } from "../lib/supabase"
import toast from "react-hot-toast"

function fmt(n, dec = 0) { return "$" + (parseFloat(n) || 0).toLocaleString("es-MX", { minimumFractionDigits: dec, maximumFractionDigits: dec }) }

function hoyLocal() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function addDays(iso, n) {
  const d = new Date(iso + "T12:00:00")
  d.setDate(d.getDate() + n)
  return d.toISOString().split("T")[0]
}

function sabadoDe(iso) {
  const d = new Date(iso + "T12:00:00")
  const dow = d.getDay()
  d.setDate(d.getDate() - (dow === 6 ? 0 : dow + 1))
  return d.toISOString().split("T")[0]
}

function viernesDe(iso) {
  const d = new Date(iso + "T12:00:00")
  const dow = d.getDay()
  const diff = dow === 5 ? 0 : dow === 6 ? -1 : -(dow + 2)
  d.setDate(d.getDate() + diff)
  return d.toISOString().split("T")[0]
}

function labelSemana(ini) {
  const fin = addDays(ini, 6)
  const f = iso => new Date(iso + "T12:00:00").toLocaleDateString("es-MX", { day: "2-digit", month: "short" })
  return f(ini) + " - " + f(fin)
}

const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"]
const DIAS  = ["Domingo","Lunes","Martes","Miercoles","Jueves","Viernes","Sabado"]

// ── Tab: Estacionamiento Diario ───────────────────────────────────────────────
function TabDiario() {
  const today = hoyLocal()
  const [form, setForm]           = useState({ fecha: today, cantidad: "", notas: "" })
  const [editId, setEditId]       = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [registros, setRegistros] = useState([])
  const [loading, setLoading]     = useState(true)
  const [confirmDel, setConfirmDel] = useState(null)
  const [busqueda, setBusqueda]   = useState("")
  const [vista, setVista]         = useState("semanas")
  const [expandKey, setExpandKey] = useState(null)

  const cargar = async () => {
    setLoading(true)
    const { data } = await supabase.from("estacionamiento_diario").select("*").order("fecha", { ascending: false }).limit(500)
    setRegistros(data || [])
    setLoading(false)
  }
  useEffect(() => { cargar() }, [])

  const guardar = async () => {
    if (!form.fecha || !form.cantidad) return toast.error("Fecha y monto son obligatorios")
    setGuardando(true)
    const dt = new Date(form.fecha + "T12:00:00")
    const payload = {
      fecha: form.fecha, cantidad: parseFloat(form.cantidad), notas: form.notas || null,
      anio: dt.getFullYear(), mes: MESES[dt.getMonth()],
      dia_semana: DIAS[dt.getDay()], semana: "S" + Math.ceil(dt.getDate() / 7),
    }
    const { error } = editId
      ? await supabase.from("estacionamiento_diario").update(payload).eq("id", editId)
      : await supabase.from("estacionamiento_diario").upsert(payload, { onConflict: "fecha" })
    if (error) toast.error("Error: " + error.message)
    else { toast.success(editId ? "Actualizado" : "Guardado"); setForm({ fecha: today, cantidad: "", notas: "" }); setEditId(null); cargar() }
    setGuardando(false)
  }

  const iniciarEdicion = r => {
    setForm({ fecha: r.fecha, cantidad: String(r.cantidad), notas: r.notas || "" })
    setEditId(r.id)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const eliminar = async r => {
    const { error } = await supabase.from("estacionamiento_diario").delete().eq("id", r.id)
    if (error) toast.error(error.message)
    else { toast.success("Eliminado"); setConfirmDel(null); cargar() }
  }

  const filtrados = registros.filter(r => {
    if (!busqueda) return true
    const q = busqueda.toLowerCase()
    return (r.fecha || "").includes(q) || (r.notas || "").toLowerCase().includes(q)
  })
  const totalGeneral = filtrados.reduce((a, b) => a + (parseFloat(b.cantidad) || 0), 0)

  const porSemana = {}
  filtrados.forEach(r => {
    const key = viernesDe(r.fecha)
    if (!porSemana[key]) porSemana[key] = { label: labelSemana(key), registros: [], total: 0 }
    porSemana[key].registros.push(r)
    porSemana[key].total += parseFloat(r.cantidad) || 0
  })

  const porMes = {}
  filtrados.forEach(r => {
    const key = (r.fecha || "").slice(0, 7) || "?"
    if (!porMes[key]) porMes[key] = { label: (r.mes || key) + " " + (r.anio || ""), registros: [], total: 0 }
    porMes[key].registros.push(r)
    porMes[key].total += parseFloat(r.cantidad) || 0
  })

  const grupos = vista === "semanas"
    ? Object.entries(porSemana).sort((a, b) => b[0].localeCompare(a[0]))
    : Object.entries(porMes).sort((a, b) => b[0].localeCompare(a[0]))

  const inp = { width: "100%", padding: "10px 12px", border: "1.5px solid #E5E7EB", borderRadius: "8px", fontSize: "14px", boxSizing: "border-box" }

  return (
    <>
      <p style={{ fontSize: "13px", color: "var(--color-text-light)", margin: "0 0 20px" }}>
        {filtrados.length} días registrados · Total: <strong style={{ color: "var(--color-success)" }}>{fmt(totalGeneral)}</strong>
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: "24px", alignItems: "start" }}>
        <div style={{ background: "white", borderRadius: "12px", border: "1.5px solid #E5E7EB", padding: "22px", position: "sticky", top: "80px" }}>
          <h3 style={{ margin: "0 0 18px", fontSize: "15px", fontWeight: 700, display: "flex", alignItems: "center", gap: "8px",
            color: editId ? "var(--color-secondary)" : "var(--color-primary)" }}>
            {editId ? <Pencil size={16} /> : <Plus size={16} />}
            {editId ? "Editar registro" : "Registrar ingreso del dia"}
          </h3>
          <div style={{ marginBottom: "14px" }}>
            <label style={{ fontSize: "12px", fontWeight: 700, color: "var(--color-text-light)", display: "block", marginBottom: "6px" }}>Fecha</label>
            <input type="date" value={form.fecha} onChange={e => setForm(p => ({ ...p, fecha: e.target.value }))} style={inp} />
          </div>
          <div style={{ marginBottom: "14px" }}>
            <label style={{ fontSize: "12px", fontWeight: 700, color: "var(--color-text-light)", display: "block", marginBottom: "6px" }}>Monto ($)</label>
            <input type="number" min="0" step="0.50" value={form.cantidad}
              onChange={e => setForm(p => ({ ...p, cantidad: e.target.value }))} placeholder="0.00"
              style={{ ...inp, fontSize: "22px", fontWeight: 700, textAlign: "right" }} />
          </div>
          <div style={{ marginBottom: "20px" }}>
            <label style={{ fontSize: "12px", fontWeight: 700, color: "var(--color-text-light)", display: "block", marginBottom: "6px" }}>Notas</label>
            <input value={form.notas} onChange={e => setForm(p => ({ ...p, notas: e.target.value }))} placeholder="Ej: festivo, lluvia..." style={inp} />
          </div>
          <button onClick={guardar} disabled={guardando}
            style={{ width: "100%", padding: "12px", background: editId ? "var(--color-secondary)" : "var(--color-primary)", color: "white", border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: 700, cursor: "pointer", opacity: guardando ? 0.7 : 1 }}>
            {guardando ? "Guardando..." : editId ? "Guardar cambios" : "Guardar ingreso"}
          </button>
          {editId && (
            <button onClick={() => { setForm({ fecha: today, cantidad: "", notas: "" }); setEditId(null) }}
              style={{ width: "100%", marginTop: "8px", padding: "10px", background: "white", border: "1.5px solid #E5E7EB", borderRadius: "8px", fontSize: "13px", fontWeight: 600, cursor: "pointer", color: "#6B7280" }}>
              Cancelar edicion
            </button>
          )}
        </div>

        <div>
          <div style={{ display: "flex", gap: "10px", marginBottom: "16px", flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ position: "relative", flex: 1, minWidth: "180px" }}>
              <Search size={14} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#9CA3AF" }} />
              <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar por fecha o nota..."
                style={{ width: "100%", padding: "9px 12px 9px 34px", border: "1.5px solid #E5E7EB", borderRadius: "8px", fontSize: "13px", boxSizing: "border-box" }} />
            </div>
            {["semanas", "meses"].map(v => (
              <button key={v} onClick={() => { setVista(v); setExpandKey(null) }} style={{
                padding: "8px 16px", borderRadius: "8px", fontSize: "13px", fontWeight: 700, cursor: "pointer", border: "1.5px solid",
                borderColor: vista === v ? "var(--color-primary)" : "#E5E7EB",
                background: vista === v ? "var(--color-primary)" : "white",
                color: vista === v ? "white" : "var(--color-text-light)", textTransform: "capitalize",
              }}>{v}</button>
            ))}
          </div>

          {loading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "60px" }}><LoadingSpinner /></div>
          ) : (
            <div style={{ display: "grid", gap: "8px" }}>
              {grupos.map(([key, grupo]) => {
                const open = expandKey === key
                return (
                  <div key={key} style={{ background: "white", borderRadius: "10px", border: "1.5px solid #E5E7EB", overflow: "hidden" }}>
                    <div onClick={() => setExpandKey(open ? null : key)}
                      style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", cursor: "pointer", userSelect: "none" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <ChevronDown size={16} color="var(--color-text-light)" style={{ transform: open ? "rotate(180deg)" : "none", transition: "0.2s" }} />
                        <div>
                          <div style={{ fontSize: "14px", fontWeight: 700 }}>{grupo.label}</div>
                          <div style={{ fontSize: "11px", color: "var(--color-text-light)" }}>{grupo.registros.length} dias</div>
                        </div>
                      </div>
                      <div style={{ fontSize: "20px", fontWeight: 800, color: "var(--color-success)" }}>{fmt(grupo.total)}</div>
                    </div>
                    {open && (
                      <div style={{ borderTop: "1px solid #F3F4F6" }}>
                        {grupo.registros.slice().sort((a, b) => b.fecha.localeCompare(a.fecha)).map(r => (
                          <div key={r.id} style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: "10px", padding: "10px 18px", borderBottom: "1px solid #F9FAFB", alignItems: "center" }}>
                            <div>
                              <span style={{ fontSize: "13px", fontWeight: 600 }}>{r.fecha}</span>
                              <span style={{ fontSize: "12px", color: "var(--color-text-light)", marginLeft: "8px" }}>{r.dia_semana}</span>
                              {r.notas && <div style={{ fontSize: "11px", color: "#9CA3AF" }}>{r.notas}</div>}
                            </div>
                            <div style={{ fontSize: "15px", fontWeight: 800, color: "var(--color-success)", fontFamily: "monospace" }}>{fmt(r.cantidad)}</div>
                            <div style={{ display: "flex", gap: "4px" }}>
                              <button onClick={() => iniciarEdicion(r)} style={{ background: "#F3F4F6", border: "none", borderRadius: "6px", padding: "5px 7px", cursor: "pointer", color: "#374151", display: "flex", alignItems: "center" }}>
                                <Pencil size={13} />
                              </button>
                              <button onClick={() => setConfirmDel(r)} style={{ background: "#FEF2F2", border: "none", borderRadius: "6px", padding: "5px 7px", cursor: "pointer", color: "#B91C1C", display: "flex", alignItems: "center" }}>
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        ))}
                        <div style={{ display: "flex", justifyContent: "flex-end", padding: "10px 18px", background: "#F9FAFB", fontWeight: 800, fontSize: "14px", color: "var(--color-success)" }}>
                          Total: {fmt(grupo.total)}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
              {grupos.length === 0 && (
                <div style={{ textAlign: "center", padding: "60px", color: "var(--color-text-light)", fontSize: "14px" }}>
                  Sin registros{busqueda ? " para " + busqueda : ""}.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {confirmDel && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <div style={{ background: "white", borderRadius: "14px", padding: "28px", width: "360px", maxWidth: "95vw", textAlign: "center" }}>
            <Trash2 size={34} color="#B91C1C" style={{ marginBottom: "12px" }} />
            <h3 style={{ margin: "0 0 8px", fontSize: "16px", fontWeight: 700 }}>Eliminar este registro?</h3>
            <p style={{ margin: "0 0 4px", fontWeight: 700 }}>{confirmDel.fecha} - {confirmDel.dia_semana}</p>
            <p style={{ margin: "0 0 22px", fontSize: "20px", fontWeight: 800, color: "var(--color-success)" }}>{fmt(confirmDel.cantidad)}</p>
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={() => setConfirmDel(null)} style={{ flex: 1, padding: "11px", border: "1.5px solid #E5E7EB", borderRadius: "8px", background: "white", cursor: "pointer", fontSize: "13px", fontWeight: 600 }}>Cancelar</button>
              <button onClick={() => eliminar(confirmDel)} style={{ flex: 1, padding: "11px", border: "none", borderRadius: "8px", background: "#B91C1C", color: "white", cursor: "pointer", fontSize: "13px", fontWeight: 700 }}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ── Tab: Pensiones de Estacionamiento ────────────────────────────────────────
const PENSION_VACIA = { fecha: hoyLocal(), local_referencia: "", arrendatario_nombre: "", monto: "", num_recibo: "", pagado: true, nota: "" }

function TabPensiones() {
  const [form, setForm]           = useState(PENSION_VACIA)
  const [editId, setEditId]       = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [registros, setRegistros] = useState([])
  const [loading, setLoading]     = useState(true)
  const [confirmDel, setConfirmDel] = useState(null)
  const [expandKey, setExpandKey] = useState(null)

  const cargar = async () => {
    setLoading(true)
    const { data } = await supabase.from("estacionamiento_pensiones")
      .select("*").order("fecha", { ascending: false }).limit(300)
    setRegistros(data || [])
    setLoading(false)
  }
  useEffect(() => { cargar() }, [])

  const guardar = async () => {
    if (!form.fecha || !form.monto) return toast.error("Fecha y monto son obligatorios")
    setGuardando(true)
    const semana_inicio = sabadoDe(form.fecha)
    const payload = {
      fecha: form.fecha,
      semana_inicio,
      local_referencia: form.local_referencia || null,
      arrendatario_nombre: form.arrendatario_nombre || null,
      monto: parseFloat(form.monto),
      num_recibo: form.num_recibo || null,
      pagado: form.pagado,
      nota: form.nota || null,
    }
    const { error } = editId
      ? await supabase.from("estacionamiento_pensiones").update(payload).eq("id", editId)
      : await supabase.from("estacionamiento_pensiones").insert(payload)
    if (error) toast.error("Error: " + error.message)
    else { toast.success(editId ? "Actualizado" : "Pensión registrada"); setForm(PENSION_VACIA); setEditId(null); cargar() }
    setGuardando(false)
  }

  const iniciarEdicion = r => {
    setForm({
      fecha: r.fecha, local_referencia: r.local_referencia || "", arrendatario_nombre: r.arrendatario_nombre || "",
      monto: String(r.monto), num_recibo: r.num_recibo || "", pagado: r.pagado ?? true, nota: r.nota || "",
    })
    setEditId(r.id)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const eliminar = async r => {
    const { error } = await supabase.from("estacionamiento_pensiones").delete().eq("id", r.id)
    if (error) toast.error(error.message)
    else { toast.success("Eliminado"); setConfirmDel(null); cargar() }
  }

  // Agrupar por semana_inicio
  const porSemana = {}
  registros.forEach(r => {
    const key = r.semana_inicio || sabadoDe(r.fecha)
    if (!porSemana[key]) porSemana[key] = { registros: [], total: 0 }
    porSemana[key].registros.push(r)
    if (r.pagado) porSemana[key].total += parseFloat(r.monto) || 0
  })
  const grupos = Object.entries(porSemana).sort((a, b) => b[0].localeCompare(a[0]))
  const totalGeneral = registros.filter(r => r.pagado).reduce((a, b) => a + (parseFloat(b.monto) || 0), 0)

  const inp = { width: "100%", padding: "10px 12px", border: "1.5px solid #E5E7EB", borderRadius: "8px", fontSize: "14px", boxSizing: "border-box" }

  return (
    <>
      <p style={{ fontSize: "13px", color: "var(--color-text-light)", margin: "0 0 20px" }}>
        {registros.length} pensiones registradas · Total cobrado: <strong style={{ color: "var(--color-success)" }}>{fmt(totalGeneral, 2)}</strong>
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: "24px", alignItems: "start" }}>

        {/* ── Formulario ── */}
        <div style={{ background: "white", borderRadius: "12px", border: "1.5px solid #E5E7EB", padding: "22px", position: "sticky", top: "80px" }}>
          <h3 style={{ margin: "0 0 18px", fontSize: "15px", fontWeight: 700, display: "flex", alignItems: "center", gap: "8px",
            color: editId ? "var(--color-secondary)" : "var(--color-primary)" }}>
            {editId ? <Pencil size={16} /> : <Plus size={16} />}
            {editId ? "Editar pensión" : "Registrar pensión"}
          </h3>

          {[
            { label: "Fecha de cobro", field: "fecha", type: "date" },
            { label: "No. Local", field: "local_referencia", type: "text", placeholder: "Ej: L17, L26-27" },
            { label: "Nombre del pensionado", field: "arrendatario_nombre", type: "text", placeholder: "Nombre completo" },
            { label: "No. Recibo", field: "num_recibo", type: "text", placeholder: "Ej: 567" },
          ].map(({ label, field, type, placeholder }) => (
            <div key={field} style={{ marginBottom: "12px" }}>
              <label style={{ fontSize: "12px", fontWeight: 700, color: "var(--color-text-light)", display: "block", marginBottom: "5px" }}>{label}</label>
              <input type={type} value={form[field]} placeholder={placeholder}
                onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))} style={inp} />
            </div>
          ))}

          <div style={{ marginBottom: "12px" }}>
            <label style={{ fontSize: "12px", fontWeight: 700, color: "var(--color-text-light)", display: "block", marginBottom: "5px" }}>Monto ($)</label>
            <input type="number" min="0" step="0.50" value={form.monto} placeholder="0.00"
              onChange={e => setForm(p => ({ ...p, monto: e.target.value }))}
              style={{ ...inp, fontSize: "22px", fontWeight: 700, textAlign: "right" }} />
          </div>

          <div style={{ marginBottom: "12px" }}>
            <label style={{ fontSize: "12px", fontWeight: 700, color: "var(--color-text-light)", display: "block", marginBottom: "5px" }}>Nota</label>
            <input value={form.nota} onChange={e => setForm(p => ({ ...p, nota: e.target.value }))} placeholder="Observaciones..." style={inp} />
          </div>

          <label style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "18px", cursor: "pointer" }}>
            <input type="checkbox" checked={form.pagado} onChange={e => setForm(p => ({ ...p, pagado: e.target.checked }))}
              style={{ width: "18px", height: "18px", cursor: "pointer" }} />
            <span style={{ fontSize: "13px", fontWeight: 600 }}>Pagado</span>
          </label>

          <button onClick={guardar} disabled={guardando}
            style={{ width: "100%", padding: "12px", background: editId ? "var(--color-secondary)" : "var(--color-primary)", color: "white", border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: 700, cursor: "pointer", opacity: guardando ? 0.7 : 1 }}>
            {guardando ? "Guardando..." : editId ? "Guardar cambios" : "Registrar pensión"}
          </button>
          {editId && (
            <button onClick={() => { setForm(PENSION_VACIA); setEditId(null) }}
              style={{ width: "100%", marginTop: "8px", padding: "10px", background: "white", border: "1.5px solid #E5E7EB", borderRadius: "8px", fontSize: "13px", fontWeight: 600, cursor: "pointer", color: "#6B7280" }}>
              Cancelar
            </button>
          )}

          <div style={{ marginTop: "18px", padding: "12px", background: "#F0FDF4", borderRadius: "8px", fontSize: "11px", color: "#166534" }}>
            <strong>Semana asignada automáticamente:</strong><br />
            La semana (sábado→viernes) se calcula con la fecha de cobro y aparece en el Resumen Semanal.
          </div>
        </div>

        {/* ── Lista por semana ── */}
        <div>
          {loading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "60px" }}><LoadingSpinner /></div>
          ) : (
            <div style={{ display: "grid", gap: "10px" }}>
              {grupos.map(([key, grupo]) => {
                const open = expandKey === key
                const finSemana = addDays(key, 6)
                const fmtDate = iso => new Date(iso + "T12:00:00").toLocaleDateString("es-MX", { day: "2-digit", month: "short" })
                const pendientes = grupo.registros.filter(r => !r.pagado).length
                return (
                  <div key={key} style={{ background: "white", borderRadius: "10px", border: "1.5px solid #E5E7EB", overflow: "hidden" }}>
                    <div onClick={() => setExpandKey(open ? null : key)}
                      style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", cursor: "pointer", userSelect: "none" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <ChevronDown size={16} color="var(--color-text-light)" style={{ transform: open ? "rotate(180deg)" : "none", transition: "0.2s" }} />
                        <div>
                          <div style={{ fontSize: "14px", fontWeight: 700 }}>
                            Sáb {fmtDate(key)} — Vie {fmtDate(finSemana)}
                          </div>
                          <div style={{ fontSize: "11px", color: "var(--color-text-light)" }}>
                            {grupo.registros.length} pensiones
                            {pendientes > 0 && <span style={{ color: "#DC2626", marginLeft: "6px" }}>· {pendientes} sin pagar</span>}
                          </div>
                        </div>
                      </div>
                      <div style={{ fontSize: "20px", fontWeight: 800, color: "var(--color-success)" }}>{fmt(grupo.total, 2)}</div>
                    </div>

                    {open && (
                      <div style={{ borderTop: "1px solid #F3F4F6" }}>
                        <div style={{ display: "grid", gridTemplateColumns: "60px 1fr 1fr 80px 80px 60px auto", gap: "8px", padding: "8px 18px", background: "#F9FAFB", fontSize: "10px", fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase" }}>
                          <span>Local</span><span>Pensionado</span><span>Nota</span><span>Recibo</span><span style={{ textAlign: "right" }}>Monto</span><span style={{ textAlign: "center" }}>Pagado</span><span></span>
                        </div>
                        {grupo.registros.map(r => (
                          <div key={r.id} style={{ display: "grid", gridTemplateColumns: "60px 1fr 1fr 80px 80px 60px auto", gap: "8px", padding: "10px 18px", borderBottom: "1px solid #F9FAFB", alignItems: "center" }}>
                            <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--color-primary)" }}>{r.local_referencia || "—"}</span>
                            <span style={{ fontSize: "13px" }}>{r.arrendatario_nombre || "—"}</span>
                            <span style={{ fontSize: "11px", color: "#9CA3AF" }}>{r.nota || ""}</span>
                            <span style={{ fontSize: "12px", color: "#6B7280" }}>{r.num_recibo || "—"}</span>
                            <span style={{ fontSize: "14px", fontWeight: 700, textAlign: "right", fontFamily: "monospace",
                              color: r.pagado ? "var(--color-success)" : "#DC2626" }}>{fmt(r.monto, 2)}</span>
                            <span style={{ textAlign: "center", fontSize: "16px" }}>{r.pagado ? "✅" : "❌"}</span>
                            <div style={{ display: "flex", gap: "4px" }}>
                              <button onClick={() => iniciarEdicion(r)} style={{ background: "#F3F4F6", border: "none", borderRadius: "6px", padding: "5px 7px", cursor: "pointer", display: "flex", alignItems: "center" }}>
                                <Pencil size={13} />
                              </button>
                              <button onClick={() => setConfirmDel(r)} style={{ background: "#FEF2F2", border: "none", borderRadius: "6px", padding: "5px 7px", cursor: "pointer", color: "#B91C1C", display: "flex", alignItems: "center" }}>
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        ))}
                        <div style={{ display: "flex", justifyContent: "flex-end", padding: "10px 18px", background: "#F9FAFB", fontWeight: 800, fontSize: "14px", color: "var(--color-success)" }}>
                          Total cobrado: {fmt(grupo.total, 2)}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
              {grupos.length === 0 && (
                <div style={{ textAlign: "center", padding: "60px", color: "var(--color-text-light)", fontSize: "14px" }}>
                  Sin pensiones registradas.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {confirmDel && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <div style={{ background: "white", borderRadius: "14px", padding: "28px", width: "380px", maxWidth: "95vw", textAlign: "center" }}>
            <Trash2 size={34} color="#B91C1C" style={{ marginBottom: "12px" }} />
            <h3 style={{ margin: "0 0 8px", fontSize: "16px", fontWeight: 700 }}>Eliminar pensión?</h3>
            <p style={{ margin: "0 0 4px" }}>{confirmDel.arrendatario_nombre || confirmDel.local_referencia || "Sin nombre"}</p>
            <p style={{ margin: "0 0 22px", fontSize: "20px", fontWeight: 800, color: "var(--color-success)" }}>{fmt(confirmDel.monto, 2)}</p>
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={() => setConfirmDel(null)} style={{ flex: 1, padding: "11px", border: "1.5px solid #E5E7EB", borderRadius: "8px", background: "white", cursor: "pointer", fontSize: "13px", fontWeight: 600 }}>Cancelar</button>
              <button onClick={() => eliminar(confirmDel)} style={{ flex: 1, padding: "11px", border: "none", borderRadius: "8px", background: "#B91C1C", color: "white", cursor: "pointer", fontSize: "13px", fontWeight: 700 }}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function Estacionamiento() {
  useModuleAudit("ESTACIONAMIENTO")
  const [tab, setTab] = useState("diario")

  return (
    <div style={{ padding: "24px", maxWidth: "1200px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h1 style={{ fontSize: "22px", fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: "10px" }}>
          <Car size={22} color="var(--color-primary)" /> Estacionamiento
        </h1>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "4px", marginBottom: "24px", borderBottom: "2px solid #E5E7EB" }}>
        {[
          { id: "diario",   label: "Ingreso Diario", icon: <Car size={15} /> },
          { id: "pensiones", label: "Pensiones",     icon: <Users size={15} /> },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            display: "flex", alignItems: "center", gap: "6px",
            padding: "10px 20px", border: "none", borderBottom: tab === t.id ? "2px solid var(--color-primary)" : "2px solid transparent",
            background: "transparent", fontSize: "14px", fontWeight: tab === t.id ? 700 : 500,
            color: tab === t.id ? "var(--color-primary)" : "var(--color-text-light)",
            cursor: "pointer", marginBottom: "-2px",
          }}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {tab === "diario"    && <TabDiario />}
      {tab === "pensiones" && <TabPensiones />}
    </div>
  )
}
