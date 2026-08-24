export interface DiarioRow {
  colegio: string;
  grupo: string;
  fechaSesion: string;
  planeacion: string;
  asistenciasFaltantes: string;
  alertaDocente: string;
  fileUrl?: string;
}

export interface NlRow {
  nombre: string;
  documento: string;
  colegio: string;
  grupo: string;
  asistencia: string;
  observacion: string;
  fileUrl?: string;
}

export interface PlaneacionRow {
  archivo: string;
  estado: "CORRECTO" | "ERROR" | string;
  ultimaPlaneacion?: string;
  detalles: string;
  secuenciaActual: string;
  fileUrl?: string;
}

export interface RefrigerioRow {
  nombre: string;
  documento: string;
  colegio: string;
  grupo: string;
  idk: string;
  alertaRefrigerio: string;
  fileUrl?: string;
}

export interface DocenteRow {
  grupo: string;
  docentes: string;
  alerta1raQuincena: string;
  alerta2daQuincena: string;
  observacion?: string;
  fileUrl?: string;
}

export interface ReemplazoRow {
  fecha: string;
  colegio: string;
  grupo: string;
  docente: string;
  cc: string;
  observacion: string;
  fileUrl?: string;
}

export interface HistorialHeader {
  text: string;
  bgColor?: string;
  textColor?: string;
}

export interface HistorialCell {
  value: string | number | null;
  bgColor?: string;
  textColor?: string;
}

export interface HistorialPlaneacionesData {
  headers: HistorialHeader[];
  rows: HistorialCell[][];
  summaryMsg?: string;
}

export interface ReportData {
  diario: DiarioRow[];
  nl: NlRow[];
  planeaciones: PlaneacionRow[];
  refrigerios: RefrigerioRow[];
  docentes: DocenteRow[];
}

export interface NinoCeroRow {
  nombre: string;
  documento: string;
  colegio: string;
  grupo: string;
  quincena?: string;
  fileUrl?: string;
}

export interface NlConteoRow {
  nombre: string;
  documento: string;
  colegio: string;
  grupo: string;
  asisUnica: string;
  totalAsis: number;
  fileUrl?: string;
}

export interface NlDuplicadoRow {
  colegio: string;
  nombre: string;
  documento: string;
  grupoActivo: string;
  grupoNl: string;
  fileUrl?: string;
}

export interface NlBusquedaRow {
  documentoEncontrado: string;
  nombre: string;
  colegio: string;
  grupo: string;
  asistenciasMes: number;
  fileUrl?: string;
}

export interface AnalisisNLResult {
  conteoNL: NlConteoRow[];
  duplicados: NlDuplicadoRow[];
  busquedaDocs: NlBusquedaRow[];
  summaryMsg: string;
}

export interface AppState {
  webAppUrl: string;
  isDemoMode: boolean;
  selectedMonth: string; // "01" to "12"
  selectedSchools: string[]; // List of selected school names
  availableSchools: string[]; // List of all school names fetched from API/Demo
  loadingData: boolean;
  loadingSchools: boolean;
  data: ReportData;
  errorMsg: string | null;
  activeTab: "dashboard" | "analisis_nl" | "reemplazos" | "historial_planeaciones" | "setup";
  rootFolderId: string; // ID of the root drive folder for covenants/schools
  destFolderId: string; // ID of the destination drive folder for consolidation files
  adminPasswordHash: string; // Password to lock/unlock Setup
  isAdmin: boolean; // Current session admin unlock status
  planeacionesPattern: string; // File name pattern or keyword for planning files (e.g., "MM", "PLANEACION")
}

