import React, { useState, useMemo } from "react";
import { ReportData, DiarioRow, NlRow, PlaneacionRow, RefrigerioRow, DocenteRow } from "../types";
import { exportToExcel } from "../utils";
import { Search, Download, ArrowUpDown, AlertTriangle, CheckCircle2, ListFilter, FileSpreadsheet, ExternalLink } from "lucide-react";

interface ReportTablesProps {
  data: ReportData;
  activeTab: string;
  onSelectTab: (tabId: string) => void;
  selectedMonth: string;
  rootFolderId?: string;
}

type SortConfig = {
  key: string;
  direction: "asc" | "desc";
} | null;

export default function ReportTables({ data, activeTab, onSelectTab, selectedMonth, rootFolderId }: ReportTablesProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);

  const renderDriveLink = (fileUrl?: string, searchQueryTerm?: string) => {
    const targetUrl = fileUrl || (rootFolderId 
      ? `https://drive.google.com/drive/folders/${rootFolderId}` 
      : `https://drive.google.com/drive/search?q=${encodeURIComponent(searchQueryTerm || "Colsubsidio")}`);
    return (
      <a
        href={targetUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2 py-0.5 rounded transition shadow-2xs whitespace-nowrap cursor-pointer"
        title="Abrir hoja de cálculo original en Google Drive para corregir"
      >
        <ExternalLink className="w-3 h-3 text-indigo-600" />
        Ir a Hoja
      </a>
    );
  };

  // Reset search and sorting when changing tabs
  const handleTabChange = (tabId: string) => {
    onSelectTab(tabId);
    setSearchQuery("");
    setSortConfig(null);
  };

  const handleSort = (key: string) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const renderSortIcon = (key: string) => {
    return (
      <ArrowUpDown className={`w-3.5 h-3.5 ml-1 inline-block transition-colors ${
        sortConfig?.key === key ? "text-gray-900 font-bold" : "text-gray-400 hover:text-gray-600"
      }`} />
    );
  };

  // Helper to sort and filter each table's data safely
  const processedData = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();

    if (activeTab === "diario") {
      let items = [...(data.diario || [])];

      if (query) {
        items = items.filter(item => 
          (item.colegio || "").toLowerCase().includes(query) ||
          (item.grupo || "").toLowerCase().includes(query) ||
          (item.fechaSesion || "").toLowerCase().includes(query) ||
          (item.planeacion || "").toLowerCase().includes(query) ||
          (item.asistenciasFaltantes || "").toLowerCase().includes(query) ||
          (item.alertaDocente || "").toLowerCase().includes(query)
        );
      }
      if (sortConfig) {
        items.sort((a, b) => {
          const valA = String((a as any)[sortConfig.key] || "");
          const valB = String((b as any)[sortConfig.key] || "");
          return sortConfig.direction === "asc"
            ? valA.localeCompare(valB, "es", { numeric: true })
            : valB.localeCompare(valA, "es", { numeric: true });
        });
      }
      return items;
    }

    if (activeTab === "nl") {
      let items = [...(data.nl || [])];
      if (query) {
        items = items.filter(item => 
          (item.nombre || "").toLowerCase().includes(query) ||
          (item.documento || "").toLowerCase().includes(query) ||
          (item.colegio || "").toLowerCase().includes(query) ||
          (item.grupo || "").toLowerCase().includes(query) ||
          (item.asistencia || "").toLowerCase().includes(query) ||
          (item.observacion || "").toLowerCase().includes(query)
        );
      }
      if (sortConfig) {
        items.sort((a, b) => {
          const valA = String((a as any)[sortConfig.key] || "");
          const valB = String((b as any)[sortConfig.key] || "");
          return sortConfig.direction === "asc"
            ? valA.localeCompare(valB, "es", { numeric: true })
            : valB.localeCompare(valA, "es", { numeric: true });
        });
      }
      return items;
    }

    if (activeTab === "planeaciones") {
      let items = [...(data.planeaciones || [])];

      if (query) {
        items = items.filter(item => 
          (item.archivo || "").toLowerCase().includes(query) ||
          (item.estado || "").toLowerCase().includes(query) ||
          (item.ultimaPlaneacion || "").toLowerCase().includes(query) ||
          (item.detalles || "").toLowerCase().includes(query) ||
          (item.secuenciaActual || "").toLowerCase().includes(query)
        );
      }
      if (sortConfig) {
        items.sort((a, b) => {
          const valA = String((a as any)[sortConfig.key] || "");
          const valB = String((b as any)[sortConfig.key] || "");
          return sortConfig.direction === "asc"
            ? valA.localeCompare(valB, "es", { numeric: true })
            : valB.localeCompare(valA, "es", { numeric: true });
        });
      }
      return items;
    }

    if (activeTab === "refrigerios") {
      let items = [...(data.refrigerios || [])];

      if (query) {
        items = items.filter(item => 
          (item.nombre || "").toLowerCase().includes(query) ||
          (item.documento || "").toLowerCase().includes(query) ||
          (item.colegio || "").toLowerCase().includes(query) ||
          (item.grupo || "").toLowerCase().includes(query) ||
          (item.idk || "").toLowerCase().includes(query) ||
          (item.alertaRefrigerio || "").toLowerCase().includes(query)
        );
      }
      if (sortConfig) {
        items.sort((a, b) => {
          const valA = String((a as any)[sortConfig.key] || "");
          const valB = String((b as any)[sortConfig.key] || "");
          return sortConfig.direction === "asc"
            ? valA.localeCompare(valB, "es", { numeric: true })
            : valB.localeCompare(valA, "es", { numeric: true });
        });
      }
      return items;
    }

    if (activeTab === "docentes") {
      let items = [...(data.docentes || [])];

      if (query) {
        items = items.filter(item => 
          (item.grupo || "").toLowerCase().includes(query) ||
          (item.docentes || "").toLowerCase().includes(query) ||
          (item.alerta1raQuincena || "").toLowerCase().includes(query) ||
          (item.alerta2daQuincena || "").toLowerCase().includes(query)
        );
      }
      if (sortConfig) {
        items.sort((a, b) => {
          const valA = String((a as any)[sortConfig.key] || "");
          const valB = String((b as any)[sortConfig.key] || "");
          return sortConfig.direction === "asc"
            ? valA.localeCompare(valB, "es", { numeric: true })
            : valB.localeCompare(valA, "es", { numeric: true });
        });
      }
      return items;
    }

    return [];
  }, [data, activeTab, searchQuery, sortConfig]);

  // Export handler for current active table
  const handleExport = () => {
    const timestamp = new Date().toISOString().slice(0, 10);
    if (activeTab === "diario") {
      const headers = ["Colegio", "Grupo", "Fecha Sesión", "Planeación", "Asistencias Faltantes", "Alerta Docente"];
      const keys = ["colegio", "grupo", "fechaSesion", "planeacion", "asistenciasFaltantes", "alertaDocente"];
      exportToExcel(`Reporte_Diario_Mes_${selectedMonth}_${timestamp}`, headers, processedData, keys, "Diario");
    } else if (activeTab === "nl") {
      const headers = ["Nombre Estudiante", "Documento", "Colegio", "Grupo", "Asistencia", "Observación"];
      const keys = ["nombre", "documento", "colegio", "grupo", "asistencia", "observacion"];
      exportToExcel(`Reporte_NL_Mes_${selectedMonth}_${timestamp}`, headers, processedData, keys, "Niños Lápiz");
    } else if (activeTab === "planeaciones") {
      const headers = ["Archivo", "Estado", "Última Planeación", "Detalles", "Secuencia Actual"];
      const keys = ["archivo", "estado", "ultimaPlaneacion", "detalles", "secuenciaActual"];
      exportToExcel(`Reporte_Planeaciones_Mes_${selectedMonth}_${timestamp}`, headers, processedData, keys, "Planeaciones");
    } else if (activeTab === "refrigerios") {
      const headers = ["Nombre Estudiante", "Documento", "Colegio", "Grupo", "IDK", "Alerta Refrigerio"];
      const keys = ["nombre", "documento", "colegio", "grupo", "idk", "alertaRefrigerio"];
      exportToExcel(`Reporte_Refrigerios_Mes_${selectedMonth}_${timestamp}`, headers, processedData, keys, "Refrigerios");
    } else if (activeTab === "docentes") {
      const headers = ["Grupo / Colegio", "Docentes Asignados", "Alerta 1Q", "Alerta 2Q"];
      const keys = ["grupo", "docentes", "alerta1raQuincena", "alerta2daQuincena"];
      exportToExcel(`Reporte_Docentes_Mes_${selectedMonth}_${timestamp}`, headers, processedData, keys, "Docentes");
    }
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden flex flex-col">
      {/* Table Sub-header Controls */}
      <div className="p-2 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        {/* Simple inline filter tabs */}
        <div className="flex flex-wrap gap-1">
          <button
            onClick={() => handleTabChange("diario")}
            className={`px-2.5 py-1 rounded text-[11px] font-bold font-sans tracking-wide transition cursor-pointer ${
              activeTab === "diario"
                ? "bg-[#4A86E8] text-white"
                : "bg-white text-slate-600 hover:text-slate-900 border border-slate-200"
            }`}
          >
            Diario ({data.diario.length})
          </button>
          <button
            onClick={() => handleTabChange("nl")}
            className={`px-2.5 py-1 rounded text-[11px] font-bold font-sans tracking-wide transition cursor-pointer ${
              activeTab === "nl"
                ? "bg-[#FF9900] text-white"
                : "bg-white text-slate-600 hover:text-slate-900 border border-slate-200"
            }`}
          >
            Niños Lápiz ({data.nl.length})
          </button>
          <button
            onClick={() => handleTabChange("planeaciones")}
            className={`px-2.5 py-1 rounded text-[11px] font-bold font-sans tracking-wide transition cursor-pointer ${
              activeTab === "planeaciones"
                ? "bg-[#8E7CC3] text-white"
                : "bg-white text-slate-600 hover:text-slate-900 border border-slate-200"
            }`}
          >
            Planeaciones ({data.planeaciones.length})
          </button>
          <button
            onClick={() => handleTabChange("refrigerios")}
            className={`px-2.5 py-1 rounded text-[11px] font-bold font-sans tracking-wide transition cursor-pointer ${
              activeTab === "refrigerios"
                ? "bg-[#CC0000] text-white"
                : "bg-white text-slate-600 hover:text-slate-900 border border-slate-200"
            }`}
          >
            Refrigerios ({data.refrigerios.length})
          </button>
          <button
            onClick={() => handleTabChange("docentes")}
            className={`px-2.5 py-1 rounded text-[11px] font-bold font-sans tracking-wide transition cursor-pointer ${
              activeTab === "docentes"
                ? "bg-[#38761D] text-white"
                : "bg-white text-slate-600 hover:text-slate-900 border border-slate-200"
            }`}
          >
            Docentes ({data.docentes.length})
          </button>
        </div>

        {/* Search bar & Export */}
        <div className="flex flex-wrap items-center gap-1.5">
          <div className="relative shrink-0 w-full sm:w-[160px]">
            <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-7 pr-2.5 py-1 text-[11px] border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans bg-white"
            />
          </div>

          <button
            onClick={handleExport}
            disabled={processedData.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-[11px] font-bold transition cursor-pointer disabled:opacity-40 shrink-0 shadow-xs"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Exportar Excel (.xlsx)
          </button>
        </div>
      </div>

      {/* DENSE GRID VIEWER FOR HIGH DATA VELOCITY */}
      <div className="overflow-x-auto">
        {processedData.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-[11px] italic">
            No se encontraron registros que coincidan con los filtros o la búsqueda.
          </div>
        ) : (
          <table className="w-full text-left border-collapse font-sans text-[11px]">
            {/* 1. DIARIO TABLE */}
            {activeTab === "diario" && (
              <>
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-[10px] font-extrabold text-slate-600 uppercase tracking-wider select-none">
                    <th onClick={() => handleSort("colegio")} className="px-2.5 py-1.5 cursor-pointer hover:bg-slate-200">Colegio {renderSortIcon("colegio")}</th>
                    <th onClick={() => handleSort("grupo")} className="px-2.5 py-1.5 cursor-pointer hover:bg-slate-200">Grupo {renderSortIcon("grupo")}</th>
                    <th onClick={() => handleSort("fechaSesion")} className="px-2.5 py-1.5 cursor-pointer hover:bg-slate-200">Fecha Sesión {renderSortIcon("fechaSesion")}</th>
                    <th onClick={() => handleSort("planeacion")} className="px-2.5 py-1.5 cursor-pointer hover:bg-slate-200">Planeación {renderSortIcon("planeacion")}</th>
                    <th onClick={() => handleSort("asistenciasFaltantes")} className="px-2.5 py-1.5 cursor-pointer hover:bg-slate-200">Asis Faltantes {renderSortIcon("asistenciasFaltantes")}</th>
                    <th onClick={() => handleSort("alertaDocente")} className="px-2.5 py-1.5 cursor-pointer hover:bg-slate-200">Alerta Docente {renderSortIcon("alertaDocente")}</th>
                    <th className="px-2.5 py-1.5 text-center">Corregir Error</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(processedData as DiarioRow[]).map((row, idx) => {
                    const isAlert = row.planeacion === "Falta Plan." || row.asistenciasFaltantes !== "OK" || row.alertaDocente.trim() !== "";
                    return (
                      <tr 
                        key={idx} 
                        className={`transition hover:bg-slate-50/80 ${isAlert ? "bg-red-50 hover:bg-red-100/40 border-l-2 border-red-500 text-red-950" : ""}`}
                      >
                        <td className="px-2.5 py-1 font-semibold text-slate-900">{row.colegio}</td>
                        <td className="px-2.5 py-1 text-slate-600">{row.grupo}</td>
                        <td className="px-2.5 py-1 text-slate-600 font-mono text-[10px]">{row.fechaSesion}</td>
                        <td className="px-2.5 py-1">
                          <span className={`inline-flex items-center gap-1 px-1 py-0.5 rounded text-[9px] font-bold ${
                            row.planeacion === "OK" 
                              ? "bg-green-100 text-green-800" 
                              : "bg-red-100 text-red-800"
                          }`}>
                            {row.planeacion}
                          </span>
                        </td>
                        <td className="px-2.5 py-1">
                          <span className={`font-mono text-[10px] ${row.asistenciasFaltantes !== "OK" ? "text-red-700 font-bold" : "text-slate-500"}`}>
                            {row.asistenciasFaltantes}
                          </span>
                        </td>
                        <td className="px-2.5 py-1">
                          {row.alertaDocente ? (
                            <span className="text-amber-800 font-bold bg-amber-50 border border-amber-200 px-1 py-0.5 rounded text-[9px] inline-flex items-center gap-0.5">
                              ⚠️ {row.alertaDocente}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">Sin alertas</span>
                          )}
                        </td>
                        <td className="px-2.5 py-1 text-center">
                          {renderDriveLink(row.fileUrl, `${row.colegio} ${row.grupo}`)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </>
            )}

            {/* 2. NL TABLE */}
            {activeTab === "nl" && (
              <>
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-[10px] font-extrabold text-slate-600 uppercase tracking-wider select-none">
                    <th onClick={() => handleSort("nombre")} className="px-2.5 py-1.5 cursor-pointer hover:bg-slate-200">Nombre Estudiante {renderSortIcon("nombre")}</th>
                    <th onClick={() => handleSort("documento")} className="px-2.5 py-1.5 cursor-pointer hover:bg-slate-200">Documento {renderSortIcon("documento")}</th>
                    <th onClick={() => handleSort("colegio")} className="px-2.5 py-1.5 cursor-pointer hover:bg-slate-200">Colegio {renderSortIcon("colegio")}</th>
                    <th onClick={() => handleSort("grupo")} className="px-2.5 py-1.5 cursor-pointer hover:bg-slate-200">Grupo {renderSortIcon("grupo")}</th>
                    <th onClick={() => handleSort("asistencia")} className="px-2.5 py-1.5 cursor-pointer hover:bg-slate-200">Asistencia {renderSortIcon("asistencia")}</th>
                    <th onClick={() => handleSort("observacion")} className="px-2.5 py-1.5 cursor-pointer hover:bg-slate-200">Observación {renderSortIcon("observacion")}</th>
                    <th className="px-2.5 py-1.5 text-center">Corregir Error</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(processedData as NlRow[]).map((row, idx) => {
                    const isAlert = row.observacion.trim() !== "";
                    return (
                      <tr 
                        key={idx} 
                        className={`transition hover:bg-slate-50/80 ${isAlert ? "bg-amber-50 hover:bg-amber-100/40 border-l-2 border-amber-500 text-amber-950" : ""}`}
                      >
                        <td className="px-2.5 py-1 font-semibold text-slate-900">{row.nombre}</td>
                        <td className="px-2.5 py-1 font-mono text-[10px] text-slate-500">{row.documento}</td>
                        <td className="px-2.5 py-1 text-slate-600">{row.colegio}</td>
                        <td className="px-2.5 py-1 text-slate-600">{row.grupo}</td>
                        <td className="px-2.5 py-1 text-slate-600">{row.asistencia}</td>
                        <td className="px-2.5 py-1 text-amber-800 font-bold">{row.observacion}</td>
                        <td className="px-2.5 py-1 text-center">
                          {renderDriveLink(row.fileUrl, `${row.colegio} ${row.grupo}`)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </>
            )}

            {/* 3. PLANEACIONES TABLE */}
            {activeTab === "planeaciones" && (
              <>
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-[10px] font-extrabold text-slate-600 uppercase tracking-wider select-none">
                    <th onClick={() => handleSort("archivo")} className="px-2.5 py-1.5 cursor-pointer hover:bg-slate-200">Archivo {renderSortIcon("archivo")}</th>
                    <th onClick={() => handleSort("estado")} className="px-2.5 py-1.5 cursor-pointer hover:bg-slate-200">Estado {renderSortIcon("estado")}</th>
                    <th onClick={() => handleSort("ultimaPlaneacion")} className="px-2.5 py-1.5 cursor-pointer hover:bg-slate-200">Última Planeación {renderSortIcon("ultimaPlaneacion")}</th>
                    <th onClick={() => handleSort("detalles")} className="px-2.5 py-1.5 cursor-pointer hover:bg-slate-200">Detalles {renderSortIcon("detalles")}</th>
                    <th onClick={() => handleSort("secuenciaActual")} className="px-2.5 py-1.5 cursor-pointer hover:bg-slate-200">Secuencia Actual {renderSortIcon("secuenciaActual")}</th>
                    <th className="px-2.5 py-1.5 text-center">Corregir Error</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(processedData as PlaneacionRow[]).map((row, idx) => {
                    const isAlert = row.estado.includes("❌") || row.estado.toUpperCase().includes("ERROR");
                    return (
                      <tr 
                        key={idx} 
                        className={`transition hover:bg-slate-50/80 ${isAlert ? "bg-purple-50 hover:bg-purple-100/40 border-l-2 border-purple-500 text-purple-950" : ""}`}
                      >
                        <td className="px-2.5 py-1 font-semibold text-slate-900">{row.archivo}</td>
                        <td className="px-2.5 py-1">
                          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold ${
                            !isAlert 
                              ? "bg-green-100 text-green-800" 
                              : "bg-purple-100 text-purple-800"
                          }`}>
                            {row.estado}
                          </span>
                        </td>
                        <td className="px-2.5 py-1 font-medium text-slate-800">{row.ultimaPlaneacion || "-"}</td>
                        <td className="px-2.5 py-1 text-slate-700 font-medium">{row.detalles}</td>
                        <td className="px-2.5 py-1 font-mono text-[10px] text-slate-500">{row.secuenciaActual}</td>
                        <td className="px-2.5 py-1 text-center">
                          {renderDriveLink(row.fileUrl, row.archivo)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </>
            )}

            {/* 4. REFRIGERIOS TABLE */}
            {activeTab === "refrigerios" && (
              <>
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-[10px] font-extrabold text-slate-600 uppercase tracking-wider select-none">
                    <th onClick={() => handleSort("nombre")} className="px-2.5 py-1.5 cursor-pointer hover:bg-slate-200">Nombre Estudiante {renderSortIcon("nombre")}</th>
                    <th onClick={() => handleSort("documento")} className="px-2.5 py-1.5 cursor-pointer hover:bg-slate-200">Documento {renderSortIcon("documento")}</th>
                    <th onClick={() => handleSort("colegio")} className="px-2.5 py-1.5 cursor-pointer hover:bg-slate-200">Colegio {renderSortIcon("colegio")}</th>
                    <th onClick={() => handleSort("grupo")} className="px-2.5 py-1.5 cursor-pointer hover:bg-slate-200">Grupo {renderSortIcon("grupo")}</th>
                    <th onClick={() => handleSort("idk")} className="px-2.5 py-1.5 cursor-pointer hover:bg-slate-200">IDK {renderSortIcon("idk")}</th>
                    <th onClick={() => handleSort("alertaRefrigerio")} className="px-2.5 py-1.5 cursor-pointer hover:bg-slate-200">Alerta de Refrigerio {renderSortIcon("alertaRefrigerio")}</th>
                    <th className="px-2.5 py-1.5 text-center">Corregir Error</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(processedData as RefrigerioRow[]).map((row, idx) => {
                    const isAlert = row.alertaRefrigerio.trim() !== "";
                    return (
                      <tr 
                        key={idx} 
                        className={`transition hover:bg-slate-50/80 ${isAlert ? "bg-red-50 hover:bg-red-100/40 border-l-2 border-red-600 text-red-950" : ""}`}
                      >
                        <td className="px-2.5 py-1 font-semibold text-slate-900">{row.nombre}</td>
                        <td className="px-2.5 py-1 font-mono text-[10px] text-slate-500">{row.documento}</td>
                        <td className="px-2.5 py-1 text-slate-600">{row.colegio}</td>
                        <td className="px-2.5 py-1 text-slate-600">{row.grupo}</td>
                        <td className="px-2.5 py-1 font-mono text-slate-500">{row.idk}</td>
                        <td className="px-2.5 py-1 font-bold text-red-700">{row.alertaRefrigerio}</td>
                        <td className="px-2.5 py-1 text-center">
                          {renderDriveLink(row.fileUrl, `${row.colegio} ${row.grupo}`)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </>
            )}

            {/* 5. DOCENTES TABLE */}
            {activeTab === "docentes" && (
              <>
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-[10px] font-extrabold text-slate-600 uppercase tracking-wider select-none">
                    <th onClick={() => handleSort("grupo")} className="px-2.5 py-1.5 cursor-pointer hover:bg-slate-200">Grupo / Colegio {renderSortIcon("grupo")}</th>
                    <th onClick={() => handleSort("docentes")} className="px-2.5 py-1.5 cursor-pointer hover:bg-slate-200">Docentes {renderSortIcon("docentes")}</th>
                    <th onClick={() => handleSort("alerta1raQuincena")} className="px-2.5 py-1.5 cursor-pointer hover:bg-slate-200">Alerta 1Q {renderSortIcon("alerta1raQuincena")}</th>
                    <th onClick={() => handleSort("alerta2daQuincena")} className="px-2.5 py-1.5 cursor-pointer hover:bg-slate-200">Alerta 2Q {renderSortIcon("alerta2daQuincena")}</th>
                    <th className="px-2.5 py-1.5 text-center">Corregir Error</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(processedData as DocenteRow[]).map((row, idx) => {
                    const isAlert = row.alerta1raQuincena !== "OK" || row.alerta2daQuincena !== "OK";
                    return (
                      <tr 
                        key={idx} 
                        className={`transition hover:bg-slate-50/80 ${isAlert ? "bg-emerald-50/70 hover:bg-emerald-100/40 border-l-2 border-[#38761D] text-emerald-950" : ""}`}
                      >
                        <td className="px-2.5 py-1 font-semibold text-slate-900">{row.grupo}</td>
                        <td className="px-2.5 py-1 text-slate-600">{row.docentes}</td>
                        <td className="px-2.5 py-1">
                          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold ${
                            row.alerta1raQuincena === "OK" 
                              ? "bg-green-100 text-green-800" 
                              : "bg-yellow-100 text-yellow-800"
                          }`}>
                            {row.alerta1raQuincena}
                          </span>
                        </td>
                        <td className="px-2.5 py-1">
                          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold ${
                            row.alerta2daQuincena === "OK" 
                              ? "bg-green-100 text-green-800" 
                              : "bg-yellow-100 text-yellow-800"
                          }`}>
                            {row.alerta2daQuincena}
                          </span>
                        </td>
                        <td className="px-2.5 py-1 text-center">
                          {renderDriveLink(row.fileUrl, row.grupo)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </>
            )}
          </table>
        )}
      </div>

      {/* Row Indicator Footer */}
      <div className="p-2 bg-slate-50 border-t border-slate-200 text-[10px] text-slate-500 font-bold font-sans flex justify-between items-center">
        <span>Mostrando {processedData.length} registros filtrados</span>
        <span>Auditoría de Colegio - Mes {selectedMonth}</span>
      </div>
    </div>
  );
}
