import React, { useState, useEffect } from "react";
import { AppState, ReportData } from "./types";
import { generateMockReportData, MOCK_SCHOOLS } from "./utils";
import { fetchReportDataInBatches, fetchColegios, BatchProgressInfo } from "./services/apiService";
import ConfigScreen from "./components/ConfigScreen";
import FilterPanel from "./components/FilterPanel";
import SummaryCards from "./components/SummaryCards";
import ReportTables from "./components/ReportTables";
import HeaderLogo from "./components/HeaderLogo";
import AnalisisNLPanel from "./components/AnalisisNLPanel";
import ReporteReemplazosPanel from "./components/ReporteReemplazosPanel";
import HistorialPlaneacionesPanel from "./components/HistorialPlaneacionesPanel";
import BackupListasCard from "./components/BackupListasCard";
import ReporteNinosCeroCard from "./components/ReporteNinosCeroCard";
import ProgressBar from "./components/ProgressBar";
import { motion, AnimatePresence } from "motion/react";
import { 
  SlidersHorizontal, 
  BarChart3, 
  Users, 
  Settings, 
  Database, 
  Sparkles, 
  Menu, 
  X, 
  AlertCircle, 
  Lock, 
  Unlock, 
  UserCheck 
} from "lucide-react";

const INITIAL_REPORT_DATA: ReportData = {
  diario: [],
  nl: [],
  planeaciones: [],
  refrigerios: [],
  docentes: []
};

export default function App() {
  const [state, setState] = useState<AppState>(() => {
    const webAppUrl = localStorage.getItem("webAppUrl") || "";
    const isDemoMode = localStorage.getItem("isDemoMode") !== "false"; // default true
    const rootFolderId = localStorage.getItem("rootFolderId") || "1-EI7YSJKDi0P8Npeqy-91vFxzhRVd69G";
    const destFolderId = localStorage.getItem("destFolderId") || "1-EI7YSJKDi0P8Npeqy-91vFxzhRVd69G";
    const adminPasswordHash = localStorage.getItem("adminPasswordHash") || "admin123";
    const planeacionesPattern = localStorage.getItem("planeacionesPattern") || "MM";
    const currentMonth = (new Date().getMonth() + 1).toString().padStart(2, "0");

    return {
      webAppUrl,
      isDemoMode,
      selectedMonth: currentMonth,
      selectedSchools: MOCK_SCHOOLS,
      availableSchools: MOCK_SCHOOLS,
      loadingData: false,
      loadingSchools: false,
      data: INITIAL_REPORT_DATA,
      errorMsg: null,
      activeTab: "dashboard",
      rootFolderId,
      destFolderId,
      adminPasswordHash,
      isAdmin: false,
      planeacionesPattern
    };
  });

  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeReportTab, setActiveReportTab] = useState("diario");
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState("");
  const [adminError, setAdminError] = useState<string | null>(null);
  const [syncStatusText, setSyncStatusText] = useState<string>("");

  // Abort controller ref to cancel sync requests
  const syncAbortControllerRef = React.useRef<AbortController | null>(null);

  const handleStopSync = () => {
    if (syncAbortControllerRef.current) {
      syncAbortControllerRef.current.abort();
      syncAbortControllerRef.current = null;
    }
    setState(prev => ({
      ...prev,
      loadingData: false,
      errorMsg: "Sincronización de datos detenida por el usuario."
    }));
    setSyncStatusText("");
  };

  // Load available schools when configuration changes
  useEffect(() => {
    async function loadSchools() {
      if (state.isDemoMode || !state.webAppUrl) {
        setState(prev => ({
          ...prev,
          availableSchools: MOCK_SCHOOLS,
          selectedSchools: MOCK_SCHOOLS
        }));
        return;
      }

      setState(prev => ({ ...prev, loadingSchools: true, errorMsg: null }));
      try {
        const schools = await fetchColegios(state.webAppUrl, state.rootFolderId);

        if (schools.length > 0) {
          setState(prev => ({
            ...prev,
            availableSchools: schools,
            selectedSchools: schools,
            loadingSchools: false
          }));
        } else {
          throw new Error("No se encontró una lista de colegios válida en Google Apps Script.");
        }
      } catch (err: any) {
        if (err.message?.includes("cancelada")) return;
        setState(prev => ({
          ...prev,
          loadingSchools: false,
          errorMsg: `Error al cargar la lista de colegios: ${err.message}. Se activará el modo simulación temporalmente.`
        }));
      }
    }

    loadSchools();
  }, [state.webAppUrl, state.isDemoMode, state.rootFolderId]);

  // Load report data based on month and school selections (Triggered manually via Sincronizar)
  useEffect(() => {
    async function loadReportData() {
      if (state.isDemoMode || !state.webAppUrl) {
        // Generate mock data reactively
        const mockData = generateMockReportData(state.selectedMonth, state.selectedSchools);
        setState(prev => ({
          ...prev,
          data: mockData,
          loadingData: false
        }));
        return;
      }

      if (state.selectedSchools.length === 0) {
        setState(prev => ({
          ...prev,
          data: INITIAL_REPORT_DATA,
          loadingData: false
        }));
        return;
      }

      // Create abort controller for sync
      const abortController = new AbortController();
      syncAbortControllerRef.current = abortController;

      setState(prev => ({ ...prev, loadingData: true, errorMsg: null }));
      setSyncStatusText(`Iniciando sincronización por lotes para ${state.selectedSchools.length} colegios...`);

      try {
        const reportData = await fetchReportDataInBatches(state.webAppUrl, {
          mes: state.selectedMonth,
          colegios: state.selectedSchools,
          folderId: state.rootFolderId,
          planeacionesPattern: state.planeacionesPattern,
          batchSize: 2, // 2 schools per batch optimal for GAS serverless quotas
          signal: abortController.signal,
          onBatchProgress: (progress: BatchProgressInfo, partialData: ReportData) => {
            setSyncStatusText(progress.message);
            // Incrementally update UI with partial data
            setState(prev => ({
              ...prev,
              data: {
                diario: [...partialData.diario],
                nl: [...partialData.nl],
                planeaciones: [...partialData.planeaciones],
                refrigerios: [...partialData.refrigerios],
                docentes: [...partialData.docentes]
              }
            }));
          }
        });

        setState(prev => ({
          ...prev,
          data: reportData,
          loadingData: false
        }));
      } catch (err: any) {
        if (err.message?.includes("cancelada") || err.message?.includes("detenida")) {
          return;
        }
        setState(prev => ({
          ...prev,
          loadingData: false,
          errorMsg: `Error al cargar datos del reporte: ${err.message}.`
        }));
      } finally {
        syncAbortControllerRef.current = null;
      }
    }

    loadReportData();
  }, [state.webAppUrl, state.isDemoMode, refreshTrigger, state.rootFolderId, state.planeacionesPattern]);

  const handleSaveConfig = (url: string, isDemo: boolean, rootFolderId: string, destFolderId: string, adminPasswordHash: string, planeacionesPattern: string) => {
    localStorage.setItem("webAppUrl", url);
    localStorage.setItem("isDemoMode", String(isDemo));
    localStorage.setItem("rootFolderId", rootFolderId);
    localStorage.setItem("destFolderId", destFolderId);
    localStorage.setItem("adminPasswordHash", adminPasswordHash);
    localStorage.setItem("planeacionesPattern", planeacionesPattern);

    setState(prev => ({
      ...prev,
      webAppUrl: url,
      isDemoMode: isDemo,
      rootFolderId,
      destFolderId,
      adminPasswordHash,
      planeacionesPattern,
      activeTab: "dashboard", // Auto redirect to dashboard
      errorMsg: null
    }));
  };

  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleUnlock = () => {
    if (adminPasswordInput === state.adminPasswordHash) {
      setState(prev => ({ ...prev, isAdmin: true }));
      setShowAdminModal(false);
      setAdminPasswordInput("");
      setAdminError(null);
    } else {
      setAdminError("Contraseña incorrecta. Por favor intenta de nuevo.");
    }
  };

  const allTabs = [
    { id: "dashboard", label: "Dashboard Principal", icon: BarChart3 },
    { id: "analisis_nl", label: "Backups y niños a lápiz", icon: Users },
    { id: "reemplazos", label: "Reporte de Reemplazos", icon: UserCheck },
    { id: "historial_planeaciones", label: "Historial de Planeaciones", icon: Database },
    { id: "setup", label: "Configurar API", icon: Settings }
  ];

  const tabs = allTabs.filter(tab => {
    if (tab.id === "setup") {
      return state.isAdmin;
    }
    return true;
  });


  return (
    <div className="min-h-screen bg-[#f0f2f5] flex flex-col font-sans text-slate-800">
      {/* Top Header */}
      <header className="bg-slate-900 text-slate-100 border-b border-slate-800 shrink-0">
        <div className="max-w-7xl mx-auto px-4 h-12 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <HeaderLogo />
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-2">
            <nav className="flex items-center gap-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = state.activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setState(prev => ({ ...prev, activeTab: tab.id as any }))}
                    className={`flex items-center gap-1 px-3 py-1 rounded text-[11px] font-semibold tracking-wide transition cursor-pointer ${
                      isActive 
                        ? "bg-indigo-600 text-white shadow-xs" 
                        : "text-slate-300 hover:text-white hover:bg-slate-800/80"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>

            <div className="h-4 w-[1px] bg-slate-800 mx-1" />

            {state.isAdmin ? (
              <button
                onClick={() => setState(prev => ({ ...prev, isAdmin: false, activeTab: "dashboard" }))}
                className="flex items-center gap-1 px-2.5 py-1 bg-red-700 hover:bg-red-600 text-white rounded text-[10px] font-bold cursor-pointer transition shadow-xs"
              >
                <Lock className="w-3 h-3" />
                Salir Admin
              </button>
            ) : (
              <button
                onClick={() => setShowAdminModal(true)}
                className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white rounded text-[10px] font-bold cursor-pointer transition border border-slate-700 shadow-xs"
              >
                <Unlock className="w-3 h-3 text-indigo-400" />
                Acceso Admin
              </button>
            )}
          </div>

          {/* Mobile menu trigger and quick admin toggle */}
          <div className="md:hidden flex items-center gap-2">
            {state.isAdmin ? (
              <button
                onClick={() => setState(prev => ({ ...prev, isAdmin: false, activeTab: "dashboard" }))}
                className="p-1 text-red-400 hover:text-red-300 cursor-pointer"
                title="Salir Admin"
              >
                <Lock className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={() => setShowAdminModal(true)}
                className="p-1 text-slate-400 hover:text-white cursor-pointer"
                title="Acceso Admin"
              >
                <Unlock className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1 rounded hover:bg-slate-800 text-slate-300 transition cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Nav Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="md:hidden bg-slate-900 border-b border-slate-800 py-1.5 px-3 flex flex-col gap-0.5 shrink-0 z-50 absolute w-full top-12 shadow-md"
          >
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = state.activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setState(prev => ({ ...prev, activeTab: tab.id as any }));
                    setMobileMenuOpen(false);
                  }}
                  className={`flex items-center gap-2 w-full text-left px-3 py-2 rounded text-[11px] font-semibold cursor-pointer ${
                    isActive 
                      ? "bg-indigo-600 text-white" 
                      : "text-slate-300 hover:text-white hover:bg-slate-800/60"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Demo banner indicator */}
      {state.isDemoMode && (
        <div className="bg-indigo-50 border-b border-indigo-100 text-indigo-950 text-[10px] py-1 px-4 shadow-xs shrink-0">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-1 font-medium">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <span>Estás explorando en <strong>Modo Demostración</strong> con datos simulados reactivos.</span>
            </div>
            <button
              onClick={() => setState(prev => ({ ...prev, activeTab: "setup" }))}
              className="text-indigo-700 hover:text-indigo-950 underline text-[10px] self-start sm:self-auto font-bold cursor-pointer"
            >
              Conectar tu Google Apps Script API →
            </button>
          </div>
        </div>
      )}


      {/* Main Container */}
      <main className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={state.activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
          >
            {/* 1. SETUP VIEW */}
            {state.activeTab === "setup" && (
              <ConfigScreen
                webAppUrl={state.webAppUrl}
                isDemoMode={state.isDemoMode}
                rootFolderId={state.rootFolderId}
                destFolderId={state.destFolderId}
                adminPasswordHash={state.adminPasswordHash}
                planeacionesPattern={state.planeacionesPattern}
                onSave={handleSaveConfig}
              />
            )}

            {/* 2. DASHBOARD VIEW */}
            {state.activeTab === "dashboard" && (
              <div className="max-w-7xl mx-auto py-6 px-4 space-y-6">
                {/* Error panel banner if present */}
                {state.errorMsg && (
                  <div className="p-3 bg-red-50 border border-red-100 text-red-800 rounded-xl flex items-start gap-2 text-xs">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                    <span>{state.errorMsg}</span>
                  </div>
                )}

                {/* Progress bar when updating dashboard data */}
                {(state.loadingData || state.loadingSchools) && (
                  <ProgressBar
                    isLoading={state.loadingData || state.loadingSchools}
                    webAppUrl={state.webAppUrl}
                    isDemoMode={state.isDemoMode}
                    title={state.loadingSchools ? "Cargando lista de colegios..." : "Actualizando datos del Dashboard..."}
                    statusText={syncStatusText || `Consultando reporte de planillas para Mes ${state.selectedMonth} (${state.selectedSchools.length} colegios)...`}
                    onStop={handleStopSync}
                    accentColor="indigo"
                  />
                )}

                {/* Filters (100% width) */}
                <FilterPanel
                  selectedMonth={state.selectedMonth}
                  selectedSchools={state.selectedSchools}
                  availableSchools={state.availableSchools}
                  onChangeMonth={(month) => setState(prev => ({ ...prev, selectedMonth: month }))}
                  onChangeSchools={(schools) => setState(prev => ({ ...prev, selectedSchools: schools }))}
                  onRefresh={handleRefresh}
                  onStopSync={handleStopSync}
                  loading={state.loadingData || state.loadingSchools}
                />

                {/* Summary counters */}
                <SummaryCards
                  data={state.data}
                  onSelectTab={setActiveReportTab}
                  activeTab={activeReportTab}
                />

                {/* Loading State Overlay */}
                {state.loadingData ? (
                  <div className="bg-white p-8 rounded-lg border border-slate-200 shadow-xs flex flex-col items-center justify-center gap-3">
                    <div className="w-7 h-7 rounded-full border-3 border-indigo-600 border-t-transparent animate-spin" />
                    <p className="text-[11px] font-semibold text-slate-600 animate-pulse">
                      Leyendo bases de datos en Drive y extrayendo novedades...
                    </p>
                    <button
                      type="button"
                      onClick={handleStopSync}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-md text-xs font-bold transition cursor-pointer shadow-xs"
                    >
                      <X className="w-3.5 h-3.5 text-red-600" />
                      Detener Sincronización
                    </button>
                  </div>
                ) : (
                  /* Data tables */
                  <ReportTables
                    data={state.data}
                    activeTab={activeReportTab}
                    onSelectTab={setActiveReportTab}
                    selectedMonth={state.selectedMonth}
                    rootFolderId={state.rootFolderId}
                  />
                )}
              </div>
            )}

            {/* 2. BACKUPS Y NIÑOS A LÁPIZ VIEW */}
            {state.activeTab === "analisis_nl" && (
              <div className="max-w-7xl mx-auto py-6 px-4 space-y-6">
                {/* Copia de Respaldo de Listas - Toolbar Horizontal */}
                <BackupListasCard
                  availableSchools={state.availableSchools.length > 0 ? state.availableSchools : MOCK_SCHOOLS}
                  initialMonth={state.selectedMonth}
                  webAppUrl={state.webAppUrl}
                  isDemoMode={state.isDemoMode}
                />

                <AnalisisNLPanel
                  webAppUrl={state.webAppUrl}
                  isDemoMode={state.isDemoMode}
                  availableSchools={state.availableSchools}
                  rootFolderId={state.rootFolderId}
                />

                {/* Reporte de Niños Cero */}
                <ReporteNinosCeroCard
                  webAppUrl={state.webAppUrl}
                  isDemoMode={state.isDemoMode}
                  availableSchools={state.availableSchools.length > 0 ? state.availableSchools : MOCK_SCHOOLS}
                  initialMonth={state.selectedMonth}
                  rootFolderId={state.rootFolderId}
                />
              </div>
            )}

            {/* 3. REPORTE DE REEMPLAZOS VIEW */}
            {state.activeTab === "reemplazos" && (
              <ReporteReemplazosPanel
                webAppUrl={state.webAppUrl}
                isDemoMode={state.isDemoMode}
                availableSchools={state.availableSchools}
                initialMonth={state.selectedMonth}
                initialSchools={state.selectedSchools}
                rootFolderId={state.rootFolderId}
              />
            )}

            {/* 4. HISTORIAL GLOBAL DE PLANEACIONES VIEW */}
            {state.activeTab === "historial_planeaciones" && (
              <HistorialPlaneacionesPanel
                webAppUrl={state.webAppUrl}
                isDemoMode={state.isDemoMode}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>


      {/* Persistent footer */}
      <footer className="bg-slate-900 border-t border-slate-800 text-[9px] text-slate-400 py-2 shrink-0">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-center sm:text-left font-sans">
          <span>&copy; 2026 Programa Educativo Multicolegio - Coordinación de Auditoría General</span>
          <span>Desarrollado en Colaboración con Google Workspace</span>
        </div>
      </footer>

      {/* Admin Password Modal */}
      {showAdminModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-xl shadow-lg border border-slate-200 max-w-sm w-full p-5 space-y-4"
          >
            <div className="text-center">
              <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-2">
                <Lock className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 uppercase">Modo Administrador</h3>
              <p className="text-[10px] text-slate-500 mt-1">
                Ingresa la contraseña para desbloquear la configuración de la API y las guías de Apps Script.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Contraseña</label>
                <input
                  type="password"
                  value={adminPasswordInput}
                  onChange={(e) => setAdminPasswordInput(e.target.value)}
                  placeholder="Escribe la contraseña (defecto: admin123)"
                  className="w-full px-3 py-1.5 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-indigo-500 bg-white text-slate-800 outline-none"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleUnlock();
                  }}
                  autoFocus
                />
              </div>

              {adminError && (
                <p className="text-red-600 text-[10px] font-bold text-center">{adminError}</p>
              )}

              <div className="flex gap-2 text-xs font-bold pt-2">
                <button
                  onClick={() => {
                    setShowAdminModal(false);
                    setAdminPasswordInput("");
                    setAdminError(null);
                  }}
                  className="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleUnlock}
                  className="flex-1 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded transition cursor-pointer"
                >
                  Desbloquear
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
