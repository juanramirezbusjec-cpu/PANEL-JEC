import React, { useState, useRef, useMemo } from "react";
import { 
  Table, 
  Search, 
  Download, 
  AlertCircle, 
  CheckCircle2, 
  FileSpreadsheet, 
  Layers, 
  RefreshCw,
  Database
} from "lucide-react";
import { HistorialPlaneacionesData, HistorialHeader, HistorialCell } from "../types";
import { fetchHistorialPlaneaciones } from "../services/apiService";
import ProgressBar from "./ProgressBar";
import * as XLSX from "xlsx";

interface HistorialPlaneacionesPanelProps {
  webAppUrl: string;
  isDemoMode: boolean;
}

export default function HistorialPlaneacionesPanel({
  webAppUrl,
  isDemoMode
}: HistorialPlaneacionesPanelProps) {
  const [loading, setLoading] = useState<boolean>(false);
  const [data, setData] = useState<HistorialPlaneacionesData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [summaryMsg, setSummaryMsg] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [hasLoaded, setHasLoaded] = useState<boolean>(false);

  const abortControllerRef = useRef<AbortController | null>(null);

  const handleLoadHistory = async () => {
    setLoading(true);
    setErrorMessage(null);
    setSummaryMsg(null);
    setHasLoaded(true);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    // Demo Mode or No WebApp URL Fallback
    if (isDemoMode || !webAppUrl || !webAppUrl.startsWith("https://script.google.com/")) {
      setTimeout(() => {
        // Generate realistic Google Sheets audit matrix mock
        const mockHeaders: HistorialHeader[] = [
          { text: "COLEGIO", bgColor: "#1e293b", textColor: "#ffffff" },
          { text: "GRUPO", bgColor: "#1e293b", textColor: "#ffffff" },
          { text: "LINEA", bgColor: "#1e293b", textColor: "#ffffff" },
          { text: "ENE - Q1", bgColor: "#312e81", textColor: "#ffffff" },
          { text: "ENE - Q2", bgColor: "#312e81", textColor: "#ffffff" },
          { text: "FEB - Q1", bgColor: "#1e3a8a", textColor: "#ffffff" },
          { text: "FEB - Q2", bgColor: "#1e3a8a", textColor: "#ffffff" },
          { text: "MAR - Q1", bgColor: "#172554", textColor: "#ffffff" },
          { text: "MAR - Q2", bgColor: "#172554", textColor: "#ffffff" },
          { text: "ABR - Q1", bgColor: "#065f46", textColor: "#ffffff" },
          { text: "ABR - Q2", bgColor: "#065f46", textColor: "#ffffff" },
          { text: "MAY - Q1", bgColor: "#854d0e", textColor: "#ffffff" },
          { text: "MAY - Q2", bgColor: "#854d0e", textColor: "#ffffff" },
          { text: "JUN - Q1", bgColor: "#991b1b", textColor: "#ffffff" },
          { text: "JUN - Q2", bgColor: "#991b1b", textColor: "#ffffff" },
          { text: "JUL - Q1", bgColor: "#312e81", textColor: "#ffffff" },
          { text: "JUL - Q2", bgColor: "#312e81", textColor: "#ffffff" },
          { text: "AGO - Q1", bgColor: "#1e3a8a", textColor: "#ffffff" },
          { text: "AGO - Q2", bgColor: "#1e3a8a", textColor: "#ffffff" },
          { text: "SEP - Q1", bgColor: "#172554", textColor: "#ffffff" },
          { text: "SEP - Q2", bgColor: "#172554", textColor: "#ffffff" },
          { text: "OCT - Q1", bgColor: "#065f46", textColor: "#ffffff" },
          { text: "OCT - Q2", bgColor: "#065f46", textColor: "#ffffff" },
          { text: "NOV - Q1", bgColor: "#854d0e", textColor: "#ffffff" },
          { text: "NOV - Q2", bgColor: "#854d0e", textColor: "#ffffff" }
        ];

        const schools = [
          "Colegio Colsubsidio Chicalá",
          "Colegio Colsubsidio Maiporé",
          "Colegio Colsubsidio Torca",
          "Colegio Colsubsidio Ciudad Roma",
          "Colegio Colsubsidio San Vicente",
          "Liceo Técnico Colsubsidio"
        ];

        const mockRows: HistorialCell[][] = [];

        schools.forEach((school) => {
          for (let g = 1; g <= 4; g++) {
            const row: HistorialCell[] = [
              { value: school, bgColor: "#f8fafc", textColor: "#0f172a" },
              { value: `Grupo ${g}01`, bgColor: "#f8fafc", textColor: "#0f172a" },
              { value: g % 2 === 0 ? "Robótica" : "Pensamiento", bgColor: "#f8fafc", textColor: "#0f172a" }
            ];

            // 22 quincenas columns
            for (let q = 1; q <= 22; q++) {
              const rand = Math.random();
              if (rand > 0.8) {
                // Error / Warning cell (Red)
                row.push({ value: "❌ Plan 0", bgColor: "#fef2f2", textColor: "#991b1b" });
              } else if (rand > 0.6) {
                // Warning cell (Yellow)
                row.push({ value: "⚠️ Salto", bgColor: "#fefce8", textColor: "#854d0e" });
              } else {
                // OK cell (Green)
                row.push({ value: "OK", bgColor: "#f0fdf4", textColor: "#166534" });
              }
            }

            mockRows.push(row);
          }
        });

        setData({
          headers: mockHeaders,
          rows: mockRows
        });

        setSummaryMsg(`Tablero Histórico Maestro cargado exitosamente (${mockRows.length} filas x ${mockHeaders.length} columnas).`);
        setLoading(false);
      }, 1600);
      return;
    }

    try {
      const historyData = await fetchHistorialPlaneaciones(webAppUrl, abortController.signal);

      if (!historyData.headers || historyData.headers.length === 0 || !historyData.rows || historyData.rows.length === 0) {
        throw new Error("El servidor de Apps Script retornó una matriz de historial vacía o con formato no reconocido.");
      }

      setData(historyData);
      setSummaryMsg(historyData.summaryMsg || `Tablero histórico cargado con ${historyData.rows.length} filas.`);
      setLoading(false);
    } catch (err: any) {
      abortControllerRef.current = null;
      if (err.message?.includes("cancelada") || err.message?.includes("detenida")) {
        setLoading(false);
        return;
      }
      console.error("Error loading historial planeaciones:", err);
      setErrorMessage(`Error al obtener Historial de Planeaciones: "${err.message}".`);
      setLoading(false);
    }
  };

  const handleStopLoad = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setLoading(false);
  };

  // Filter rows based on search query
  const filteredRows = useMemo(() => {
    if (!data || !searchQuery.trim()) return data?.rows || [];
    const q = searchQuery.toLowerCase();
    return data.rows.filter((row) =>
      row.some((cell) => String(cell.value || "").toLowerCase().includes(q))
    );
  }, [data, searchQuery]);

  // Export full matrix to Excel
  const handleExportExcel = () => {
    if (!data || data.headers.length === 0) return;

    const exportData = filteredRows.map((row) => {
      const rowObj: Record<string, any> = {};
      data.headers.forEach((hdr, idx) => {
        rowObj[hdr.text] = row[idx]?.value !== undefined && row[idx]?.value !== null ? row[idx].value : "";
      });
      return rowObj;
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Historial Planeaciones");
    XLSX.writeFile(workbook, "Historial_Global_Planeaciones_JEC.xlsx");
  };

  return (
    <div className="space-y-4 font-sans text-slate-800">
      {/* Action Banner Card */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-2xs p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-indigo-600 text-white rounded-lg shadow-2xs shrink-0">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Historial Global de Planeaciones
              </h2>
              <p className="text-xs text-slate-600 mt-0.5 max-w-2xl leading-relaxed">
                Extrae y visualiza el tablero maestro completo de planeaciones anuales. Esta vista refleja en tiempo real las celdas y código de colores directamente del archivo de auditoría.
              </p>
            </div>
          </div>

          {/* Large Prominent Button */}
          <div className="shrink-0">
            <button
              type="button"
              onClick={handleLoadHistory}
              disabled={loading}
              className="py-3 px-6 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold text-xs rounded-lg shadow-md hover:shadow-lg transition duration-200 flex items-center justify-center gap-2.5 cursor-pointer uppercase tracking-wider"
            >
              <Table className="w-4 h-4 text-indigo-400" />
              <span>Cargar Tablero Histórico</span>
            </button>
          </div>
        </div>
      </div>

      {/* Progress Bar Component */}
      {loading && (
        <ProgressBar
          isLoading={loading}
          webAppUrl={webAppUrl}
          isDemoMode={isDemoMode}
          title="Extrayendo Tablero Maestro de Planeaciones..."
          statusText="Descargando la matriz completa de celdas y formatos desde Google Sheets..."
          onStop={handleStopLoad}
          accentColor="indigo"
        />
      )}

      {/* Error Banner */}
      {errorMessage && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs flex items-start gap-2 shadow-2xs">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Summary Banner */}
      {summaryMsg && !loading && (
        <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg text-indigo-900 text-xs flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
            <span className="font-semibold">{summaryMsg}</span>
          </div>
          <span className="text-[10px] bg-indigo-100 text-indigo-950 font-bold px-2.5 py-0.5 rounded border border-indigo-300">
            {filteredRows.length} Registro(s)
          </span>
        </div>
      )}

      {/* Historical Matrix Table Mirror */}
      {hasLoaded && !loading && data && (
        <div className="bg-white rounded-lg border border-slate-300 shadow-sm overflow-hidden">
          {/* Toolbar */}
          <div className="p-3 bg-slate-100 border-b border-slate-300 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-slate-700" />
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Historial de Planeaciones ({filteredRows.length} x {data.headers.length})
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Search input */}
              <div className="relative w-48 sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filtrar colegio, grupo o estado..."
                  className="w-full pl-8 pr-3 py-1 bg-white border border-slate-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans"
                />
              </div>

              {/* Excel Export Button */}
              <button
                type="button"
                onClick={handleExportExcel}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-xs font-bold transition cursor-pointer shadow-2xs"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Exportar Matriz</span>
              </button>
            </div>
          </div>

          {/* Matrix Mirror Container with Horizontal & Vertical Scroll */}
          <div className="overflow-auto max-h-[72vh] relative select-text border-t border-slate-200">
            <table className="w-full border-collapse text-[11px] font-mono text-center">
              <thead className="sticky top-0 z-20 shadow-xs">
                <tr>
                  {data.headers.map((hdr, colIdx) => {
                    const isStickyCol = colIdx < 2;
                    // Sticky positioning offsets for first 2 columns (COLEGIO, GRUPO)
                    const stickyLeftOffsets = ["left-0", "left-[160px]"];

                    return (
                      <th
                        key={colIdx}
                        className={`px-3 py-2 border border-slate-400/60 font-bold uppercase tracking-tight whitespace-nowrap text-xs shadow-2xs ${
                          isStickyCol ? `sticky ${stickyLeftOffsets[colIdx]} z-30` : ""
                        }`}
                        style={{
                          backgroundColor: hdr.bgColor || "#0f172a",
                          color: hdr.textColor || "#ffffff"
                        }}
                      >
                        {hdr.text}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {filteredRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={data.headers.length}
                      className="px-4 py-12 text-center text-slate-500 bg-slate-50"
                    >
                      No se encontraron datos coincidentes en el tablero histórico.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row, rowIdx) => (
                    <tr
                      key={rowIdx}
                      className="hover:outline-1 hover:outline-indigo-500 transition-all"
                    >
                      {row.map((cell, colIdx) => {
                        const isStickyCol = colIdx < 2;
                        const stickyLeftOffsets = ["left-0", "left-[160px]"];

                        return (
                          <td
                            key={colIdx}
                            className={`px-2.5 py-1 border border-slate-300/80 font-medium whitespace-nowrap ${
                              isStickyCol
                                ? `sticky ${stickyLeftOffsets[colIdx]} z-10 font-sans text-left font-bold border-r-2 border-r-slate-400`
                                : "text-center"
                            }`}
                            style={{
                              backgroundColor: cell.bgColor || undefined,
                              color: cell.textColor || undefined
                            }}
                          >
                            {cell.value !== null && cell.value !== undefined ? String(cell.value) : "-"}
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="p-2 bg-slate-100 border-t border-slate-300 text-[10px] text-slate-600 flex justify-between items-center font-sans font-medium">
            <span>
              Mostrando {filteredRows.length} filas de la matriz maestra. Desplaza horizontalmente para ver todos los periodos.
            </span>
            <span className="text-slate-500 font-mono">
              Total Celdas: {filteredRows.length * data.headers.length}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
