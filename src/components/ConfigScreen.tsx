import React, { useState } from "react";
import { Link2, Sparkles, CheckCircle, AlertTriangle, ArrowRight } from "lucide-react";

interface ConfigScreenProps {
  webAppUrl: string;
  isDemoMode: boolean;
  rootFolderId: string;
  destFolderId: string;
  adminPasswordHash: string;
  planeacionesPattern: string;
  onSave: (url: string, isDemo: boolean, rootFolderId: string, destFolderId: string, adminPasswordHash: string, planeacionesPattern: string) => void;
}

export default function ConfigScreen({ 
  webAppUrl, 
  isDemoMode, 
  rootFolderId,
  destFolderId,
  adminPasswordHash,
  planeacionesPattern,
  onSave 
}: ConfigScreenProps) {
  const [urlInput, setUrlInput] = useState(webAppUrl);
  const [rootFolderInput, setRootFolderInput] = useState(rootFolderId);
  const [passwordInput, setPasswordInput] = useState(adminPasswordHash);
  const [planeacionesPatternInput, setPlaneacionesPatternInput] = useState(planeacionesPattern);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim() && !isDemoMode) {
      setError("Por favor ingresa una URL válida de Apps Script.");
      return;
    }
    if (urlInput.trim() && !urlInput.startsWith("https://script.google.com/")) {
      setError("La URL debe comenzar con https://script.google.com/");
      return;
    }
    if (!rootFolderInput.trim()) {
      setError("Por favor ingresa un ID de Carpeta Raíz válido.");
      return;
    }
    if (!planeacionesPatternInput.trim()) {
      setError("Por favor ingresa un filtro de planeaciones válido (ej. MM).");
      return;
    }
    setError(null);
    onSave(urlInput.trim(), false, rootFolderInput.trim(), destFolderId, passwordInput.trim(), planeacionesPatternInput.trim());
    setSuccessMsg("¡Configuración guardada exitosamente!");
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  return (
    <div className="max-w-2xl mx-auto py-4 px-4 space-y-4">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center p-2 bg-indigo-50 text-indigo-600 rounded-full mb-2">
          <Sparkles className="w-6 h-6" />
        </div>
        <h1 className="text-sm font-bold text-slate-900 font-sans tracking-tight uppercase">
          Configuración de Conexión de la API
        </h1>
        <p className="text-slate-500 mt-1 max-w-lg mx-auto text-[11px]">
          Ingresa la URL de tu Google Apps Script Web App para conectar las carpetas de Drive con el Dashboard.
        </p>
      </div>

      <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs">
        <div className="flex items-center gap-1.5 mb-3 pb-2 border-b border-slate-100">
          <Link2 className="w-4 h-4 text-indigo-600" />
          <h2 className="font-bold text-slate-900 text-xs uppercase tracking-tight">Servicio Google Apps Script</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="url" className="block text-[10px] font-bold text-slate-600 mb-1 uppercase tracking-wider">
              URL del Web App (doGet):
            </label>
            <input
              type="url"
              id="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://script.google.com/macros/s/.../exec"
              className="w-full px-3 py-1.5 border border-slate-200 rounded text-xs font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white text-slate-800"
            />
          </div>

          <div>
            <label htmlFor="rootFolder" className="block text-[10px] font-bold text-slate-600 mb-1 uppercase tracking-wider">
              ID Carpeta Raíz de Convenio (Google Drive):
            </label>
            <input
              type="text"
              id="rootFolder"
              value={rootFolderInput}
              onChange={(e) => setRootFolderInput(e.target.value)}
              placeholder="ID de la carpeta que contiene los colegios"
              className="w-full px-3 py-1.5 border border-slate-200 rounded text-xs font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white text-slate-800"
            />
            <p className="text-[9px] text-slate-400 mt-0.5">
              ID de la carpeta contenedora en tu Drive (de donde el script extrae los colegios).
            </p>
          </div>

          <div>
            <label htmlFor="planeacionesPattern" className="block text-[10px] font-bold text-slate-600 mb-1 uppercase tracking-wider">
              Palabra Clave / Prefijo Archivo Planeaciones:
            </label>
            <input
              type="text"
              id="planeacionesPattern"
              value={planeacionesPatternInput}
              onChange={(e) => setPlaneacionesPatternInput(e.target.value)}
              placeholder="MM o PLANEACION"
              className="w-full px-3 py-1.5 border border-slate-200 rounded text-xs font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white text-slate-800"
            />
            <p className="text-[9px] text-slate-400 mt-0.5">
              Filtro o nombre para identificar los archivos de planeaciones de los docentes (ej: "MM" o "Planeación").
            </p>
          </div>

          <div>
            <label htmlFor="adminPassword" className="block text-[10px] font-bold text-slate-600 mb-1 uppercase tracking-wider">
              Contraseña de Administrador:
            </label>
            <input
              type="password"
              id="adminPassword"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="Contraseña para esconder esta pestaña"
              className="w-full px-3 py-1.5 border border-slate-200 rounded text-xs font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white text-slate-800"
            />
          </div>

          {error && (
            <div className="p-2.5 bg-red-50 rounded flex items-start gap-1.5 border border-red-100 text-red-700 text-[10px]">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-2.5 bg-green-50 rounded flex items-start gap-1.5 border border-green-100 text-green-700 text-[10px] font-bold">
              <CheckCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          <button
            type="submit"
            className="w-full py-2 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded text-xs transition duration-150 flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
          >
            Guardar Configuración
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>

        <div className="border-t border-slate-100 pt-3 mt-4 flex items-center justify-between text-[10px] text-slate-500">
          <span className="font-semibold uppercase tracking-wider">Estado de Conexión:</span>
          {webAppUrl ? (
            <span className="inline-flex items-center gap-1 font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded border border-green-200">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              Conectado a Apps Script
            </span>
          ) : (
            <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded font-semibold border border-amber-200">
              No configurado
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
