import { useModuleAudit } from "../hooks/useAudit"
import { useState, useEffect } from "react"
import { Car, Plus, Pencil, Trash2, ChevronDown, Search } from "lucide-react"
import LoadingSpinner from "../components/ui/LoadingSpinner"
import { supabase } from "../lib/supabase"
import toast from "react-hot-toast"

function fmt(n) { return "$" + (parseFloat(n) || 0).toLocaleString("es-MX", { minimumFractionDigits: 0 }) }

function addDays(iso, n) {
  const d = new Date(iso + "T12:00:00")
  d.setDate(d.getDate() + n)
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

export default function Estacionamiento() {
  useModuleAudit("ESTACIONAMIENTO")

  const today = new Date().toISOString().split("T")[0]
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
    const { data } = await supabase
      .from("estacionamiento_diario")
      .select("*")
      .order("fecha", { ascending: false })
      .limit(500)
    setRegistros(data || [])
    setLoading(false)
  }
  useEffect(() => { cargar() }, [])

  const guardar = async () => {
    if (!form.fecha || !form.cantidad) return toast.error("Fecha y monto son obligatorios")
    setGuardando(true)
    const dt = new Date(form.fecha + "T12:00:00")
    const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"]
    const DIAS  = ["Domingo","Lunes","Martes","Miercoles","Jueves","Viernes","Sabado"]
    const payload = {
      fecha: form.fecha, cantidad: parseFloat(form.cantidad), notas: form.notas || null,
      anio: dt.getFullYear(), mes: MESES[dt.getMonth()],
      dia_semana: DIAS[dt.getDay()], semana: "S" + Math.ceil(dt.getDate() / 7),
    }
    const { error } = editId
      ? await supabase.from("estacionamiento_diario").update(payload).eq("id", editId)
      : await supabase.from("estacionamiento_diario").upsert(payload, { onConflict: "fecha" })
    if (error) { toast.error("Error: " + error.message) }
    else {
      toast.success(editId ? "Actualizado" : "Guardado")
      setForm({ fecha: today, cantidad: "", notas: "" }); setEditId(null); cargar()
    }
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
    <div style={{ padding: "24px", maxWidth: "1100px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <div>
          <h1 style={{ fontSize: "22px", fontWeight: 700, margin: "0 0 4px", display: "flex", alignItems: "center", gap: "10px" }}>
            <Car size={22} color="var(--color-primary)" /> Estacionamiento
          </h1>
          <p style={{ fontSize: "13px", color: "var(--color-text-light)", margin: 0 }}>
            {filtrados.length} dias registrados · Total: <strong style={{ color: "var(--color-success)" }}>{fmt(totalGeneral)}</strong>
          </p>
        </div>
      </div>

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
    </div>
  )
}
