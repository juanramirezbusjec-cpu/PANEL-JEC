import React, { useState, useEffect, useRef } from "react";
import { MONTHS, fetchFromWebApp } from "../utils";
import { FolderArchive, Calendar, Building2, ChevronDown, ChevronUp, Copy, CheckCircle2, AlertCircle, AlertTriangle } from "lucide-react";
import ProgressBar from "./ProgressBar";

interface BackupListasCardProps {
  availableSchools: string[];
  initialMonth?: string;
  webAppUrl: string;
  isDemoMode: boolean;
}

const MESES = [
  'Enero (01)', 'Febrero (02)', 'Marzo (03)', 'Abril (04)',
  'Mayo (05)', 'Junio (06)', 'Julio (07)', 'Agosto (08)',
  'Septiembre (09)', 'Octubre (10)', 'Noviembre (11)', 'Diciembre (12)'
];

const DESTINATION_WEEKS = [
  "Semana 1", "Semana 2", "Semana 3", "Semana 4", "Semana 5"
];

export default function BackupListasCard({
  availableSchools,
  initialMonth = "07",
  webAppUrl,
  isDemoMode
}: BackupListasCardProps) {
  const defaultMonth = MESES.find((m) => m.includes(initialMonth)) || MESES[new Date().getMonth()];
  const [mesOrigen, setMesOrigen] = useState<string>(defaultMonth);
  const [selectedSchools, setSelectedSchools] = useState<string[]>(availableSchools);
  const [showSchoolDropdown, setShowSchoolDropdown] = useState<boolean>(false);
  
  const [mesDestino, setMesDestino] = useState<string>(MESES[new Date().getMonth()]);
  const [semanaDestino, setSemanaDestino] = useState<string>("Semana 1");

  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [showCompletionModal, setShowCompletionModal] = useState<boolean>(false);
  const [completionStats, setCompletionStats] = useState<{ copiados: number | string; total: number | string }>({
    copiados: 0,
    total: 0
  });

  const [loading, setLoading] = useState<boolean>(false);
  const [totalGrupos, setTotalGrupos] = useState<number>(0);
  const [statusMsg, setStatusMsg] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const completed100Ref = useRef<boolean>(false);

  // Sync selected schools if availableSchools updates
  useEffect(() => {
    if (availableSchools.length > 0 && selectedSchools.length === 0) {
      setSelectedSchools([...availableSchools]);
    }
  }, [availableSchools]);

  const handleSelectAll = () => {
    setSelectedSchools([...availableSchools]);
  };

  const handleSelectNone = () => {
    setSelectedSchools([]);
  };

  const handleToggleSchool = (school: string) => {
    setSelectedSchools((prev) =>
      prev.includes(school)
        ? prev.filter((s) => s !== school)
        : [...prev, school]
    );
  };

  // Step 1: Open Custom Confirmation Modal
  const solicitarCopiaRespaldo = () => {
    if (selectedSchools.length === 0) {
      setErrorMsg("Por favor selecciona al menos un colegio para realizar la copia de respaldo.");
      return;
    }
    setErrorMsg(null);
    setShowConfirmModal(true);
  };

  const handleProgressComplete = (data?: { copiados?: number | string; total?: number | string }) => {
    completed100Ref.current = true;
    setErrorMsg(null);
    const copiados = data?.copiados ?? selectedSchools.length;
    const total = data?.total ?? selectedSchools.length;
    setCompletionStats({ copiados, total });
    setTotalGrupos(0);
    setLoading(false);
    setShowCompletionModal(true);
  };

  const handleCancel = () => {
    // 1. Fetch al endpoint action=cancelCopiaListas (GET, redirect: "follow", sin headers)
    if (webAppUrl && !isDemoMode) {
      fetch(`${webAppUrl}?action=cancelCopiaListas`, {
        method: "GET",
        redirect: "follow"
      }).catch(() => {});
    }

    // 2. Limpieza inmediata de estados locales sin esperar respuesta
    completed100Ref.current = true;
    setErrorMsg(null);
    setLoading(false);
    setTotalGrupos(0);
    setShowCompletionModal(false);
  };

  // Step 2: Confirmed execution via Modal 'Sí, Confirmar'
  const confirmarYProcesarRespaldo = () => {
    setShowConfirmModal(false);
    completed100Ref.current = false;
    setTotalGrupos(0);

    // Extract strictly two numeric digits (e.g., '07' from '07' or 'Julio (07)')
    const matchDigits = mesOrigen.match(/\d+/);
    const numericMesOrigen = matchDigits ? matchDigits[0].padStart(2, "0") : "07";

    setErrorMsg(null);

    // Make progress bar visible IMMEDIATELY after confirming modal
    setLoading(true);
    setStatusMsg(`Iniciando copia de respaldo de ${selectedSchools.length} colegio(s) a ${mesDestino} / ${semanaDestino}...`);

    const colegiosParam = selectedSchools.join(",");

    if (!isDemoMode && webAppUrl) {
      // Trigger fetch to action=iniciarCopiaListas
      // Wrapped in silent resolution: no alerts, no bar hiding, polling handles everything.
      fetchFromWebApp<any>(webAppUrl, {
        action: "iniciarCopiaListas",
        mesOrigen: numericMesOrigen,
        colegios: colegiosParam,
        mesDestino,
        semanaDestino
      })
        .then(() => {
          // Silent resolution - polling is the single authority
        })
        .catch(() => {
          // Silent resolution - polling is the single authority
        });
    }
  };

  // Expose global window function for backward compatibility / explicit call
  useEffect(() => {
    (window as any).ejecutarCopiaRespaldo = solicitarCopiaRespaldo;
    (window as any).cancelCopiaListas = handleCancel;
    (window as any).handleCancel = handleCancel;
  }, [mesOrigen, selectedSchools, mesDestino, semanaDestino, webAppUrl, isDemoMode]);

  return (
    <div id="backupListasCard" className="bg-white rounded-lg border border-slate-200 shadow-2xs p-4 space-y-3">
      {/* Header */}
      <div className="border-b border-slate-100 pb-2 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <FolderArchive className="w-4 h-4 text-purple-600" />
            <h3 className="text-xs font-bold text-slate-900 font-sans tracking-tight uppercase">
              Copia de Respaldo de Listas (Backups)
            </h3>
          </div>
          <p className="text-[10px] text-slate-500 mt-0.5">
            Genera una copia de seguridad en Google Drive de las listas auditadas clasificadas por Mes y Semana.
          </p>
        </div>
      </div>

      {/* Horizontal Toolbar: 4 Inputs + 1 Button (flex-row on desktop, flex-col on mobile) */}
      <div className="flex flex-col lg:flex-row lg:items-end gap-3 lg:gap-[15px]">
        {/* 1. Mes de Origen */}
        <div className="flex-1 min-w-0 w-full">
          <label htmlFor="mesOrigen" className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
            <Calendar className="w-3 h-3 text-purple-600 shrink-0" />
            <span className="truncate">Mes Origen:</span>
          </label>
          <select
            id="mesOrigen"
            value={mesOrigen}
            onChange={(e) => setMesOrigen(e.target.value)}
            disabled={loading}
            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white cursor-pointer disabled:opacity-50 h-[34px]"
          >
            {MESES.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        {/* 2. Colegios a copiar (Dropdown Multi-select) */}
        <div className="flex-1 min-w-0 w-full relative">
          <label htmlFor="colegiosSelectBtn" className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center justify-between">
            <span className="flex items-center gap-1 truncate">
              <Building2 className="w-3 h-3 text-purple-600 shrink-0" />
              Colegios ({selectedSchools.length}/{availableSchools.length}):
            </span>
          </label>

          <button
            id="colegiosSelectBtn"
            type="button"
            onClick={() => !loading && setShowSchoolDropdown(!showSchoolDropdown)}
            disabled={loading}
            className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded text-xs text-left font-medium text-slate-800 flex items-center justify-between hover:bg-slate-100 transition cursor-pointer disabled:opacity-50 h-[34px]"
          >
            <span className="truncate">
              {selectedSchools.length === 0
                ? "Ningún colegio"
                : selectedSchools.length === availableSchools.length
                ? "Todos los colegios"
                : `${selectedSchools.length} colegio(s)`}
            </span>
            {showSchoolDropdown ? (
              <ChevronUp className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            )}
          </button>

          {showSchoolDropdown && !loading && (
            <div className="absolute left-0 top-full mt-1 w-full min-w-[220px] bg-white border border-slate-300 rounded-lg shadow-xl z-30 p-3 space-y-2">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-[10px] font-bold text-slate-600 uppercase">
                  Colegios a Respaldar:
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="text-[10px] font-bold text-purple-600 hover:text-purple-800 hover:underline cursor-pointer"
                  >
                    Todos
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    type="button"
                    onClick={handleSelectNone}
                    className="text-[10px] font-bold text-slate-500 hover:text-slate-700 hover:underline cursor-pointer"
                  >
                    Ninguno
                  </button>
                </div>
              </div>

              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                {availableSchools.length === 0 ? (
                  <div className="text-[11px] text-slate-400 p-2 italic text-center">
                    Cargando lista de colegios...
                  </div>
                ) : (
                  availableSchools.map((school) => {
                    const isChecked = selectedSchools.includes(school);
                    return (
                      <label
                        key={school}
                        className={`flex items-center gap-2 p-1.5 rounded text-xs cursor-pointer transition ${
                          isChecked ? "bg-purple-50/80 text-purple-950 font-medium" : "hover:bg-slate-50 text-slate-700"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleSchool(school)}
                          className="rounded text-purple-600 focus:ring-purple-500 h-3.5 w-3.5 cursor-pointer"
                        />
                        <span className="truncate">{school}</span>
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
                  Cerrar
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 3. Mes de Destino */}
        <div className="flex-1 min-w-0 w-full">
          <label htmlFor="mesDestino" className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1 truncate">
            Mes Destino:
          </label>
          <select
            id="mesDestino"
            value={mesDestino}
            onChange={(e) => setMesDestino(e.target.value)}
            disabled={loading}
            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white cursor-pointer disabled:opacity-50 h-[34px]"
          >
            {MESES.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        {/* 4. Semana de Destino */}
        <div className="flex-1 min-w-0 w-full">
          <label htmlFor="semanaDestino" className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1 truncate">
            Semana Destino:
          </label>
          <select
            id="semanaDestino"
            value={semanaDestino}
            onChange={(e) => setSemanaDestino(e.target.value)}
            disabled={loading}
            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white cursor-pointer disabled:opacity-50 h-[34px]"
          >
            {DESTINATION_WEEKS.map((w) => (
              <option key={w} value={w}>
                {w}
              </option>
            ))}
          </select>
        </div>

        {/* 5. Botón de Ejecutar */}
        <div className="flex-1 min-w-0 w-full">
          {!loading && (
            <button
              id="btnEjecutarRespaldo"
              type="button"
              onClick={solicitarCopiaRespaldo}
              disabled={loading || selectedSchools.length === 0}
              className="w-full px-3 py-1.5 bg-purple-700 hover:bg-purple-800 disabled:opacity-50 text-white text-xs font-bold rounded shadow-xs transition duration-150 flex items-center justify-center gap-1.5 cursor-pointer h-[34px] whitespace-nowrap"
            >
              <Copy className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Ejecutar Respaldo</span>
            </button>
          )}
        </div>
      </div>

      {/* Dynamic Progress Bar Container */}
      {loading && (
        <div id="progressBarContainer" className="mt-2 space-y-2">
          <ProgressBar
            isLoading={loading}
            initialDelayMs={3000}
            webAppUrl={webAppUrl}
            isDemoMode={isDemoMode}
            title="Ejecutando Copia de Respaldo..."
            statusText={statusMsg}
            accentColor="purple"
            defaultTotal={selectedSchools.length * 6}
            onStop={handleCancel}
            onComplete={handleProgressComplete}
            onPollData={(data) => {
              const rawTotal = data?.total ?? data?.data?.total;
              if (rawTotal !== undefined && rawTotal !== null && !isNaN(Number(rawTotal))) {
                setTotalGrupos(Number(rawTotal));
              }
            }}
            onProgress={(pct) => {
              if (pct >= 100 || pct === 1) {
                completed100Ref.current = true;
              }
            }}
          />

          {/* Bloque de alerta condicional si totalGrupos > 30 */}
          {totalGrupos > 30 && (
            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-lg text-xs flex items-start gap-2.5 shadow-2xs animate-in fade-in duration-200">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-0.5 leading-relaxed font-medium">
                <span className="font-bold text-amber-950">Alerta: </span>
                Se detectaron <span className="font-bold">{totalGrupos}</span> grupos. El sistema realizará lotes automáticos con pausas de 1 minuto. Por favor, no cierres esta ventana hasta que llegue al 100%.
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal Personalizado de Confirmación */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-2xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full p-5 space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-amber-100 rounded-full text-amber-700 shrink-0 mt-0.5">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xs font-bold text-slate-900 uppercase font-sans tracking-wide">
                  Confirmar Copia de Respaldo
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  ⚠️ ATENCIÓN: ¿Estás seguro de que las listas ya están completamente revisadas y auditadas? No se deben crear copias de seguridad de listas incompletas o con errores.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-md transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmarYProcesarRespaldo}
                className="px-4 py-1.5 bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold rounded-md shadow-xs transition cursor-pointer flex items-center gap-1.5"
              >
                <span>Sí, Confirmar</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Personalizado de Finalización (Resultado Final) */}
      {showCompletionModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-2xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-sm w-full p-6 text-center space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="mx-auto w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-900 font-sans tracking-tight uppercase">
                Proceso Finalizado
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                Proceso finalizado, se copiaron: {completionStats.copiados} de {completionStats.total} archivos
              </p>
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowCompletionModal(false)}
                className="w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs transition cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
