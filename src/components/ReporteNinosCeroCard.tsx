import React, { useState, useRef, useEffect } from "react";
import { 
  UserX, 
  Calendar, 
  Building2, 
  ChevronDown, 
  ChevronUp, 
  Search, 
  Download, 
  AlertCircle, 
  X,
  FileSearch,
  Sparkles,
  CheckCircle2,
  Users
} from "lucide-react";
import { MONTHS } from "../utils";
import { fetchNinosCeroInBatches } from "../services/apiService";
import ProgressBar from "./ProgressBar";

interface ReporteNinosCeroCardProps {
  webAppUrl: string;
  isDemoMode: boolean;
  availableSchools: string[];
  initialMonth?: string;
  rootFolderId?: string;
}

export default function ReporteNinosCeroCard({
  webAppUrl,
  isDemoMode,
  availableSchools,
  initialMonth = "07",
  rootFolderId
}: ReporteNinosCeroCardProps) {
  const currentMonthStr = (new Date().getMonth() + 1).toString().padStart(2, "0");
  const [selectedMonth, setSelectedMonth] = useState<string>(initialMonth || currentMonthStr);
  const [selectedSchools, setSelectedSchools] = useState<string[]>(availableSchools);
  const [showSchoolDropdown, setShowSchoolDropdown] = useState<boolean>(false);
  
  // Estados requeridos
  const [ninosData, setNinosData] = useState<any[] | null>(null);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [isLoadingCeros, setIsLoadingCeros] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [batchStatusText, setBatchStatusText] = useState<string>("");

  const abortControllerRef = useRef<AbortController | null>(null);

  // Sincronizar colegios disponibles
  useEffect(() => {
    if (availableSchools.length > 0 && selectedSchools.length === 0) {
      setSelectedSchools([...availableSchools]);
    }
  }, [availableSchools]);

  const handleSelectAllSchools = () => {
    setSelectedSchools([...availableSchools]);
  };

  const handleSelectNoneSchools = () => {
    setSelectedSchools([]);
  };

  const handleToggleSchool = (school: string) => {
    setSelectedSchools(prev => 
      prev.includes(school) ? prev.filter(s => s !== school) : [...prev, school]
    );
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoadingCeros(false);
    setErrorMessage("Proceso de Reporte de Ceros detenido por el usuario.");
    setBatchStatusText("");
  };

  const handleGenerarReporte = async () => {
    if (selectedSchools.length === 0) {
      setErrorMessage("Por favor selecciona al menos un colegio.");
      return;
    }

    // Extracción estricta del código numérico de 2 dígitos del mes
    const mesLimpio = selectedMonth.match(/\d{2}/) ? selectedMonth.match(/\d{2}/)![0] : "07";

    setErrorMessage(null);
    setNinosData(null); // Limpia los datos al iniciar
    setTotalCount(null);
    setIsLoadingCeros(true);
    setBatchStatusText("");

    if (!isDemoMode && webAppUrl && webAppUrl.trim().length > 0) {
      abortControllerRef.current = new AbortController();
      try {
        const { list, totalCount: count } = await fetchNinosCeroInBatches(
          webAppUrl,
          {
            mes: mesLimpio,
            colegios: selectedSchools,
            folderId: rootFolderId || "",
            batchSize: 3,
            signal: abortControllerRef.current.signal,
            onBatchProgress: (progress, partialList) => {
              setBatchStatusText(progress.message);
              setNinosData([...partialList]);
              setTotalCount(partialList.length);
            }
          }
        );

        setNinosData(list);
        setTotalCount(count);
        setIsLoadingCeros(false);
        abortControllerRef.current = null;
        return;
      } catch (err: any) {
        abortControllerRef.current = null;
        if (err.message?.includes("cancelada") || err.message?.includes("detenida")) {
          setIsLoadingCeros(false);
          return;
        }
        console.warn("Error al obtener niños cero:", err);
        setErrorMessage(`Error al consultar Niños Cero: ${err.message}`);
        setIsLoadingCeros(false);
        return;
      }
    }

    // Modo simulación Demo o cuando no hay WebApp URL
    setTimeout(() => {
      const mockFirstNames = ["Santiago", "Valeria", "Alejandro", "Mariana", "Mateo", "Sofía", "Juan Pablo", "Camila", "Andrés", "Gabriela"];
      const mockLastNames = ["Rodríguez", "Gómez", "Martínez", "López", "González", "Pérez", "Sánchez", "Ramírez", "Díaz", "Castro"];
      const mockGroups = ["101", "102", "201", "301", "401", "502"];

      const generatedList: any[] = [];
      const countToGenerate = Math.floor(Math.random() * 8) + 4; // 4 to 11 registros

      for (let i = 0; i < countToGenerate; i++) {
        const school = selectedSchools[i % selectedSchools.length] || "Colegio Principal";
        const firstName = mockFirstNames[Math.floor(Math.random() * mockFirstNames.length)];
        const lastName = mockLastNames[Math.floor(Math.random() * mockLastNames.length)];
        const doc = (Math.floor(Math.random() * 900000000) + 1000000000).toString();
        const group = mockGroups[Math.floor(Math.random() * mockGroups.length)];

        generatedList.push({
          "DOCUMENTO": doc,
          "NOMBRE DEL BENEFICIARIO": `${firstName} ${lastName}`,
          "COLEGIO": school,
          "GRUPO": group
        });
      }

      setNinosData(generatedList);
      setTotalCount(generatedList.length);
      setIsLoadingCeros(false);
    }, 1500);
  };

  /**
   * Generación y descarga directa de CSV en memoria
   * - Encabezados basados en Object.keys()
   * - Separador ';' para compatibilidad perfecta con Microsoft Excel
   * - BOM UTF-8 (\uFEFF) para preservar tildes y caracteres especiales como 'Ñ'
   */
  const descargarCSV = () => {
    if (!ninosData || ninosData.length === 0) return;

    // 1. Extraer encabezados del primer elemento
    const headers = Object.keys(ninosData[0]);

    // 2. Construir filas usando ';' como separador
    const escapeCsvValue = (val: any) => {
      if (val === null || val === undefined) return "";
      const str = String(val).replace(/"/g, '""');
      if (str.includes(";") || str.includes("\n") || str.includes("\r") || str.includes('"')) {
        return `"${str}"`;
      }
      return str;
    };

    const headerLine = headers.map(escapeCsvValue).join(";");
    const dataLines = ninosData.map(row => 
      headers.map(header => escapeCsvValue(row[header])).join(";")
    );

    const csvContent = [headerLine, ...dataLines].join("\r\n");

    // 3. Crear Blob con BOM UTF-8
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });

    // 4. Crear enlace en memoria y forzar descarga
    const mesLimpio = selectedMonth.match(/\d{2}/) ? selectedMonth.match(/\d{2}/)![0] : "07";
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Reporte_Ninos_Cero_Mes_${mesLimpio}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Filtrado para la vista previa de la tabla
  const filteredData = (ninosData || []).filter(item => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return Object.values(item).some(val => 
      String(val || "").toLowerCase().includes(term)
    );
  });

  return (
    <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5 space-y-4">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-amber-50 border border-amber-200 text-amber-700 rounded-lg shrink-0">
            <UserX className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">Reporte de Niños Cero</h3>
            <p className="text-[11px] text-slate-500 font-medium">
              Identifica estudiantes sin asistencia durante las quincenas
            </p>
          </div>
        </div>

        {isDemoMode && (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 self-start sm:self-auto">
            <Sparkles className="w-3 h-3 text-indigo-600" />
            Modo Demo
          </span>
        )}
      </div>

      {/* Banner de Errores */}
      {errorMessage && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-lg text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button 
            onClick={() => setErrorMessage(null)} 
            className="p-1 hover:bg-red-100 text-red-600 rounded-md cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Controles e Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
        {/* Selector de Mes */}
        <div className="md:col-span-3 space-y-1">
          <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-amber-600" />
            Mes a Consultar
          </label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            disabled={isLoadingCeros}
            className="w-full bg-slate-50 border border-slate-300 hover:border-slate-400 focus:bg-white text-slate-800 text-xs font-semibold rounded-lg px-3 py-2 cursor-pointer transition focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 disabled:opacity-50"
          >
            {MONTHS.map(m => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        {/* Selector Multi-Colegio */}
        <div className="md:col-span-5 space-y-1 relative">
          <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-amber-600" />
            Colegios ({selectedSchools.length}/{availableSchools.length})
          </label>
          <button
            type="button"
            onClick={() => setShowSchoolDropdown(!showSchoolDropdown)}
            disabled={isLoadingCeros}
            className="w-full bg-slate-50 border border-slate-300 hover:border-slate-400 focus:bg-white text-slate-800 text-xs font-medium rounded-lg px-3 py-2 flex items-center justify-between gap-2 cursor-pointer transition focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 disabled:opacity-50"
          >
            <span className="truncate">
              {selectedSchools.length === 0
                ? "Ningún colegio seleccionado"
                : selectedSchools.length === availableSchools.length
                ? "Todos los colegios elegidos"
                : `${selectedSchools.length} colegio(s) seleccionados`}
            </span>
            {showSchoolDropdown ? <ChevronUp className="w-4 h-4 text-slate-500 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />}
          </button>

          {/* Menú desplegable de Colegios */}
          {showSchoolDropdown && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-30 p-2 space-y-2 max-h-60 overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-100 pb-1 px-1">
                <button
                  type="button"
                  onClick={handleSelectAllSchools}
                  className="text-[10px] font-bold text-amber-600 hover:text-amber-800 cursor-pointer"
                >
                  Seleccionar Todos
                </button>
                <button
                  type="button"
                  onClick={handleSelectNoneSchools}
                  className="text-[10px] font-bold text-slate-500 hover:text-slate-700 cursor-pointer"
                >
                  Desmarcar Todos
                </button>
              </div>
              <div className="space-y-1">
                {availableSchools.map(school => {
                  const isChecked = selectedSchools.includes(school);
                  return (
                    <label
                      key={school}
                      className="flex items-center gap-2 p-1.5 hover:bg-slate-50 rounded text-xs text-slate-700 cursor-pointer transition"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleSchool(school)}
                        className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                      />
                      <span className="truncate">{school}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Botón Principal Generar Reporte */}
        <div className="md:col-span-4">
          <button
            type="button"
            onClick={handleGenerarReporte}
            disabled={isLoadingCeros || selectedSchools.length === 0}
            className="w-full bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white text-xs font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2 shadow-xs cursor-pointer transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <UserX className="w-4 h-4" />
            <span>Generar Reporte de Ceros</span>
          </button>
        </div>
      </div>

      {/* Barra de Progreso durante Carga */}
      {isLoadingCeros && (
        <div className="pt-2">
          <ProgressBar
            isLoading={isLoadingCeros}
            webAppUrl={webAppUrl}
            isDemoMode={isDemoMode}
            title="Generando Reporte de Niños Cero..."
            statusText={batchStatusText || `Consultando estudiantes sin asistencia para Mes ${selectedMonth} (${selectedSchools.length} colegios)...`}
            onStop={handleStop}
            accentColor="amber"
          />
        </div>
      )}

      {/* UI Condicional posterior a la consulta */}
      {ninosData !== null && !isLoadingCeros && (
        <div className="pt-3 border-t border-slate-100 space-y-4">
          {ninosData.length === 0 ? (
            /* Mensaje cuando el count es 0 */
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-6 text-center space-y-2">
              <FileSearch className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-xs font-semibold text-slate-700">
                No se encontraron registros para este filtro.
              </p>
              <p className="text-[11px] text-slate-500">
                Se procesaron 0 niños sin asistencia para el mes y colegios seleccionados.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Mensaje amigable y Botón verde de Descarga Excel (CSV) */}
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-100 border border-emerald-300 text-emerald-800 rounded-lg shrink-0">
                    <CheckCircle2 className="w-5 h-5 text-emerald-700" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                      <span>Reporte generado exitosamente</span>
                      <span className="bg-emerald-200/80 text-emerald-900 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {totalCount ?? ninosData.length} niños procesados
                      </span>
                    </h4>
                    <p className="text-[11px] text-emerald-800 font-medium mt-0.5">
                      Se han identificado {totalCount ?? ninosData.length} estudiantes sin asistencia en el período seleccionado.
                    </p>
                  </div>
                </div>

                {/* Gran Botón Verde de Descarga CSV */}
                <button
                  type="button"
                  onClick={descargarCSV}
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-lg text-xs font-bold transition shadow-sm hover:shadow-md cursor-pointer shrink-0"
                >
                  <Download className="w-4 h-4" />
                  <span>📥 Descargar Archivo Excel (CSV)</span>
                </button>
              </div>

              {/* Vista previa de la tabla */}
              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                  <div className="flex items-center gap-1.5 text-xs text-slate-700 font-bold">
                    <Users className="w-3.5 h-3.5 text-slate-500" />
                    <span>Vista Previa de Registros ({filteredData.length} de {ninosData.length})</span>
                  </div>

                  {/* Búsqueda en Vivo */}
                  <div className="relative w-full sm:w-64">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Buscar por documento, nombre..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 text-xs text-slate-800 pl-8 pr-3 py-1.5 rounded-md focus:outline-hidden focus:ring-2 focus:ring-amber-500/20"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-lg shadow-2xs bg-white max-h-96 overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="sticky top-0 z-10 bg-slate-100 text-slate-700 border-b border-slate-200 font-bold text-[11px] uppercase tracking-wider">
                      <tr>
                        <th className="py-2.5 px-3">#</th>
                        {Object.keys(ninosData[0]).map((colKey) => (
                          <th key={colKey} className="py-2.5 px-3 whitespace-nowrap">
                            {colKey}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                      {filteredData.map((row, idx) => (
                        <tr key={idx} className="hover:bg-amber-50/40 transition">
                          <td className="py-2 px-3 text-slate-400 text-[10px] font-mono">{idx + 1}</td>
                          {Object.keys(ninosData[0]).map((colKey) => (
                            <td key={colKey} className="py-2 px-3 text-slate-800">
                              {colKey.toUpperCase().includes("DOC") ? (
                                <span className="font-mono text-[11px] text-slate-600 font-semibold">
                                  {row[colKey]}
                                </span>
                              ) : colKey.toUpperCase().includes("GRUPO") ? (
                                <span className="bg-slate-100 text-slate-800 text-[10px] font-semibold px-2 py-0.5 rounded border border-slate-200">
                                  {row[colKey]}
                                </span>
                              ) : (
                                <span>{row[colKey]}</span>
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
