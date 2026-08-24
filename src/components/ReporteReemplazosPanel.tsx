import React, { useState, useRef, useMemo } from "react";
import { 
  UserCheck, 
  Search, 
  Download, 
  AlertCircle, 
  CheckCircle2, 
  Building2, 
  Calendar, 
  X,
  ChevronDown,
  ChevronUp,
  XCircle,
  FileSpreadsheet,
  Users
} from "lucide-react";
import { ReemplazoRow } from "../types";
import { MONTHS, exportToExcel } from "../utils";
import { fetchReemplazosInBatches } from "../services/apiService";
import ProgressBar from "./ProgressBar";

interface ReporteReemplazosPanelProps {
  webAppUrl: string;
  isDemoMode: boolean;
  availableSchools: string[];
  initialMonth?: string;
  initialSchools?: string[];
  rootFolderId?: string;
}

export default function ReporteReemplazosPanel({
  webAppUrl,
  isDemoMode,
  availableSchools,
  initialMonth = "05",
  initialSchools = [],
  rootFolderId
}: ReporteReemplazosPanelProps) {
  const [selectedMonth, setSelectedMonth] = useState<string>(initialMonth);
  const [selectedSchools, setSelectedSchools] = useState<string[]>(
    initialSchools.length > 0 ? initialSchools : availableSchools
  );
  const [showSchoolDropdown, setShowSchoolDropdown] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [reemplazos, setReemplazos] = useState<ReemplazoRow[]>([]);
  const [summaryMsg, setSummaryMsg] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [hasSearched, setHasSearched] = useState<boolean>(false);
  const [batchStatusText, setBatchStatusText] = useState<string>("");

  const abortControllerRef = useRef<AbortController | null>(null);

  // Sync initial schools when availableSchools loads if none selected
  React.useEffect(() => {
    if (selectedSchools.length === 0 && availableSchools.length > 0) {
      setSelectedSchools(availableSchools);
    }
  }, [availableSchools]);

  const handleSelectAllSchools = () => {
    setSelectedSchools([...availableSchools]);
  };

  const handleDeselectAllSchools = () => {
    setSelectedSchools([]);
  };

  const handleToggleSchool = (school: string) => {
    if (selectedSchools.includes(school)) {
      setSelectedSchools(selectedSchools.filter(s => s !== school));
    } else {
      setSelectedSchools([...selectedSchools, school]);
    }
  };

  const handleSearch = async () => {
    if (selectedSchools.length === 0) {
      setErrorMessage("Por favor selecciona al menos un colegio para realizar la búsqueda.");
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    setSummaryMsg(null);
    setHasSearched(true);
    setBatchStatusText("");

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    // Demo Mode or No WebApp URL Fallback
    if (isDemoMode || !webAppUrl || !webAppUrl.startsWith("https://script.google.com/")) {
      setTimeout(() => {
        const mockData: ReemplazoRow[] = [];
        const teachers = [
          { name: "Sonia Patricia Bernal", cc: "1018475892" },
          { name: "Diego Fernando Moreno", cc: "80492104" },
          { name: "Luz Angela Cárdenas", cc: "52891043" },
          { name: "Carlos Eduardo Gutierrez", cc: "1020481923" },
          { name: "Jhoana Andrea Ruiz", cc: "53019284" }
        ];

        selectedSchools.forEach((school) => {
          const count = Math.floor(Math.random() * 3) + 1;
          for (let i = 0; i < count; i++) {
            const t = teachers[Math.floor(Math.random() * teachers.length)];
            const day = Math.floor(Math.random() * 20) + 1;
            mockData.push({
              fecha: `${day.toString().padStart(2, "0")}/${selectedMonth}/2026`,
              colegio: school,
              grupo: `Grupo ${Math.floor(Math.random() * 5) + 1}0${Math.floor(Math.random() * 2) + 1}`,
              docente: t.name,
              cc: t.cc,
              observacion: i % 2 === 0
                ? "Novedad por incapacidad médica de docente titular. Presenta reemplazo certificado con planilla de asistencia."
                : "Cambio temporal de docente por permiso institucional de capacitación JEC."
            });
          }
        });

        setReemplazos(mockData);
        setSummaryMsg(`Búsqueda de reemplazos completada en modo simulación: ${mockData.length} registro(s) encontrado(s).`);
        setLoading(false);
      }, 1500);
      return;
    }

    try {
      const list = await fetchReemplazosInBatches(
        webAppUrl,
        {
          mes: selectedMonth,
          colegios: selectedSchools,
          folderId: rootFolderId || "",
          batchSize: 3,
          signal: abortController.signal,
          onBatchProgress: (progress, partialList) => {
            setBatchStatusText(progress.message);
            setReemplazos([...partialList]);
          }
        }
      );

      setReemplazos(list);
      setSummaryMsg(`Se encontraron ${list.length} registro(s) de reemplazos.`);
      setLoading(false);
    } catch (err: any) {
      abortControllerRef.current = null;
      if (err.message?.includes("cancelada") || err.message?.includes("detenida")) {
        setLoading(false);
        return;
      }
      console.error("Error fetching reemplazos:", err);
      setErrorMessage(`Error al obtener reemplazos desde Apps Script: "${err.message}".`);
      setLoading(false);
    }
  };

  const handleStopSearch = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setLoading(false);
  };

  // Filtered dataset
  const filteredReemplazos = useMemo(() => {
    if (!searchQuery.trim()) return reemplazos;
    const q = searchQuery.toLowerCase();
    return reemplazos.filter(
      r =>
        (r.fecha || "").toLowerCase().includes(q) ||
        (r.colegio || "").toLowerCase().includes(q) ||
        (r.grupo || "").toLowerCase().includes(q) ||
        (r.docente || "").toLowerCase().includes(q) ||
        (r.cc || "").toLowerCase().includes(q) ||
        (r.observacion || "").toLowerCase().includes(q)
    );
  }, [reemplazos, searchQuery]);

  // Export to Excel
  const handleExport = () => {
    exportToExcel(
      `Reporte_Reemplazos_Mes_${selectedMonth}`,
      ["FECHA", "COLEGIO", "GRUPO", "DOCENTE", "CC", "OBSERVACIÓN"],
      filteredReemplazos,
      ["fecha", "colegio", "grupo", "docente", "cc", "observacion"],
      "Reemplazos"
    );
  };

  return (
    <div className="space-y-4 font-sans text-slate-800">
      {/* Top Configuration & Control Panel */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-2xs p-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-indigo-50 border border-indigo-100 rounded text-indigo-700">
              <UserCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Reporte de Reemplazos Docentes
              </h2>
              <p className="text-[11px] text-slate-500">
                Consulta y audita la lista de reemplazos reportados en planillas por mes y colegio.
              </p>
            </div>
          </div>
        </div>

        {/* Inputs Panel: Month & Colegios Checklist */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          {/* 1. Selector de Mes */}
          <div className="md:col-span-3">
            <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-indigo-600" />
              Mes de Consulta:
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white cursor-pointer"
            >
              {MONTHS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Selector Múltiple de Colegios */}
          <div className="md:col-span-6 relative">
            <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Building2 className="w-3 h-3 text-indigo-600" />
                Colegios ({selectedSchools.length} de {availableSchools.length}):
              </span>
            </label>

            {/* Dropdown Toggle Trigger */}
            <button
              type="button"
              onClick={() => setShowSchoolDropdown(!showSchoolDropdown)}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded text-xs text-left font-medium text-slate-800 flex items-center justify-between hover:bg-slate-100 transition cursor-pointer"
            >
              <span className="truncate">
                {selectedSchools.length === 0
                  ? "Ningún colegio seleccionado"
                  : selectedSchools.length === availableSchools.length
                  ? "Todos los colegios seleccionados"
                  : `${selectedSchools.length} colegio(s) seleccionado(s)`}
              </span>
              {showSchoolDropdown ? (
                <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
              )}
            </button>

            {/* School Selector Popup Menu */}
            {showSchoolDropdown && (
              <div className="absolute left-0 top-full mt-1 w-full bg-white border border-slate-300 rounded-lg shadow-xl z-30 p-3 space-y-2">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-[10px] font-bold text-slate-600 uppercase">
                    Seleccionar Colegios:
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSelectAllSchools}
                      className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer"
                    >
                      Todos
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={handleDeselectAllSchools}
                      className="text-[10px] font-bold text-slate-500 hover:text-slate-700 hover:underline cursor-pointer"
                    >
                      Ninguno
                    </button>
                  </div>
                </div>

                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                  {availableSchools.map((school) => {
                    const isChecked = selectedSchools.includes(school);
                    return (
                      <label
                        key={school}
                        className={`flex items-center gap-2 p-1.5 rounded text-xs cursor-pointer transition ${
                          isChecked ? "bg-indigo-50/80 text-indigo-950 font-medium" : "hover:bg-slate-50 text-slate-700"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleSchool(school)}
                          className="rounded text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5 cursor-pointer"
                        />
                        <span className="truncate">{school}</span>
                      </label>
                    );
                  })}
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

          {/* 3. Botón Principal: Buscar Reemplazos */}
          <div className="md:col-span-3">
            <button
              type="button"
              onClick={handleSearch}
              disabled={loading}
              className="w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded shadow-xs transition duration-150 flex items-center justify-center gap-2 cursor-pointer"
            >
              <UserCheck className="w-4 h-4" />
              <span>Buscar Reemplazos</span>
            </button>
          </div>
        </div>

        {/* Selected School Chips Badges */}
        <div className="mt-3 flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100">
          <span className="text-[10px] font-semibold text-slate-400">Colegios elegidos:</span>
          {selectedSchools.length === 0 ? (
            <span className="text-[10px] font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
              Debes marcar al menos un colegio
            </span>
          ) : (
            selectedSchools.slice(0, 4).map((s) => (
              <span
                key={s}
                className="inline-flex items-center gap-1 text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium border border-slate-200"
              >
                {s}
              </span>
            ))
          )}
          {selectedSchools.length > 4 && (
            <span className="text-[10px] bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded border border-indigo-200">
              +{selectedSchools.length - 4} más
            </span>
          )}
        </div>
      </div>

      {/* Progress Bar Component */}
      {loading && (
        <ProgressBar
          isLoading={loading}
          webAppUrl={webAppUrl}
          isDemoMode={isDemoMode}
          title="Buscando Registro de Reemplazos..."
          statusText={batchStatusText || `Escaneando planillas de Mes ${selectedMonth} para ${selectedSchools.length} colegio(s)...`}
          onStop={handleStopSearch}
          accentColor="indigo"
        />
      )}

      {/* Error Alert */}
      {errorMessage && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs flex items-start gap-2 shadow-2xs">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Summary Message Success Banner */}
      {summaryMsg && !loading && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{summaryMsg}</span>
          </div>
          <span className="text-[10px] bg-emerald-100 text-emerald-900 font-bold px-2 py-0.5 rounded border border-emerald-300">
            {reemplazos.length} Reemplazo(s)
          </span>
        </div>
      )}

      {/* Results Table Section */}
      {hasSearched && !loading && (
        <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
          {/* Table Toolbar */}
          <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Reemplazos Encontrados ({filteredReemplazos.length})
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Search filter input */}
              <div className="relative w-48 sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar en la tabla..."
                  className="w-full pl-8 pr-3 py-1 bg-white border border-slate-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Excel Export Button */}
              <button
                type="button"
                onClick={handleExport}
                disabled={filteredReemplazos.length === 0}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded text-xs font-bold transition cursor-pointer shadow-2xs"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Exportar Excel</span>
              </button>
            </div>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto max-h-[600px]">
            <table className="w-full text-left border-collapse font-sans text-xs">
              <thead className="bg-slate-900 text-slate-100 sticky top-0 z-10 uppercase text-[10px] tracking-wider font-bold">
                <tr>
                  <th className="px-3 py-2.5 border-b border-slate-800 w-28">FECHA</th>
                  <th className="px-3 py-2.5 border-b border-slate-800 min-w-[180px]">COLEGIO</th>
                  <th className="px-3 py-2.5 border-b border-slate-800 w-28">GRUPO</th>
                  <th className="px-3 py-2.5 border-b border-slate-800 min-w-[200px]">DOCENTE</th>
                  <th className="px-3 py-2.5 border-b border-slate-800 w-32">CC</th>
                  <th className="px-3 py-2.5 border-b border-slate-800 min-w-[320px] max-w-xl">OBSERVACIÓN</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredReemplazos.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                      <div className="flex flex-col items-center justify-center gap-1.5">
                        <Users className="w-8 h-8 text-slate-300" />
                        <span className="font-semibold text-xs">No se encontraron registros de reemplazos.</span>
                        <span className="text-[11px] text-slate-400">Prueba cambiando el mes o seleccionando más colegios.</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredReemplazos.map((row, idx) => (
                    <tr
                      key={idx}
                      className={`hover:bg-indigo-50/40 transition ${
                        idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"
                      }`}
                    >
                      <td className="px-3 py-2 font-mono text-[11px] font-semibold text-slate-700 whitespace-nowrap">
                        {row.fecha || "-"}
                      </td>
                      <td className="px-3 py-2 font-medium text-slate-900">
                        {row.colegio || "-"}
                      </td>
                      <td className="px-3 py-2 text-slate-700 font-semibold whitespace-nowrap">
                        {row.grupo || "-"}
                      </td>
                      <td className="px-3 py-2 font-semibold text-indigo-950">
                        {row.docente || "-"}
                      </td>
                      <td className="px-3 py-2 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                        {row.cc || "-"}
                      </td>
                      <td className="px-3 py-2 text-slate-700 whitespace-normal break-words leading-relaxed min-w-[320px] max-w-xl">
                        {row.observacion || "-"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="p-2.5 bg-slate-50 border-t border-slate-200 text-[10px] text-slate-500 flex justify-between items-center">
            <span>
              Mostrando {filteredReemplazos.length} de {reemplazos.length} registro(s) de reemplazos.
            </span>
            <span className="font-medium text-slate-400">
              Filtro: Mes {selectedMonth}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
