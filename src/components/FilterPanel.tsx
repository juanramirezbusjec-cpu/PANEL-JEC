import React, { useState } from "react";
import { MONTHS } from "../utils";
import { Calendar, Building2, ChevronDown, ChevronUp, RefreshCw, XCircle } from "lucide-react";

interface FilterPanelProps {
  selectedMonth: string;
  selectedSchools: string[];
  availableSchools: string[];
  onChangeMonth: (month: string) => void;
  onChangeSchools: (schools: string[]) => void;
  onRefresh: () => void;
  onStopSync?: () => void;
  loading: boolean;
}

export default function FilterPanel({
  selectedMonth,
  selectedSchools,
  availableSchools,
  onChangeMonth,
  onChangeSchools,
  onRefresh,
  onStopSync,
  loading
}: FilterPanelProps) {
  const [showSchoolDropdown, setShowSchoolDropdown] = useState<boolean>(false);

  const handleSelectAll = () => {
    onChangeSchools([...availableSchools]);
  };

  const handleSelectNone = () => {
    onChangeSchools([]);
  };

  const handleToggleSchool = (school: string) => {
    if (selectedSchools.includes(school)) {
      onChangeSchools(selectedSchools.filter(s => s !== school));
    } else {
      onChangeSchools([...selectedSchools, school]);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-2xs p-4">
      <div className="border-b border-slate-100 pb-2 mb-3">
        <h2 className="text-xs font-bold text-slate-900 font-sans tracking-tight uppercase">
          Filtros del Dashboard Principal
        </h2>
        <p className="text-[10px] text-slate-500 mt-0.5">
          Selecciona el mes y colegios a auditar para actualizar las métricas y reportes.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
        {/* 1. Selector de Mes */}
        <div className="md:col-span-3">
          <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
            <Calendar className="w-3 h-3 text-indigo-600" />
            Mes de Auditoría:
          </label>
          <select
            value={selectedMonth}
            onChange={(e) => onChangeMonth(e.target.value)}
            className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white cursor-pointer"
          >
            {MONTHS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        {/* 2. Selector Múltiple de Colegios (Lista Desplegable) */}
        <div className="md:col-span-6 relative">
          <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Building2 className="w-3 h-3 text-indigo-600" />
              Colegios ({selectedSchools.length} de {availableSchools.length}):
            </span>
          </label>

          {/* Trigger Button */}
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

          {/* Dropdown Popover */}
          {showSchoolDropdown && (
            <div className="absolute left-0 top-full mt-1 w-full bg-white border border-slate-300 rounded-lg shadow-xl z-30 p-3 space-y-2">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-[10px] font-bold text-slate-600 uppercase">
                  Seleccionar Colegios:
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer"
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

        {/* 3. Botón Actualizar Datos en la misma fila */}
        <div className="md:col-span-3 flex items-center gap-2">
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="flex-1 py-2 px-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded shadow-xs transition duration-150 flex items-center justify-center gap-2 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>{loading ? "Actualizando..." : "Actualizar Datos"}</span>
          </button>

          {loading && onStopSync && (
            <button
              type="button"
              onClick={onStopSync}
              className="py-2 px-2.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 rounded text-xs font-bold transition cursor-pointer flex items-center gap-1 shadow-2xs"
              title="Detener actualización"
            >
              <XCircle className="w-3.5 h-3.5 text-red-600" />
              <span>Detener</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
