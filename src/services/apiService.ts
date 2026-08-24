import { ReportData, DiarioRow, NlRow, PlaneacionRow, RefrigerioRow, DocenteRow, ReemplazoRow, HistorialPlaneacionesData } from "../types";

/**
 * Interface for API request payload
 */
export interface AppsScriptPayload {
  action: string;
  [key: string]: any;
}

/**
 * Standard response structure from Google Apps Script Web App
 */
export interface AppsScriptResponse<T = any> {
  ok?: boolean;
  status?: "success" | "error";
  data?: T;
  message?: string;
  error?: string;
  [key: string]: any;
}

/**
 * Batch progress report interface for reactive UI updates
 */
export interface BatchProgressInfo {
  currentBatch: number;
  totalBatches: number;
  currentSchools: string[];
  processedSchoolsCount: number;
  totalSchoolsCount: number;
  percent: number;
  message: string;
}

/**
 * Helper to split an array into chunks of specified size
 */
export function chunkArray<T>(items: T[], chunkSize: number): T[][] {
  if (chunkSize <= 0) return [items];
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    chunks.push(items.slice(i, i + chunkSize));
  }
  return chunks;
}

/**
 * Main HTTP POST wrapper for Google Apps Script Web App
 * 
 * CRITICAL CORS & REDIRECT DESIGN:
 * 1. Method: POST
 * 2. Header: 'Content-Type: text/plain;charset=utf-8' -> Forces standard simple request, bypassing CORS OPTIONS preflight.
 * 3. Body: JSON.stringify(payload) -> GAS doPost receives string in e.postData.contents and parses it with JSON.parse().
 * 4. redirect: 'follow' -> Natively follows the 302 redirect from script.google.com to script.googleusercontent.com.
 */
export async function postToAppsScript<T = any>(
  url: string,
  payload: AppsScriptPayload,
  signal?: AbortSignal,
  timeoutMs: number = 360000
): Promise<T> {
  if (!url || !url.startsWith("https://script.google.com/")) {
    throw new Error("URL de Google Apps Script inválida o vacía. Debe comenzar con https://script.google.com/");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort(new Error(`Timeout de petición (${timeoutMs / 1000}s) excedido en Google Apps Script.`));
  }, timeoutMs);

  // Link external abort signal to internal controller
  if (signal) {
    if (signal.aborted) {
      clearTimeout(timeoutId);
      throw new Error("Petición cancelada antes de iniciar.");
    }
    signal.addEventListener("abort", () => {
      controller.abort();
    });
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify(payload),
      redirect: "follow",
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Error HTTP ${response.status}: ${response.statusText}`);
    }

    const json = await response.json();
    return json as T;
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === "AbortError" || signal?.aborted) {
      throw new Error("Petición cancelada o detenida por el usuario.");
    }
    throw new Error(err.message || "Error al comunicarse con Google Apps Script");
  }
}

/**
 * Fetch report data in batches (chunks of schools) from Google Apps Script.
 * Highly recommended for 50+ concurrent users to avoid server limits and timeouts.
 */
export async function fetchReportDataInBatches(
  url: string,
  options: {
    mes: string;
    colegios: string[];
    folderId?: string;
    planeacionesPattern?: string;
    batchSize?: number;
    signal?: AbortSignal;
    onBatchProgress?: (progress: BatchProgressInfo, partialData: ReportData) => void;
  }
): Promise<ReportData> {
  const {
    mes,
    colegios,
    folderId = "",
    planeacionesPattern = "MM",
    batchSize = 2, // 2 schools per batch optimal for GAS execution quotas
    signal,
    onBatchProgress
  } = options;

  if (colegios.length === 0) {
    return { diario: [], nl: [], planeaciones: [], refrigerios: [], docentes: [] };
  }

  const schoolBatches = chunkArray(colegios, batchSize);
  const totalBatches = schoolBatches.length;

  const accumulated: ReportData = {
    diario: [],
    nl: [],
    planeaciones: [],
    refrigerios: [],
    docentes: []
  };

  let processedCount = 0;

  for (let bIndex = 0; bIndex < totalBatches; bIndex++) {
    if (signal?.aborted) {
      throw new Error("Petición cancelada por el usuario.");
    }

    const currentChunk = schoolBatches[bIndex];
    const batchNumber = bIndex + 1;
    const chunkNames = currentChunk.join(", ");

    const progressPercent = Math.round(((batchNumber - 1) / totalBatches) * 100);

    if (onBatchProgress) {
      onBatchProgress(
        {
          currentBatch: batchNumber,
          totalBatches,
          currentSchools: currentChunk,
          processedSchoolsCount: processedCount,
          totalSchoolsCount: colegios.length,
          percent: progressPercent,
          message: `Consultando lote ${batchNumber}/${totalBatches} (${currentChunk.length} colegios: ${chunkNames})...`
        },
        accumulated
      );
    }

    const payload: AppsScriptPayload = {
      action: "getReportData",
      mes,
      colegios: currentChunk.join(","),
      folderId,
      planeacionesPattern,
      batchIndex: bIndex,
      totalBatches
    };

    const response = await postToAppsScript<AppsScriptResponse<any>>(url, payload, signal);

    if (response && response.status === "error") {
      throw new Error(response.message || response.error || `Error en el lote ${batchNumber}`);
    }

    let reportData = response?.data || response;
    if (reportData) {
      // Normalize raw rows
      const rawDiario = Array.isArray(reportData.diario) ? reportData.diario : [];
      const normDiario: DiarioRow[] = rawDiario.map((d: any) => ({
        colegio: String(d.colegio || d.Colegio || d.colegioNombre || ""),
        grupo: String(d.grupo || d.Grupo || d.curso || d.Curso || ""),
        fechaSesion: String(d.fechaSesion || d.fecha || d.Fecha || d.fecha_sesion || ""),
        planeacion: String(d.planeacion || d.Planeacion || d["Planeación"] || "OK"),
        asistenciasFaltantes: String(d.asistenciasFaltantes || d.asistencias || d["Asistencias Faltantes"] || d.asistencia || "OK"),
        alertaDocente: String(d.alertaDocente || d.docente || d["Alerta Docente"] || d.alerta || ""),
        fileUrl: d.fileUrl || d.url || d.link || d.sheetUrl || ""
      })).filter(r => r.colegio || r.grupo || r.planeacion !== "OK" || r.asistenciasFaltantes !== "OK" || r.alertaDocente);

      const rawNl = Array.isArray(reportData.nl) ? reportData.nl : [];
      const normNl: NlRow[] = rawNl.map((d: any) => ({
        nombre: String(d.nombre || d.Nombre || d.estudiante || d.Estudiante || ""),
        documento: String(d.documento || d.Documento || d.doc || d.Doc || ""),
        colegio: String(d.colegio || d.Colegio || ""),
        grupo: String(d.grupo || d.Grupo || ""),
        asistencia: String(d.asistencia || d.Asistencia || ""),
        observacion: String(d.observacion || d.Observacion || d["Observación"] || ""),
        fileUrl: d.fileUrl || d.url || d.link || d.sheetUrl || ""
      })).filter(r => r.nombre || r.documento || r.observacion);

      const rawPlan = Array.isArray(reportData.planeaciones) ? reportData.planeaciones : [];
      const normPlan: PlaneacionRow[] = rawPlan.map((d: any) => ({
        archivo: String(d.archivo || d.Archivo || d.nombreArchivo || d.file || ""),
        estado: String(d.estado || d.Estado || "CORRECTO"),
        ultimaPlaneacion: String(d.ultimaPlaneacion || d.UltimaPlaneacion || d.ultima_planeacion || d["Última Planeación"] || d.ultima || ""),
        detalles: String(d.detalles || d.Detalles || d.observaciones || d.detalle || "OK"),
        secuenciaActual: String(d.secuenciaActual || d.secuencia || d.Secuencia || ""),
        fileUrl: d.fileUrl || d.url || d.link || d.sheetUrl || ""
      })).filter(r => r.archivo || r.detalles || r.ultimaPlaneacion);

      const rawRefri = Array.isArray(reportData.refrigerios) ? reportData.refrigerios : [];
      const normRefri: RefrigerioRow[] = rawRefri.map((d: any) => ({
        nombre: String(d.nombre || d.Nombre || d.estudiante || ""),
        documento: String(d.documento || d.Documento || ""),
        colegio: String(d.colegio || d.Colegio || ""),
        grupo: String(d.grupo || d.Grupo || ""),
        idk: String(d.idk || d.IDK || d.id || ""),
        alertaRefrigerio: String(d.alertaRefrigerio || d.alerta || d.Alerta || d.refrigerio || ""),
        fileUrl: d.fileUrl || d.url || d.link || d.sheetUrl || ""
      })).filter(r => r.nombre || r.documento || r.alertaRefrigerio);

      const rawDoc = Array.isArray(reportData.docentes) ? reportData.docentes : [];
      const normDoc: DocenteRow[] = rawDoc.map((d: any) => ({
        grupo: String(d.grupo || d.Grupo || d.colegioGrupo || ""),
        docentes: String(d.docentes || d.Docentes || d.docente || d.Docente || ""),
        alerta1raQuincena: String(d.alerta1raQuincena || d.q1 || d.Q1 || "OK"),
        alerta2daQuincena: String(d.alerta2daQuincena || d.q2 || d.Q2 || "OK"),
        observacion: String(d.observacion || d.Observacion || d["Observación"] || ""),
        fileUrl: d.fileUrl || d.url || d.link || d.sheetUrl || ""
      })).filter(r => r.grupo || r.docentes || r.observacion);

      accumulated.diario.push(...normDiario);
      accumulated.nl.push(...normNl);
      accumulated.planeaciones.push(...normPlan);
      accumulated.refrigerios.push(...normRefri);
      accumulated.docentes.push(...normDoc);
    }

    processedCount += currentChunk.length;

    const completedPercent = Math.round((batchNumber / totalBatches) * 100);

    if (onBatchProgress) {
      onBatchProgress(
        {
          currentBatch: batchNumber,
          totalBatches,
          currentSchools: currentChunk,
          processedSchoolsCount: processedCount,
          totalSchoolsCount: colegios.length,
          percent: completedPercent,
          message: batchNumber === totalBatches
            ? `¡Sincronización completada! (${colegios.length} colegios procesados).`
            : `Lote ${batchNumber}/${totalBatches} completado con éxito.`
        },
        accumulated
      );
    }

    // Small yielding pause (50ms) to allow React to render UI frames seamlessly
    if (bIndex < totalBatches - 1) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }

  return accumulated;
}

/**
 * Fetch available schools list from Google Apps Script
 */
export async function fetchColegios(
  url: string,
  folderId?: string,
  signal?: AbortSignal
): Promise<string[]> {
  const response = await postToAppsScript<any>(url, {
    action: "getColegios",
    folderId: folderId || ""
  }, signal);

  let schools: string[] = [];
  if (Array.isArray(response)) {
    schools = response;
  } else if (response && Array.isArray(response.data)) {
    schools = response.data;
  } else if (response && response.status === "success" && Array.isArray(response.data)) {
    schools = response.data;
  } else if (response && typeof response === "object") {
    const found = Object.values(response).find(val => Array.isArray(val));
    if (found) {
      schools = found as string[];
    }
  }

  return schools;
}

/**
 * Fetch Reemplazos in batches
 */
export async function fetchReemplazosInBatches(
  url: string,
  options: {
    mes: string;
    colegios: string[];
    folderId?: string;
    batchSize?: number;
    signal?: AbortSignal;
    onBatchProgress?: (progress: BatchProgressInfo, partialList: ReemplazoRow[]) => void;
  }
): Promise<ReemplazoRow[]> {
  const { mes, colegios, folderId = "", batchSize = 3, signal, onBatchProgress } = options;

  if (colegios.length === 0) return [];

  const chunks = chunkArray(colegios, batchSize);
  const totalBatches = chunks.length;
  const accumulated: ReemplazoRow[] = [];
  let processedCount = 0;

  for (let bIndex = 0; bIndex < totalBatches; bIndex++) {
    if (signal?.aborted) throw new Error("Petición cancelada por el usuario.");

    const currentChunk = chunks[bIndex];
    const batchNumber = bIndex + 1;

    if (onBatchProgress) {
      onBatchProgress(
        {
          currentBatch: batchNumber,
          totalBatches,
          currentSchools: currentChunk,
          processedSchoolsCount: processedCount,
          totalSchoolsCount: colegios.length,
          percent: Math.round(((batchNumber - 1) / totalBatches) * 100),
          message: `Consultando reemplazos lote ${batchNumber}/${totalBatches}...`
        },
        accumulated
      );
    }

    const response = await postToAppsScript<any>(
      url,
      {
        action: "getReemplazos",
        mes,
        colegios: currentChunk.join(","),
        folderId
      },
      signal
    );

    let list: ReemplazoRow[] = [];
    if (response) {
      if (Array.isArray(response.reemplazos)) list = response.reemplazos;
      else if (response.data && Array.isArray(response.data.reemplazos)) list = response.data.reemplazos;
      else if (Array.isArray(response.data)) list = response.data;
      else if (Array.isArray(response)) list = response;
    }

    accumulated.push(...list);
    processedCount += currentChunk.length;

    if (onBatchProgress) {
      onBatchProgress(
        {
          currentBatch: batchNumber,
          totalBatches,
          currentSchools: currentChunk,
          processedSchoolsCount: processedCount,
          totalSchoolsCount: colegios.length,
          percent: Math.round((batchNumber / totalBatches) * 100),
          message: `Lote ${batchNumber}/${totalBatches} de reemplazos completado.`
        },
        accumulated
      );
    }

    if (bIndex < totalBatches - 1) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }

  return accumulated;
}

/**
 * Fetch Niños Cero in batches
 */
export async function fetchNinosCeroInBatches(
  url: string,
  options: {
    mes: string;
    colegios: string[];
    folderId?: string;
    batchSize?: number;
    signal?: AbortSignal;
    onBatchProgress?: (progress: BatchProgressInfo, partialList: any[]) => void;
  }
): Promise<{ list: any[]; totalCount: number }> {
  const { mes, colegios, folderId = "", batchSize = 3, signal, onBatchProgress } = options;

  if (colegios.length === 0) return { list: [], totalCount: 0 };

  const chunks = chunkArray(colegios, batchSize);
  const totalBatches = chunks.length;
  const accumulated: any[] = [];
  let processedCount = 0;

  for (let bIndex = 0; bIndex < totalBatches; bIndex++) {
    if (signal?.aborted) throw new Error("Petición cancelada por el usuario.");

    const currentChunk = chunks[bIndex];
    const batchNumber = bIndex + 1;

    if (onBatchProgress) {
      onBatchProgress(
        {
          currentBatch: batchNumber,
          totalBatches,
          currentSchools: currentChunk,
          processedSchoolsCount: processedCount,
          totalSchoolsCount: colegios.length,
          percent: Math.round(((batchNumber - 1) / totalBatches) * 100),
          message: `Consultando niños cero lote ${batchNumber}/${totalBatches}...`
        },
        accumulated
      );
    }

    const response = await postToAppsScript<any>(
      url,
      {
        action: "getNinosCero",
        mes,
        colegios: currentChunk.join(","),
        folderId
      },
      signal
    );

    let list: any[] = [];
    if (response && response.data && Array.isArray(response.data.ninosCeroData)) {
      list = response.data.ninosCeroData;
    } else if (response && Array.isArray(response.ninosCeroData)) {
      list = response.ninosCeroData;
    } else if (response && response.data && Array.isArray(response.data.ninosCero)) {
      list = response.data.ninosCero;
    } else if (response && Array.isArray(response.ninosCero)) {
      list = response.ninosCero;
    } else if (response && response.data && Array.isArray(response.data)) {
      list = response.data;
    } else if (Array.isArray(response)) {
      list = response;
    }

    accumulated.push(...list);
    processedCount += currentChunk.length;

    if (onBatchProgress) {
      onBatchProgress(
        {
          currentBatch: batchNumber,
          totalBatches,
          currentSchools: currentChunk,
          processedSchoolsCount: processedCount,
          totalSchoolsCount: colegios.length,
          percent: Math.round((batchNumber / totalBatches) * 100),
          message: `Lote ${batchNumber}/${totalBatches} de niños cero completado.`
        },
        accumulated
      );
    }

    if (bIndex < totalBatches - 1) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }

  return { list: accumulated, totalCount: accumulated.length };
}

/**
 * Fetch Historial Global de Planeaciones
 */
export async function fetchHistorialPlaneaciones(
  url: string,
  signal?: AbortSignal
): Promise<HistorialPlaneacionesData> {
  const response = await postToAppsScript<any>(
    url,
    { action: "getHistorialPlaneaciones" },
    signal
  );

  let headers = [];
  let rows = [];
  let summaryMsg = "";

  if (response) {
    if (response.data && response.data.headers) {
      headers = response.data.headers;
      rows = response.data.rows || [];
      summaryMsg = response.data.summaryMsg || response.summaryMsg || "";
    } else if (response.headers) {
      headers = response.headers;
      rows = response.rows || [];
      summaryMsg = response.summaryMsg || "";
    }
  }

  return { headers, rows, summaryMsg };
}
