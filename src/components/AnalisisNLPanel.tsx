import React, { useState } from "react";
import { 
  FileSpreadsheet, 
  Search, 
  Users, 
  AlertTriangle, 
  AlertCircle,
  CheckCircle2, 
  Loader2, 
  ListFilter, 
  UserCheck, 
  ArrowUpDown,
  FileSearch,
  RefreshCw,
  Code,
  Copy,
  Check,
  Globe,
  Info,
  X,
  ExternalLink,
  Building2,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { AnalisisNLResult, NlConteoRow, NlDuplicadoRow, NlBusquedaRow } from "../types";
import { exportToExcel, fetchFromWebApp } from "../utils";
import ProgressBar from "./ProgressBar";

interface AnalisisNLPanelProps {
  webAppUrl: string;
  isDemoMode: boolean;
  availableSchools: string[];
  rootFolderId?: string;
}

export default function AnalisisNLPanel({
  webAppUrl,
  isDemoMode,
  availableSchools,
  rootFolderId
}: AnalisisNLPanelProps) {
  const currentMonthStr = (new Date().getMonth() + 1).toString().padStart(2, "0");
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);
  const [selectedSchools, setSelectedSchools] = useState<string[]>(
    availableSchools.length > 0 ? availableSchools : ["IED Prado Veraniego", "IED Republica de Colombia", "IED Restrepo Millan"]
  );
  const [showSchoolDropdown, setShowSchoolDropdown] = useState<boolean>(false);
  const [targetDocsInput, setTargetDocsInput] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [processMode, setProcessMode] = useState<"conteo" | "duplicados" | "busqueda">("conteo");
  const [results, setResults] = useState<AnalisisNLResult | null>(null);
  const [activeTabTable, setActiveTabTable] = useState<"conteo" | "duplicados" | "busqueda">("conteo");
  const [isRealData, setIsRealData] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showScriptModal, setShowScriptModal] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  // Abort controller ref for stopping analysis
  const analysisAbortControllerRef = React.useRef<AbortController | null>(null);

  const handleStopAnalysis = () => {
    if (analysisAbortControllerRef.current) {
      analysisAbortControllerRef.current.abort();
      analysisAbortControllerRef.current = null;
    }
    setLoading(false);
    setErrorMessage("Proceso de análisis detenido por el usuario.");
  };

  // Sync available schools if list grows
  React.useEffect(() => {
    if (availableSchools.length > 0 && selectedSchools.length === 0) {
      setSelectedSchools(availableSchools);
    }
  }, [availableSchools]);

  const handleSelectAllSchools = (checked: boolean) => {
    if (checked) {
      setSelectedSchools(availableSchools.length > 0 ? availableSchools : ["IED Prado Veraniego", "IED Republica de Colombia", "IED Restrepo Millan"]);
    } else {
      setSelectedSchools([]);
    }
  };

  const handleToggleSchool = (school: string) => {
    setSelectedSchools(prev => 
      prev.includes(school) ? prev.filter(s => s !== school) : [...prev, school]
    );
  };

  const months = [
    { value: "01", name: "Enero (01)" },
    { value: "02", name: "Febrero (02)" },
    { value: "03", name: "Marzo (03)" },
    { value: "04", name: "Abril (04)" },
    { value: "05", name: "Mayo (05)" },
    { value: "06", name: "Junio (06)" },
    { value: "07", name: "Julio (07)" },
    { value: "08", name: "Agosto (08)" },
    { value: "09", name: "Septiembre (09)" },
    { value: "10", name: "Octubre (10)" },
    { value: "11", name: "Noviembre (11)" },
    { value: "12", name: "Diciembre (12)" },
  ];

  const APPS_SCRIPT_CODE = `/**
 * ================================================================
 * PANEL DE CONTROL JEC - SCRIPT UNIFICADO API WEB Y MENÚ
 * ================================================================
 */

const API_ID_CARPETA_RAIZ = "1-EI7YSJKDi0P8Npeqy-91vFxzhRVd69G";

function doGet(e) {
  if (!e || !e.parameter) {
    return _respuestaJSON({ ok: false, error: "No se recibieron parámetros en la petición." });
  }

  const action = e.parameter.action || "";

  try {
    let payload;

    if (action === "getColegios" || action === "obtenerColegios") {
      payload = obtenerListaColegiosRaiz();

    } else if (action === "getReportData" || action === "getReport" || action === "obtenerReporte") {
      const mes = e.parameter.mes || "05";
      const colegios = e.parameter.colegios ? e.parameter.colegios.split(",") : [];
      payload = generarReporteAPI(mes, colegios);

    } else if (action === "getAnalisisNL_Conteo") {
      const { mes, colegios, docs } = parseParamsNL(e);
      payload = ejecutarModulosNL(colegios, mes, docs, { conteo: true, duplicados: false, busqueda: false });

    } else if (action === "getAnalisisNL_Duplicados") {
      const { mes, colegios, docs } = parseParamsNL(e);
      payload = ejecutarModulosNL(colegios, mes, docs, { conteo: false, duplicados: true, busqueda: false });

    } else if (action === "getAnalisisNL_Busqueda") {
      const { mes, colegios, docs } = parseParamsNL(e);
      payload = ejecutarModulosNL(colegios, mes, docs, { conteo: false, duplicados: false, busqueda: true });

    } else if (action === "getAnalisisNL_All" || action === "getAnalisisNL") {
      const { mes, colegios, docs } = parseParamsNL(e);
      payload = ejecutarModulosNL(colegios, mes, docs, { conteo: true, duplicados: true, busqueda: true });

    } else if (action === "getNinosCero" || action === "getNinosCeroReporte") {
      const mes = e.parameter.mes || "05";
      const colegios = e.parameter.colegios ? e.parameter.colegios.split(",") : [];
      payload = obtenerNinosCeroAPI(mes, colegios);

    } else {
      throw new Error("Acción no reconocida por el servidor: '" + action + "'.");
    }

    if (typeof payload === "object" && !payload.ok) {
        return _respuestaJSON({ ok: true, status: "success", data: payload, ...payload });
    }
    
    return _respuestaJSON({ ok: true, data: payload });

  } catch (err) {
    return _respuestaJSON({ ok: false, status: "error", error: err.message, message: err.message });
  }
}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(APPS_SCRIPT_CODE);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const executeAnalysis = async () => {
    if (selectedSchools.length === 0) {
      alert("Debes seleccionar al menos un colegio.");
      return;
    }

    if (processMode === "busqueda" && !targetDocsInput.trim()) {
      alert("Por favor ingresa al menos un número de documento para realizar la búsqueda.");
      return;
    }

    const abortController = new AbortController();
    analysisAbortControllerRef.current = abortController;

    setLoading(true);
    setErrorMessage(null);

    const targetDocs = targetDocsInput
      .split(/[\n,;]+/)
      .map(d => d.trim().toUpperCase())
      .filter(d => d.length > 0);

    // Determine action name based on processMode
    let actionName = "getAnalisisNL";
    if (processMode === "conteo") actionName = "getAnalisisNL_Conteo";
    else if (processMode === "duplicados") actionName = "getAnalisisNL_Duplicados";
    else if (processMode === "busqueda") actionName = "getAnalisisNL_Busqueda";

    // If Web App URL is present and valid, fetch real data from Apps Script
    if (webAppUrl && webAppUrl.startsWith("https://script.google.com/")) {
      try {
        let responseData = await fetchFromWebApp<any>(webAppUrl, {
          action: actionName,
          mes: selectedMonth,
          colegios: selectedSchools.join(","),
          docs: targetDocs.join(",")
        }, abortController.signal);

        // Fallback to getAnalisisNL if actionName wasn't recognized by an older script
        if (responseData && responseData.ok === false && responseData.error?.includes("Acción no reconocida")) {
          responseData = await fetchFromWebApp<any>(webAppUrl, {
            action: "getAnalisisNL",
            mes: selectedMonth,
            colegios: selectedSchools.join(","),
            docs: targetDocs.join(",")
          }, abortController.signal);
        }

        const dataObj = (responseData?.data && typeof responseData.data === "object")
          ? { ...responseData, ...responseData.data }
          : responseData;

        if (dataObj && (dataObj.conteoNL || dataObj.duplicados || dataObj.busquedaDocs || dataObj.ok || dataObj.status === "success")) {
          setResults(prev => ({
            conteoNL: dataObj.conteoNL || (processMode === "conteo" ? [] : prev?.conteoNL || []),
            duplicados: dataObj.duplicados || (processMode === "duplicados" ? [] : prev?.duplicados || []),
            busquedaDocs: dataObj.busquedaDocs || (processMode === "busqueda" ? [] : prev?.busquedaDocs || []),
            summaryMsg: dataObj.summaryMsg || `Módulo de ${processMode.toUpperCase()} procesado con éxito para Mes ${selectedMonth}.`
          }));
          setIsRealData(true);
          setActiveTabTable(processMode);
          setLoading(false);
          analysisAbortControllerRef.current = null;
          return;
        } else if (responseData && responseData.status === "error") {
          throw new Error(responseData.message || responseData.error || "Apps Script retornó una alerta de error.");
        } else {
          throw new Error("El Apps Script no retornó los datos esperados de Análisis NL.");
        }
      } catch (err: any) {
        analysisAbortControllerRef.current = null;
        if (err.message?.includes("cancelada") || err.message?.includes("detenida")) {
          setLoading(false);
          return;
        }
        console.warn("Real fetch failed or pending:", err);
        // Do NOT hide the progress bar on transient fetch errors; let polling handle completion
        return;
      }
    }

    // Fallback analytical simulation mode (only if no webAppUrl or demo)
    setTimeout(() => {
      setIsRealData(false);
      const mockConteo: NlConteoRow[] = [
        { nombre: "GARCIA LOPEZ SANTIAGO", documento: "1029384756", colegio: selectedSchools[0] || "IED Prado Veraniego", grupo: "GRUPO 101", asisUnica: "2026-05-10", totalAsis: 4 },
        { nombre: "MARTINEZ RUIZ VALENTINA", documento: "1098765432", colegio: selectedSchools[0] || "IED Prado Veraniego", grupo: "GRUPO 202", asisUnica: "2026-05-12", totalAsis: 2 },
        { nombre: "RODRIGUEZ SILVA MATEO", documento: "1012345678", colegio: selectedSchools[1] || selectedSchools[0] || "IED Republica de Colombia", grupo: "GRUPO 301", asisUnica: "2026-05-04", totalAsis: 6 },
        { nombre: "GOMEZ HERNANDEZ LUCIA", documento: "1055443322", colegio: selectedSchools[1] || selectedSchools[0] || "IED Republica de Colombia", grupo: "GRUPO 402", asisUnica: "2026-05-18", totalAsis: 1 },
        { nombre: "TORRES RAMIREZ SOFIA", documento: "1088776655", colegio: selectedSchools[2] || selectedSchools[0] || "IED Restrepo Millan", grupo: "GRUPO 501", asisUnica: "2026-05-22", totalAsis: 3 }
      ];

      const mockDuplicados: NlDuplicadoRow[] = [
        { colegio: selectedSchools[0] || "IED Prado Veraniego", nombre: "GARCIA LOPEZ SANTIAGO", documento: "1029384756", grupoActivo: "GRUPO 101", grupoNl: "GRUPO 102 (NL)" },
        { colegio: selectedSchools[1] || "IED Republica de Colombia", nombre: "RODRIGUEZ SILVA MATEO", documento: "1012345678", grupoActivo: "GRUPO 301", grupoNl: "GRUPO 303 (NL)" }
      ];

      const mockBusqueda: NlBusquedaRow[] = targetDocs.map((doc, idx) => ({
        documentoEncontrado: doc,
        nombre: `ESTUDIANTE CONSULTADO ${idx + 1}`,
        colegio: selectedSchools[idx % selectedSchools.length] || "IED General",
        grupo: `GRUPO ${100 + ((idx + 1) * 10)}`,
        asistenciasMes: Math.floor(Math.random() * 8) + 1
      }));

      if (mockBusqueda.length === 0) {
        mockBusqueda.push(
          { documentoEncontrado: "1029384756", nombre: "GARCIA LOPEZ SANTIAGO", colegio: selectedSchools[0] || "IED Prado Veraniego", grupo: "GRUPO 101", asistenciasMes: 4 },
          { documentoEncontrado: "1012345678", nombre: "RODRIGUEZ SILVA MATEO", colegio: selectedSchools[1] || "IED Republica de Colombia", grupo: "GRUPO 301", asistenciasMes: 6 }
        );
      }

      const processLabels = {
        conteo: `Niños a Lápiz (${mockConteo.length} detectados)`,
        duplicados: `Búsqueda de Duplicados (${mockDuplicados.length} duplicados)`,
        busqueda: `Búsqueda de Documentos (${mockBusqueda.length} encontrados)`
      };

      setResults({
        conteoNL: mockConteo,
        duplicados: mockDuplicados,
        busquedaDocs: mockBusqueda,
        summaryMsg: `[MODO SIMULACIÓN] Proceso finalizado: ${processLabels[processMode]}.`
      });
      setActiveTabTable(processMode);
      setLoading(false);
      analysisAbortControllerRef.current = null;
    }, 1200);
  };

  const currentSchoolList = availableSchools.length > 0 ? availableSchools : ["IED Prado Veraniego", "IED Republica de Colombia", "IED Restrepo Millan", "IED Gabriel Betancourt"];

  // Handle Export Excel
  const exportConteoExcel = () => {
    if (!results) return;
    const headers = ["NOMBRE", "DOCUMENTO", "COLEGIO", "GRUPO", "ASISTENCIA ÚNICA", "TOTAL ASISTENCIAS"];
    const keys = ["nombre", "documento", "colegio", "grupo", "asisUnica", "totalAsis"];
    exportToExcel(`Analisis_NL_Conteo_Mes_${selectedMonth}`, headers, results.conteoNL, keys, "Conteo NL");
  };

  const exportDuplicadosExcel = () => {
    if (!results) return;
    const headers = ["COLEGIO", "NOMBRE", "DOCUMENTO", "GRUPO ACTIVO", "GRUPO NL"];
    const keys = ["colegio", "nombre", "documento", "grupoActivo", "grupoNl"];
    exportToExcel(`Analisis_NL_Duplicados_Mes_${selectedMonth}`, headers, results.duplicados, keys, "Duplicados NL");
  };

  const exportBusquedaExcel = () => {
    if (!results) return;
    const headers = ["DOCUMENTO ENCONTRADO", "NOMBRE", "COLEGIO", "GRUPO", "ASISTENCIAS MES"];
    const keys = ["documentoEncontrado", "nombre", "colegio", "grupo", "asistenciasMes"];
    exportToExcel(`Analisis_Busqueda_Documentos_Mes_${selectedMonth}`, headers, results.busquedaDocs, keys, "Busqueda Documentos");
  };

  return (
    <div className="space-y-4">
      {/* Configuration Header Card */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs p-4">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-orange-100 text-orange-700 rounded-md">
              <FileSearch className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xs font-bold text-slate-900 tracking-tight uppercase">
                Módulo de Análisis NL, Duplicados y Búsqueda por Documento
              </h2>
              <p className="text-[10px] text-slate-500">
                Escaneo especializado de Niños a Lápiz, detección cruzada de matrículas en varios grupos y consulta rápida de asistencias.
              </p>
            </div>
          </div>
        </div>

        <div className="mb-4 bg-orange-50/70 border border-orange-200/80 p-3 rounded-lg">
          <label className="block text-[10px] font-bold text-orange-950 uppercase tracking-wider mb-2">
            Selecciona el Proceso Específico a Ejecutar (Un proceso a la vez):
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setProcessMode("conteo")}
              className={`p-2.5 rounded-md border text-left flex items-center gap-2 transition cursor-pointer ${
                processMode === "conteo"
                  ? "bg-white border-orange-500 ring-2 ring-orange-400/20 text-orange-950 font-bold shadow-xs"
                  : "bg-white/60 border-slate-200 text-slate-700 hover:bg-white"
              }`}
            >
              <div className={`p-1.5 rounded ${processMode === "conteo" ? "bg-orange-100 text-orange-700" : "bg-slate-100 text-slate-500"}`}>
                <FileSearch className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold leading-none">1. Detectar Niños a Lápiz</div>
                <div className="text-[9px] text-slate-500 mt-0.5">Conteo y registros a mano</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setProcessMode("duplicados")}
              className={`p-2.5 rounded-md border text-left flex items-center gap-2 transition cursor-pointer ${
                processMode === "duplicados"
                  ? "bg-white border-orange-500 ring-2 ring-orange-400/20 text-orange-950 font-bold shadow-xs"
                  : "bg-white/60 border-slate-200 text-slate-700 hover:bg-white"
              }`}
            >
              <div className={`p-1.5 rounded ${processMode === "duplicados" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500"}`}>
                <AlertCircle className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold leading-none">2. Buscar Duplicados</div>
                <div className="text-[9px] text-slate-500 mt-0.5">Cruce de matrículas en grupos</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setProcessMode("busqueda")}
              className={`p-2.5 rounded-md border text-left flex items-center gap-2 transition cursor-pointer ${
                processMode === "busqueda"
                  ? "bg-white border-orange-500 ring-2 ring-orange-400/20 text-orange-950 font-bold shadow-xs"
                  : "bg-white/60 border-slate-200 text-slate-700 hover:bg-white"
              }`}
            >
              <div className={`p-1.5 rounded ${processMode === "busqueda" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500"}`}>
                <Search className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold leading-none">3. Búsqueda Documentos</div>
                <div className="text-[9px] text-slate-500 mt-0.5">Consulta específica por número</div>
              </div>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 1. Seleccionar Mes */}
          <div className="bg-slate-50 p-3 rounded-md border border-slate-200">
            <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              1. Selecciona el Mes:
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-orange-500 cursor-pointer"
            >
              {months.map(m => (
                <option key={m.value} value={m.value}>{m.name}</option>
              ))}
            </select>
          </div>

          {/* 2. Seleccionar Colegios (Lista Desplegable) */}
          <div className="bg-slate-50 p-3 rounded-md border border-slate-200 relative">
            <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Building2 className="w-3 h-3 text-orange-600" />
                2. Colegios ({selectedSchools.length}/{currentSchoolList.length}):
              </span>
            </label>

            <button
              type="button"
              onClick={() => setShowSchoolDropdown(!showSchoolDropdown)}
              className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs text-left font-medium text-slate-800 flex items-center justify-between hover:bg-slate-100 transition cursor-pointer"
            >
              <span className="truncate">
                {selectedSchools.length === 0
                  ? "Ningún colegio seleccionado"
                  : selectedSchools.length === currentSchoolList.length
                  ? "Todos los colegios seleccionados"
                  : `${selectedSchools.length} colegio(s) seleccionado(s)`}
              </span>
              {showSchoolDropdown ? (
                <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
              )}
            </button>

            {showSchoolDropdown && (
              <div className="absolute left-0 top-full mt-1 w-full bg-white border border-slate-300 rounded-lg shadow-xl z-30 p-3 space-y-2">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-[10px] font-bold text-slate-600 uppercase">
                    Seleccionar Colegios:
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleSelectAllSchools(true)}
                      className="text-[10px] font-bold text-orange-600 hover:text-orange-800 hover:underline cursor-pointer"
                    >
                      Todos
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={() => handleSelectAllSchools(false)}
                      className="text-[10px] font-bold text-slate-500 hover:text-slate-700 hover:underline cursor-pointer"
                    >
                      Ninguno
                    </button>
                  </div>
                </div>

                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                  {currentSchoolList.length === 0 ? (
                    <div className="text-[11px] text-slate-400 p-2 italic text-center">
                      Cargando lista de colegios...
                    </div>
                  ) : (
                    currentSchoolList.map((col, idx) => {
                      const isChecked = selectedSchools.includes(col);
                      return (
                        <label
                          key={idx}
                          className={`flex items-center gap-2 p-1.5 rounded text-xs cursor-pointer transition ${
                            isChecked ? "bg-orange-50/80 text-orange-950 font-medium" : "hover:bg-slate-50 text-slate-700"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleSchool(col)}
                            className="rounded text-orange-600 focus:ring-orange-500 h-3.5 w-3.5 cursor-pointer"
                          />
                          <span className="truncate">{col}</span>
                        </label>
                      );
                    })
                  )}
                </div>

                <div className="pt-2 border-t border-slate-100 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setShowSchoolDropdown(false)}
                    className="px-2.5 py-1 bg-slate-900 text-white rounded text-[10px] font-bold cursor-pointer hover:bg-slate-800"
                  >
                    Cerrar Selector
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 3. Documentos a Buscar */}
          <div className="bg-slate-50 p-3 rounded-md border border-slate-200">
            <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              3. Documentos a Buscar (Requerido para Búsqueda):
            </label>
            <textarea
              value={targetDocsInput}
              onChange={(e) => setTargetDocsInput(e.target.value)}
              placeholder="Pega documentos aquí (uno por línea)..."
              rows={3}
              className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-[10px] font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-orange-500 resize-none"
            />
          </div>
        </div>

        {/* Progress Bar when running analysis */}
        {loading && (
          <div className="mt-4">
            <ProgressBar
              isLoading={loading}
              webAppUrl={webAppUrl}
              isDemoMode={isDemoMode}
              title={
                processMode === "conteo"
                  ? "Ejecutando Conteo de Niños a Lápiz..."
                  : processMode === "duplicados"
                  ? "Analizando Duplicados en Grupos..."
                  : processMode === "busqueda"
                  ? "Buscando Documentos en Planillas..."
                  : "Ejecutando Análisis NL Completo..."
              }
              statusText={`Procesando mes ${selectedMonth} para ${selectedSchools.length} colegio(s)...`}
              onStop={handleStopAnalysis}
              accentColor="orange"
            />
          </div>
        )}

        {/* Action Button */}
        <div className="mt-4 flex items-center justify-end border-t border-slate-100 pt-3">
          <div className="flex items-center gap-2">
            {loading && (
              <button
                type="button"
                onClick={handleStopAnalysis}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-md text-xs font-bold transition duration-150 cursor-pointer shadow-xs"
              >
                <X className="w-4 h-4 text-red-600" />
                Detener Análisis
              </button>
            )}

            <button
              onClick={executeAnalysis}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-bold rounded-md text-xs shadow-xs transition duration-150 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Procesando {processMode.toUpperCase()}...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  Ejecutar Proceso ({processMode === "conteo" ? "Niños a Lápiz" : processMode === "duplicados" ? "Duplicados" : "Búsqueda"})
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Results View */}
      {results && (
        <div className="space-y-4">
          {/* Summary Banner */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-[11px] text-emerald-900 font-semibold flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div className="whitespace-pre-line leading-relaxed">
              {results.summaryMsg}
            </div>
          </div>

          {/* Table Selector Tabs */}
          <div className="flex items-center justify-between border-b border-slate-200 bg-white px-3 py-1.5 rounded-t-lg">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTabTable("conteo")}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition cursor-pointer flex items-center gap-1.5 ${
                  activeTabTable === "conteo"
                    ? "bg-[#e65100] text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                Niños a Lápiz (NL) ({results.conteoNL.length})
              </button>

              <button
                onClick={() => setActiveTabTable("duplicados")}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition cursor-pointer flex items-center gap-1.5 ${
                  activeTabTable === "duplicados"
                    ? "bg-[#cc4125] text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                Duplicados Cruzados ({results.duplicados.length})
              </button>

              <button
                onClick={() => setActiveTabTable("busqueda")}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition cursor-pointer flex items-center gap-1.5 ${
                  activeTabTable === "busqueda"
                    ? "bg-[#1155cc] text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <FileSearch className="w-3.5 h-3.5" />
                Búsqueda Documentos ({results.busquedaDocs.length})
              </button>
            </div>

            {/* Export Excel Button */}
            <div>
              {activeTabTable === "conteo" && (
                <button
                  onClick={exportConteoExcel}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-[11px] font-bold transition cursor-pointer shadow-xs"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  Exportar Excel NL (.xlsx)
                </button>
              )}
              {activeTabTable === "duplicados" && (
                <button
                  onClick={exportDuplicadosExcel}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-[11px] font-bold transition cursor-pointer shadow-xs"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  Exportar Excel Duplicados (.xlsx)
                </button>
              )}
              {activeTabTable === "busqueda" && (
                <button
                  onClick={exportBusquedaExcel}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-[11px] font-bold transition cursor-pointer shadow-xs"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  Exportar Excel Búsqueda (.xlsx)
                </button>
              )}
            </div>
          </div>

          {/* Table 1: Conteo NL */}
          {activeTabTable === "conteo" && (
            <div className="bg-white rounded-b-lg border border-slate-200 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#e65100] text-white text-[10px] uppercase tracking-wider font-bold">
                      <th className="py-2 px-3 border-b border-orange-700">Nombre</th>
                      <th className="py-2 px-3 border-b border-orange-700">Documento</th>
                      <th className="py-2 px-3 border-b border-orange-700">Colegio</th>
                      <th className="py-2 px-3 border-b border-orange-700">Grupo</th>
                      <th className="py-2 px-3 border-b border-orange-700">Asistencia Única</th>
                      <th className="py-2 px-3 border-b border-orange-700 text-center">Total Asistencias</th>
                      <th className="py-2 px-3 border-b border-orange-700 text-center">Corregir Error</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-[11px] text-slate-800 font-medium">
                    {results.conteoNL.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-6 text-center text-slate-400 italic">
                          No se encontraron registros de Niños a Lápiz.
                        </td>
                      </tr>
                    ) : (
                      results.conteoNL.map((row, idx) => (
                        <tr key={idx} className="hover:bg-orange-50/40 transition">
                          <td className="py-2 px-3 font-semibold text-slate-900">{row.nombre}</td>
                          <td className="py-2 px-3 font-mono text-[10px]">{row.documento}</td>
                          <td className="py-2 px-3">{row.colegio}</td>
                          <td className="py-2 px-3 font-semibold text-slate-700">{row.grupo}</td>
                          <td className="py-2 px-3 text-slate-500">{row.asisUnica || "N/A"}</td>
                          <td className="py-2 px-3 text-center font-bold text-orange-700 bg-orange-50/50">
                            {row.totalAsis}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <a
                              href={row.fileUrl || (rootFolderId ? `https://drive.google.com/drive/folders/${rootFolderId}` : `https://drive.google.com/drive/search?q=${encodeURIComponent(row.colegio + " " + row.grupo)}`)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[10px] font-bold text-orange-800 hover:text-orange-950 bg-orange-100 hover:bg-orange-200 border border-orange-300 px-2 py-0.5 rounded transition shadow-2xs whitespace-nowrap"
                              title="Abrir hoja de cálculo para corregir"
                            >
                              <ExternalLink className="w-3 h-3" />
                              Ir a Hoja
                            </a>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Table 2: Duplicados Cruzados */}
          {activeTabTable === "duplicados" && (
            <div className="bg-white rounded-b-lg border border-slate-200 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#cc4125] text-white text-[10px] uppercase tracking-wider font-bold">
                      <th className="py-2 px-3 border-b border-red-800">Colegio</th>
                      <th className="py-2 px-3 border-b border-red-800">Nombre</th>
                      <th className="py-2 px-3 border-b border-red-800">Documento</th>
                      <th className="py-2 px-3 border-b border-red-800">Grupo Activo</th>
                      <th className="py-2 px-3 border-b border-red-800">Grupo NL</th>
                      <th className="py-2 px-3 border-b border-red-800 text-center">Corregir Error</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-[11px] text-slate-800 font-medium">
                    {results.duplicados.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-slate-400 italic">
                          No se detectaron duplicados cruzados entre grupos.
                        </td>
                      </tr>
                    ) : (
                      results.duplicados.map((row, idx) => (
                        <tr key={idx} className="hover:bg-red-50/40 transition">
                          <td className="py-2 px-3 font-semibold">{row.colegio}</td>
                          <td className="py-2 px-3 font-bold text-slate-900">{row.nombre}</td>
                          <td className="py-2 px-3 font-mono text-[10px]">{row.documento}</td>
                          <td className="py-2 px-3 text-emerald-700 font-semibold">{row.grupoActivo}</td>
                          <td className="py-2 px-3 text-red-700 font-semibold">{row.grupoNl}</td>
                          <td className="py-2 px-3 text-center">
                            <a
                              href={row.fileUrl || (rootFolderId ? `https://drive.google.com/drive/folders/${rootFolderId}` : `https://drive.google.com/drive/search?q=${encodeURIComponent(row.colegio + " " + row.grupoNl)}`)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[10px] font-bold text-red-800 hover:text-red-950 bg-red-100 hover:bg-red-200 border border-red-300 px-2 py-0.5 rounded transition shadow-2xs whitespace-nowrap"
                              title="Abrir hoja de cálculo para corregir duplicado"
                            >
                              <ExternalLink className="w-3 h-3" />
                              Ir a Hoja
                            </a>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Table 3: Búsqueda por Documento */}
          {activeTabTable === "busqueda" && (
            <div className="bg-white rounded-b-lg border border-slate-200 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#1155cc] text-white text-[10px] uppercase tracking-wider font-bold">
                      <th className="py-2 px-3 border-b border-blue-800">Documento Encontrado</th>
                      <th className="py-2 px-3 border-b border-blue-800">Nombre</th>
                      <th className="py-2 px-3 border-b border-blue-800">Colegio</th>
                      <th className="py-2 px-3 border-b border-blue-800">Grupo</th>
                      <th className="py-2 px-3 border-b border-blue-800 text-center">Asistencias Mes</th>
                      <th className="py-2 px-3 border-b border-blue-800 text-center">Corregir Error</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-[11px] text-slate-800 font-medium">
                    {results.busquedaDocs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-slate-400 italic">
                          No se encontraron asistencias para los documentos solicitados.
                        </td>
                      </tr>
                    ) : (
                      results.busquedaDocs.map((row, idx) => (
                        <tr key={idx} className="hover:bg-blue-50/40 transition">
                          <td className="py-2 px-3 font-mono font-bold text-blue-900">{row.documentoEncontrado}</td>
                          <td className="py-2 px-3 font-semibold text-slate-900">{row.nombre}</td>
                          <td className="py-2 px-3">{row.colegio}</td>
                          <td className="py-2 px-3 font-semibold text-slate-700">{row.grupo}</td>
                          <td className="py-2 px-3 text-center font-bold text-blue-800 bg-blue-50/50">
                            {row.asistenciasMes}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <a
                              href={row.fileUrl || (rootFolderId ? `https://drive.google.com/drive/folders/${rootFolderId}` : `https://drive.google.com/drive/search?q=${encodeURIComponent(row.colegio + " " + row.grupo)}`)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-800 hover:text-blue-950 bg-blue-100 hover:bg-blue-200 border border-blue-300 px-2 py-0.5 rounded transition shadow-2xs whitespace-nowrap"
                              title="Abrir hoja de cálculo para verificar"
                            >
                              <ExternalLink className="w-3 h-3" />
                              Ir a Hoja
                            </a>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
