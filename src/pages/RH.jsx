import { useModuleAudit, logAudit } from '../hooks/useAudit'
import { useState, useEffect, useCallback, useRef, useMemo, Fragment } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Users, Search, Plus, AlertTriangle, CheckCircle, Clock, TrendingUp,
  UserCheck, Download, X, ChevronRight, Briefcase, FileText,
  UserPlus, Link, Calendar, Phone, Mail, ArrowRight, RefreshCw,
  Upload, Filter, MoreVertical, ChevronDown, Edit2, Save,
  DollarSign, Send, Eye, ChevronUp, Printer, AlertCircle,
  LayoutGrid, LayoutList, MapPin, Award, Trash2
} from 'lucide-react'
import * as XLSX from 'xlsx'
import ExcelJS from 'exceljs'
import { usePRP } from '../hooks/usePRP'
import { supabase, supabaseParking } from '../lib/supabase'
import ImportadorDocumento from '../components/ui/ImportadorDocumento'
import ConsultaChecadas from '../components/ui/ConsultaChecadas'
import toast from 'react-hot-toast'
import {
  fmt$, Avatar, SemaforoContrato,
  TIPOS_DOC, TIPOS_CONTRATO, ETAPAS_CANDIDATO, ETAPA_COLOR, MOTIVOS_RECHAZO,
  FieldWrapper, NominaInput,
} from '../components/rrhh/rh-helpers'
import {
  getLunes, fmtDate, addDays, generarSemanas,
  DIAS_ABREV, ISO_POR_DIA, isoDelDia, soloHora,
  MESES_ES, labelSemana,
} from '../components/rrhh/rh-semanas'
import MedidorExpediente, { DOCS_OBLIGATORIOS } from '../components/rrhh/MedidorExpediente'
import NuevoEmpleadoModal from '../components/rrhh/ModalNuevoEmpleado'
import RenovarContratoModal from '../components/rrhh/ModalRenovarContrato'
import EditarEmpleadoModal from '../components/rrhh/ModalEditarEmpleado'
import { AvatarUploadSmall, DetalleEmpleado } from '../components/rrhh/DetalleEmpleado'
import TabEmpleados from '../components/rrhh/TabEmpleados'
import TabReclutamiento from '../components/rrhh/TabReclutamiento'
import ImportChecadorModal from '../components/rrhh/ImportChecadorModal'
import TabHorariosGuardia from '../components/rrhh/TabHorariosGuardia'
import TabAsistencia from '../components/rrhh/TabAsistencia'
import TabNomina from '../components/rrhh/TabNomina'
import TabIncidencias from '../components/rrhh/TabIncidencias'
import TabNominaIWOL from '../components/rrhh/TabNominaIWOL'
import TabVacacionesRH from '../components/rrhh/TabVacacionesRH'

// ── Página principal ────────────────────────────────────────────────────────
export default function RH() {
  useModuleAudit('RH')
  const TABS = ['Empleados', 'Reclutamiento', 'Asistencia', 'Horarios de Guardia', 'Incidencias', 'Vacaciones', 'Nómina', 'Nómina IWOL']
  const [tab, setTab] = useState('Empleados')
  const [showNuevo, setShowNuevo] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  return (
    <div style={{ padding: 24, minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Users size={28} color="#7B5EA7" /> Recursos Humanos
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--color-text-light)' }}>Reclutamiento · Expediente · Asistencia · Nómina</p>
        </div>
        {tab === 'Empleados' && (
          <button onClick={() => setShowNuevo(true)} style={{ display:'flex',alignItems:'center',gap:8,padding:'10px 18px',background:'#7B5EA7',color:'white',border:'none',borderRadius:9,fontSize:14,fontWeight:700,cursor:'pointer',boxShadow:'0 2px 8px rgba(123,94,167,.3)' }}>
            <Plus size={16} /> Nuevo Empleado
          </button>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 2, borderBottom: '1px solid #E5E7EB', marginBottom: 22 }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding: '9px 18px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600, borderBottom: `2.5px solid ${tab===t ? '#7B5EA7' : 'transparent'}`, color: tab===t ? '#7B5EA7' : 'var(--color-text-light)', transition: '.15s' }}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'Empleados'     && <TabEmpleados onNuevo={() => setShowNuevo(true)} />}
      {tab === 'Reclutamiento' && <TabReclutamiento />}
      {tab === 'Asistencia'    && <TabAsistencia />}
      {tab === 'Horarios de Guardia' && <TabHorariosGuardia />}
      {tab === 'Incidencias'   && <TabIncidencias />}
      {tab === 'Vacaciones'    && <TabVacacionesRH />}
      {tab === 'Nómina'        && <TabNomina />}
      {tab === 'Nómina IWOL'   && <TabNominaIWOL />}

      {showNuevo && (
        <NuevoEmpleadoModal onClose={() => setShowNuevo(false)} onCreated={() => setRefreshKey(k => k+1)} />
      )}
    </div>
  )
}
