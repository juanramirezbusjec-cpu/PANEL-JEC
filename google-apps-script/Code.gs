/**
 * =============================================================================
 * PANEL DE CONTROL JEC - BACKEND UNIFICADO GOOGLE APPS SCRIPT (PRODUCCIÓN)
 * =============================================================================
 * Optimizado para Vite + React + TypeScript en Netlify con:
 * - Soporte nativo para peticiones POST (CORS Simple Request sin preflight OPTIONS).
 * - Extracción robusta de payload JSON (e.postData.contents) y parámetros GET (e.parameter).
 * - Procesamiento por lotes (batching) y soporte dinámico para ID de carpetas y prefijos.
 * - Respuestas seguras con ContentService MimeType JSON y seguimiento de redirección 302.
 * =============================================================================
 */

// IDs por defecto (pueden ser sobreescritos dinámicamente desde la interfaz web)
const API_ID_CARPETA_RAIZ = "1-EI7YSJKDi0P8Npeqy-91vFxzhRVd69G";
const ID_ARCHIVO_SEGUIMIENTO = "1xYzfF5-M_bDGIbrhxszPcQmz74Fi-oTR6e3JEqFaatw";
const ID_CARPETA_COPIAS = "19ScdTD6xqfuhfaNaW5QOwFnqwl6yVWvv";

/**
 * HANDLER PRINCIPAL POST (Requerido para la nueva arquitectura y CORS)
 */
function doPost(e) {
  return procesarPeticion(e);
}

/**
 * HANDLER PRINCIPAL GET (Compatibilidad hacia atrás y pruebas directas en navegador)
 */
function doGet(e) {
  return procesarPeticion(e);
}

/**
 * EXTRAE PARÁMETROS UNIFICADOS (Tanto de POST body JSON como de GET query params)
 */
function _extraerParametros(e) {
  let params = {};
  if (!e) return params;

  // 1. Si viene como cuerpo POST JSON (enviado desde fetch con Content-Type text/plain)
  if (e.postData && e.postData.contents) {
    try {
      params = JSON.parse(e.postData.contents);
    } catch (err) {
      params = {};
    }
  }

  // 2. Si vienen parámetros en la URL (GET o query string)
  if (e.parameter) {
    for (let key in e.parameter) {
      if (params[key] === undefined) {
        params[key] = e.parameter[key];
      }
    }
  }

  return params;
}

/**
 * ENRUTADOR CENTRAL DE LA API
 */
function procesarPeticion(e) {
  const params = _extraerParametros(e);
  const action = params.action || "";

  if (!action) {
    return _respuestaJSON({ 
      ok: false, 
      status: "error", 
      error: "No se especificó ninguna acción (action) en la petición." 
    });
  }

  try {
    let payload;

    if (action === "getProgress") {
      payload = obtenerProgresoAPI();

    } else if (action === "getColegios" || action === "obtenerColegios") {
      const folderId = params.folderId || API_ID_CARPETA_RAIZ;
      payload = obtenerListaColegiosRaiz(folderId);

    } else if (action === "getReportData" || action === "getReport" || action === "obtenerReporte") {
      const mes = params.mes || "07";
      const colegios = normalizarLista(params.colegios);
      const folderId = params.folderId || API_ID_CARPETA_RAIZ;
      const pattern = params.planeacionesPattern || "MM";
      payload = generarReporteAPI(mes, colegios, folderId, pattern);

    } else if (action === "getAnalisisNL_Conteo") {
      const { mes, colegios, docs, folderId } = parseParamsNL(params);
      payload = ejecutarModulosNL(colegios, mes, docs, { conteo: true, duplicados: false, busqueda: false }, folderId);

    } else if (action === "getAnalisisNL_Duplicados") {
      const { mes, colegios, docs, folderId } = parseParamsNL(params);
      payload = ejecutarModulosNL(colegios, mes, docs, { conteo: false, duplicados: true, busqueda: false }, folderId);

    } else if (action === "getAnalisisNL_Busqueda") {
      const { mes, colegios, docs, folderId } = parseParamsNL(params);
      payload = ejecutarModulosNL(colegios, mes, docs, { conteo: false, duplicados: false, busqueda: true }, folderId);

    } else if (action === "getAnalisisNL_All" || action === "getAnalisisNL") {
      const { mes, colegios, docs, folderId } = parseParamsNL(params);
      payload = ejecutarModulosNL(colegios, mes, docs, { conteo: true, duplicados: true, busqueda: true }, folderId);

    } else if (action === "getReemplazos") {
      const { mes, colegios, folderId } = parseParamsNL(params);
      payload = ejecutarReporteReemplazosJSON(colegios, mes, folderId);

    } else if (action === "getHistorialPlaneaciones") {
      payload = obtenerHistorialPlaneacionesJSON();

    } else if (action === "getNinosCero" || action === "getNinosCeroReporte") {
      const { mes, colegios, folderId } = parseParamsNL(params);
      payload = ejecutarReporteNinosCero(colegios, mes, folderId);

    } else if (action === "iniciarCopiaListas") {
      payload = iniciarCopiaListasAPI(params);

    } else if (action === "startConsolidation") {
      payload = iniciarConsolidacionAPI(params);

    } else if (action === "getConsolidationStatus") {
      payload = obtenerEstadoConsolidacionAPI();

    } else if (action === "cancelCopiaListas") {
      payload = cancelarCopiaAPI();

    } else if (action === "resetConsolidation") {
      PropertiesService.getScriptProperties().deleteProperty("CONSOLIDATE_PARAMS");
      payload = { status: "success", message: "Consolidador restablecido con éxito." };

    } else {
      throw new Error("Acción no reconocida por el servidor: '" + action + "'.");
    }

    if (typeof payload === "object" && payload !== null && !payload.ok && payload.status === undefined) {
      return _respuestaJSON({ ok: true, status: "success", data: payload, ...payload });
    }
    
    return _respuestaJSON({ ok: true, status: "success", data: payload, ...(typeof payload === "object" ? payload : {}) });

  } catch (err) {
    return _respuestaJSON({ ok: false, status: "error", error: err.message, message: err.message });
  }
}

function _respuestaJSON(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function normalizarLista(param) {
  if (!param) return [];
  if (Array.isArray(param)) return param;
  if (typeof param === "string") {
    return param.split(",").map(s => s.trim()).filter(s => s.length > 0);
  }
  return [];
}

function parseParamsNL(params) {
  return {
    mes: params.mes || "07",
    colegios: normalizarLista(params.colegios),
    docs: normalizarLista(params.docs),
    folderId: params.folderId || API_ID_CARPETA_RAIZ
  };
}

function actualizarProgreso(actual, total, mensaje) {
  let porcentaje = total > 0 ? Math.round((actual / total) * 100) : 0;
  if (porcentaje >= 100 && (mensaje.includes("Analizando") || mensaje.includes("Copiando"))) {
    porcentaje = 99;
  }
  PropertiesService.getScriptProperties().setProperty("PROGRESO_ACTUAL", JSON.stringify({
    porcentaje: porcentaje,
    mensaje: mensaje,
    copiados: actual,
    total: total
  }));
}

function obtenerProgresoAPI() {
  let data = PropertiesService.getScriptProperties().getProperty("PROGRESO_ACTUAL");
  if (!data) return { porcentaje: 0, mensaje: "Iniciando..." };
  return JSON.parse(data);
}

function obtenerListaColegiosRaiz(folderId) {
  const idRaiz = folderId || API_ID_CARPETA_RAIZ;
  const colegios = [];
  try {
    const carpetaRaiz = DriveApp.getFolderById(idRaiz);
    const carpetasColegios = carpetaRaiz.getFolders();
    while (carpetasColegios.hasNext()) {
      const colName = carpetasColegios.next().getName().trim();
      if (!colName.startsWith(".") && !colName.startsWith("_")) {
        colegios.push(colName);
      }
    }
    return colegios.sort();
  } catch (e) {
    return ["Colegio Colsubsidio Chicalá", "Colegio Colsubsidio Maiporé", "Colegio Colsubsidio Torca"];
  }
}

function generarReporteAPI(mesSeleccionado, colegiosSeleccionados, folderId, pattern) {
  actualizarProgreso(0, 1, "Conectando con Google Drive...");
  const idRaiz = folderId || API_ID_CARPETA_RAIZ;
  let carpetaRaiz;
  try { carpetaRaiz = DriveApp.getFolderById(idRaiz); } 
  catch (e) { throw new Error("No hay acceso a la carpeta raíz de convenios: " + e.message); }

  const mapaHistorial = cargarHistorialPlaneacionesEnMemoria(mesSeleccionado);
  const arrDiario = [], arrNL = [], arrPlan = [], arrRefri = [], arrDocentes = [];
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  let colegiosAProcesar = [];
  const carpetasColegios = carpetaRaiz.getFolders();
  while (carpetasColegios.hasNext()) {
    let c = carpetasColegios.next();
    if (colegiosSeleccionados && colegiosSeleccionados.length > 0 && !colegiosSeleccionados.includes(c.getName())) continue;
    colegiosAProcesar.push(c);
  }

  const total = colegiosAProcesar.length;
  let procesados = 0;

  for (let carpetaColegio of colegiosAProcesar) {
    procesados++;
    actualizarProgreso(procesados, total, `Analizando: ${carpetaColegio.getName()}`);

    const carpetasLineas = carpetaColegio.getFolders();
    while (carpetasLineas.hasNext()) {
      const carpetasMeses = carpetasLineas.next().getFolders();
      while (carpetasMeses.hasNext()) {
        const archivos = carpetasMeses.next().getFilesByType(MimeType.GOOGLE_SHEETS);
        while (archivos.hasNext()) {
          const archivo = archivos.next();
          const nombreArch = archivo.getName();
          if (nombreArch.startsWith(mesSeleccionado + "_") || (pattern && nombreArch.includes(pattern))) {
            extraerDatosEnBloques(archivo, hoy, arrDiario, arrNL, arrPlan, arrRefri, arrDocentes, mapaHistorial);
          }
        }
      }
    }
  }

  actualizarProgreso(1, 1, "Reporte Finalizado.");
  
  function aObjetos(filas, campos) {
    return filas.map(function (fila) {
      const obj = {};
      campos.forEach(function (campo, i) { obj[campo] = fila[i]; });
      return obj;
    });
  }

  return {
    diario: aObjetos(arrDiario, ["colegio", "grupo", "fechaSesion", "planeacion", "asistenciasFaltantes", "alertaDocente", "fileUrl"]),
    nl: aObjetos(arrNL, ["nombre", "documento", "colegio", "grupo", "asistencia", "observacion", "fileUrl"]),
    planeaciones: aObjetos(arrPlan, ["archivo", "estado", "ultimaPlaneacion", "detalles", "secuenciaActual", "fileUrl"]),
    refrigerios: aObjetos(arrRefri, ["nombre", "documento", "colegio", "grupo", "idk", "alertaRefrigerio", "fileUrl"]),
    docentes: aObjetos(arrDocentes, ["grupo", "docentes", "alerta1raQuincena", "alerta2daQuincena", "fileUrl"]),
    resumen: { totalDiario: arrDiario.length, totalNL: arrNL.length, totalPlaneaciones: arrPlan.length, totalRefrigerios: arrRefri.length, totalDocentes: arrDocentes.length }
  };
}

function extraerDatosEnBloques(archivo, hoy, arrDiario, arrNL, arrPlan, arrRefri, arrDocentes, mapaHistorial) {
  try {
    const fileUrl = archivo.getUrl();
    const nombreArchivo = archivo.getName();
    const libro = SpreadsheetApp.openById(archivo.getId());
    const h1 = libro.getSheetByName("1RA QUINCENA");
    const h2 = libro.getSheetByName("2DA QUINCENA");
    const data1 = h1 ? h1.getDataRange().getValues() : [];
    const data2 = h2 ? h2.getDataRange().getValues() : [];
    
    if (data1.length < 8 && data2.length < 8) return;

    let dataCabecera = data1.length >= 8 ? data1 : data2;
    let institucion = "", grupoGeneral = "";
    for (let r = 0; r < Math.min(15, dataCabecera.length); r++) {
      let label = String(dataCabecera[r][0]).trim().toUpperCase();
      if (label === "COLEGIO") institucion = String(dataCabecera[r][1] || dataCabecera[r][2]).trim();
      if (label === "GRUPO") grupoGeneral = String(dataCabecera[r][1] || dataCabecera[r][2]).trim();
    }

    const colsPlaneacion = [21, 29, 37, 45, 53, 61, 69, 77, 85, 93]; 
    let sec1 = [], sec2 = [];
    let erroresPlan = [];

    if (data1.length > 7) {
      colsPlaneacion.forEach((col, i) => {
        let val = data1[7][col];
        val = (val === "" || val == null || isNaN(val)) ? null : Number(val);
        sec1.push(val);
        if (val === 0 && String(data1[7][col + 1] || "").trim() === "") erroresPlan.push(`Falta Obs (1RA-S${i+1}) por Plan 0`);
      });
    }

    if (data2.length > 7) {
      colsPlaneacion.forEach((col, i) => {
        let val = data2[7][col];
        val = (val === "" || val == null || isNaN(val)) ? null : Number(val);
        sec2.push(val);
        if (val === 0 && String(data2[7][col + 1] || "").trim() === "") erroresPlan.push(`Falta Obs (2DA-S${i+1}) por Plan 0`);
      });
    }

    let secTotal = [...sec1, ...sec2].filter(v => v !== null);
    let secNoCeros = secTotal.filter(v => v !== 0);

    let keyBuscada = `${institucion}|${grupoGeneral}`;
    let histObj = mapaHistorial[keyBuscada] !== undefined ? mapaHistorial[keyBuscada] : "N/A";
    let ultimaHist = histObj !== "N/A" ? histObj.max : "N/A";
    let trailingHist = histObj !== "N/A" ? histObj.trailing : [];

    if (secNoCeros.length > 0) {
      let primerAct = secNoCeros[0];
      
      if (ultimaHist !== "N/A") {
        if (primerAct > ultimaHist + 1) erroresPlan.push(`Salto vs Historial (${ultimaHist} a ${primerAct})`);
        else if (primerAct < ultimaHist) erroresPlan.push(`Retroceso vs Historial (${ultimaHist} > ${primerAct})`);
      }
      
      let combinedSeq = [];
      if (trailingHist.length > 0) {
        combinedSeq.push(...trailingHist);
      }
      combinedSeq.push(...secNoCeros);

      let conteoRepeticiones = {};
      let currentRepeat = 1;
      let currentNum = combinedSeq[0];

      for (let i = 1; i < combinedSeq.length; i++) {
         if (combinedSeq[i] === currentNum) {
             currentRepeat++;
             if (currentRepeat >= 3) conteoRepeticiones[currentNum] = currentRepeat; 
         } else {
             currentNum = combinedSeq[i];
             currentRepeat = 1;
         }
      }
      
      for (let num in conteoRepeticiones) erroresPlan.push(`Plan ${num} repetido ${conteoRepeticiones[num]} veces`);

      let ant = null;
      for (let act of secNoCeros) {
        if (ant !== null) {
          if (act < ant) erroresPlan.push(`Retroceso: ${ant} > ${act}`);
          if (act > ant + 1) erroresPlan.push(`Salto: ${ant} a ${act}`);
        }
        ant = act;
      }
    }

    if (secTotal.length > 0 && erroresPlan.length > 0) {
      let ultimaHistStr = (ultimaHist !== "N/A") ? ultimaHist : "Sin historial";
      arrPlan.push([archivo.getName(), "❌ ERROR", ultimaHistStr, erroresPlan.join(" | "), secTotal.join(" → "), fileUrl]);
    }

    let docentesNombres = new Set();
    let alertasDoc = { "1RA QUINCENA": [], "2DA QUINCENA": [] }; 

    // QUINCENAS (DOCENTES, REFRIGERIOS, DIARIO)
    [data1, data2].forEach((dataQ, qIdx) => {
      if (dataQ.length < 8) return;
      let qKey = qIdx === 0 ? "1RA QUINCENA" : "2DA QUINCENA"; 
      let cedulasDetectadas = new Set();
      let hayReemplazo = false;

      for (let b = 0; b < 10; b++) {
        let colIndexDate = 15 + (b * 8); 
        let colIndexAsis = colIndexDate + 4; 
        let colIndexRefr = colIndexDate + 5; 
        let colDocenteObs = colIndexDate + 7; 
        let rawDate = dataQ[7][colIndexDate]; 
        
        let usaRefrigerioEnSesion = false;
        for (let r = 7; r < dataQ.length; r++) {
          let nombreCheck = String(dataQ[r][2] || "").trim(); 
          if (nombreCheck === "" || nombreCheck.toUpperCase().includes("TOTAL")) continue;
          let valRefr = dataQ[r][colIndexRefr];
          if (valRefr !== "" && valRefr !== null && valRefr !== undefined) {
            let valStr = String(valRefr).trim();
            if (valStr === "1" || valStr === "0") { usaRefrigerioEnSesion = true; break; }
          }
        }

        if (rawDate && String(rawDate).trim() !== "") {
          let fechaS = extraerFechaSegura(rawDate);
          
          if (fechaS && fechaS < hoy) {
             let docenteCCRaw = dataQ[5][colDocenteObs];
             let docenteNomRaw = dataQ[5][colIndexDate + 2];
             let observacionDRaw = dataQ[7][colDocenteObs];

             let docenteCC = (docenteCCRaw !== undefined && docenteCCRaw !== null) ? String(docenteCCRaw).trim() : "";
             let docenteNom = (docenteNomRaw !== undefined && docenteNomRaw !== null) ? String(docenteNomRaw).trim().toUpperCase() : "";
             let observacionD = (observacionDRaw !== undefined && observacionDRaw !== null) ? String(observacionDRaw).trim() : "";

             if (docenteNom !== "" && !docenteNom.includes("NO ENCONTRADO")) docentesNombres.add(docenteNom);

             if (docenteCC === "") alertasDoc[qKey].push(`Falta CC en S${b + 1}`);
             else { let nums = docenteCC.match(/\d+/g); if (nums) nums.forEach(n => cedulasDetectadas.add(n)); }

             let textoObsLimpio = observacionD.toUpperCase().normalize("NFD").replace(/[^A-Z]/g, "");
             let textoNomLimpio = docenteNom.normalize("NFD").replace(/[^A-Z]/g, "");
             
             if (textoObsLimpio.includes("REEMPLAZO") || textoObsLimpio.includes("REMPLAZO") ||
                 textoNomLimpio.includes("REEMPLAZO") || textoNomLimpio.includes("REMPLAZO")) {
               hayReemplazo = true;
             }

             let planeacionRaw = dataQ[7][colIndexDate + 6]; 
             let planeacionStr = String(planeacionRaw).trim();
             let planeacionEstado = (!planeacionStr || planeacionStr === "null") ? "Falta Plan." : "OK";
             
             let profName = docenteNom;
             let profCC = docenteCC.replace(/\D/g, ""); 
             
             let alertaDocenteDiario = [];
             if (!profCC) alertaDocenteDiario.push("Falta CC");
             if (profName.includes("NO ENCONTRADO") || !profName) alertaDocenteDiario.push("Nombre NO ENCONTRADO");
             let alertaDocStr = alertaDocenteDiario.join(" | ") || "OK";

             let idksFaltantes = [];
             for (let r = 7; r < dataQ.length; r++) { 
               let nombre = String(dataQ[r][2] || "").trim();
               if (nombre === "" || nombre.toUpperCase().includes("TOTAL")) continue;
               let idk = String(dataQ[r][0] || "").trim(); 
               let documento = String(dataQ[r][4] || "").trim(); 
               let estado = String(dataQ[r][12] || "").trim().toUpperCase().replace(/\s+/g, " ");
               let asistencia = String(dataQ[r][colIndexAsis] || "").trim(); 
               if (documento !== "" && (estado === "ACTIVO" || estado === "ACTIVO PEND. SOPORTE")) {
                 if (asistencia === "") idksFaltantes.push(idk);
               }
             }

             let asisTexto = agruparIDKsAux(idksFaltantes);
             if (planeacionEstado !== "OK" || idksFaltantes.length > 0 || alertaDocStr !== "OK") {
               arrDiario.push([institucion, grupoGeneral, Utilities.formatDate(fechaS, Session.getScriptTimeZone(), "dd/MM/yyyy"), planeacionEstado, asisTexto, alertaDocStr, fileUrl]);
             }
          }
        }

        if (usaRefrigerioEnSesion && rawDate && String(rawDate).trim() !== "") {
            let fechaS = extraerFechaSegura(rawDate);
            if (fechaS && fechaS < hoy) {
               for (let r = 7; r < dataQ.length; r++) {
                  let nombre = String(dataQ[r][2] || "").trim();
                  if (nombre === "" || nombre.toUpperCase().includes("TOTAL")) continue;
                  let documento = String(dataQ[r][4] || "").trim();
                  let idk = String(dataQ[r][0] || "").trim();
                  let asisVal = String(dataQ[r][colIndexAsis]).trim();
                  let refrVal = String(dataQ[r][colIndexRefr]).trim();
                  let asistio = (asisVal === "1");
                  let tieneRefrigerio = (refrVal === "1");
                  let obsRefri = "";
                  if (asistio && !tieneRefrigerio) obsRefri = `Asistió sin Refri (Q${qIdx + 1}-S${b + 1})`;
                  else if (!asistio && tieneRefrigerio) obsRefri = `Refri sin Asis (Q${qIdx + 1}-S${b + 1})`;
                  if (obsRefri !== "") arrRefri.push([nombre, documento || "VACÍO", institucion, grupoGeneral, idk || "Sin IDK", obsRefri, fileUrl]);
               }
            }
        }
      }

      if (cedulasDetectadas.size > 1 && !hayReemplazo) alertasDoc[qKey].push("CAMBIO DOCENTE SIN REEMPLAZO");
    });

    let al1 = alertasDoc["1RA QUINCENA"].length > 0 ? alertasDoc["1RA QUINCENA"].join(" | ") : "";
    let al2 = alertasDoc["2DA QUINCENA"].length > 0 ? alertasDoc["2DA QUINCENA"].join(" | ") : "";
    
    // Filtro estricto: Solo empuja la fila si existe una alerta real
    if (al1 !== "" || al2 !== "") {
      arrDocentes.push([
        grupoGeneral, 
        Array.from(docentesNombres).join(" / ") || "SIN REGISTRO", 
        al1, 
        al2, 
        fileUrl
      ]);
    }

    // NIÑOS A LÁPIZ (NL)
    let mapaAlertaNL = new Map();
    [data1, data2].forEach((dataQ, qIdx) => {
      if (dataQ.length < 8) return;
      for (let r = 7; r < dataQ.length; r++) {
        let nombre    = String(dataQ[r][2] || "").trim();
        let documento = String(dataQ[r][4] || "").trim();
        let estadoNL  = String(dataQ[r][12] || "").trim().toUpperCase();
        let asisUnica = String(dataQ[r][14] || "").trim(); 
        if (estadoNL === "NL" && nombre !== "") {
           if (!mapaAlertaNL.has(nombre)) mapaAlertaNL.set(nombre, { nombre: nombre, doc: documento, asisUnica: asisUnica, filaQ1: -1, filaQ2: -1 });
           let obj = mapaAlertaNL.get(nombre);
           if (qIdx === 0) obj.filaQ1 = r; else obj.filaQ2 = r;
           if (obj.doc === "" && documento !== "") obj.doc = documento;
           if (obj.asisUnica === "" && asisUnica !== "") obj.asisUnica = asisUnica;
        }
      }
    });

    for (let est of mapaAlertaNL.values()) {
      let observacionesNL = [];
      if (est.doc === "") observacionesNL.push("Falta Documento");
      let empezoAsistir = false;
      if (est.filaQ1 !== -1 && data1.length >= 8) {
        let r = est.filaQ1;
        for (let b = 0; b < 10; b++) {
          let rawDate = data1[7] ? data1[7][15 + (b * 8)] : null;
          if (!rawDate) continue;
          let fechaS = extraerFechaSegura(rawDate);
          if (!fechaS || fechaS >= hoy) continue; 
          let asistencia = String(data1[r] ? data1[r][15 + (b * 8) + 4] : "").trim();
          if (!empezoAsistir) { if (asistencia !== "") empezoAsistir = true; } 
          else { if (asistencia === "") observacionesNL.push(`Falta Asis ${Utilities.formatDate(fechaS, Session.getScriptTimeZone(), "dd/MM/yyyy")} (Q1-S${b + 1})`); }
        }
      }
      if (est.filaQ2 !== -1 && data2.length >= 8) {
        let r = est.filaQ2;
        for (let b = 0; b < 10; b++) {
          let rawDate = data2[7] ? data2[7][15 + (b * 8)] : null;
          if (!rawDate) continue;
          let fechaS = extraerFechaSegura(rawDate);
          if (!fechaS || fechaS >= hoy) continue; 
          let asistencia = String(data2[r] ? data2[r][15 + (b * 8) + 4] : "").trim();
          if (!empezoAsistir) { if (asistencia !== "") empezoAsistir = true; } 
          else { if (asistencia === "") observacionesNL.push(`Falta Asis ${Utilities.formatDate(fechaS, Session.getScriptTimeZone(), "dd/MM/yyyy")} (Q2-S${b + 1})`); }
        }
      }
      if (observacionesNL.length > 0) arrNL.push([est.nombre, est.doc || "VACÍO", institucion, grupoGeneral, est.asisUnica || "1", observacionesNL.join(" | "), fileUrl]);
    }

  } catch (e) {
    Logger.log(`Error leyendo ${archivo.getName()}: ${e.message}`);
  }
}

function ejecutarModulosNL(colegiosSeleccionados, mesSeleccionado, targetDocsArray, opciones, folderId) {
  actualizarProgreso(0, 1, "Iniciando análisis NL...");
  const idRaiz = folderId || API_ID_CARPETA_RAIZ;
  let carpetaRaiz;
  try { carpetaRaiz = DriveApp.getFolderById(idRaiz); } 
  catch(e) { return { conteoNL: [], duplicados: [], busquedaDocs: [], summaryMsg: "Error al acceder a la carpeta raíz." }; }

  const targetDocs = new Set();
  if (targetDocsArray && targetDocsArray.length > 0) targetDocsArray.forEach(d => { if (String(d).trim()) targetDocs.add(String(d).trim().toUpperCase()); });

  const mapaNL = new Map(), mapaEstudiantes = new Map(), mapaBusqueda = new Map();
  
  let colegiosAProcesar = [];
  const carpetasColegios = carpetaRaiz.getFolders();
  while (carpetasColegios.hasNext()) {
    let c = carpetasColegios.next();
    if (colegiosSeleccionados && colegiosSeleccionados.length > 0 && !colegiosSeleccionados.includes(c.getName())) continue;
    colegiosAProcesar.push(c);
  }

  const total = colegiosAProcesar.length;
  let procesados = 0;

  for (let carpetaColegio of colegiosAProcesar) {
    procesados++;
    actualizarProgreso(procesados, total, `Analizando: ${carpetaColegio.getName()}`);

    const carpetasLineas = carpetaColegio.getFolders();
    while (carpetasLineas.hasNext()) {
      const carpetasMeses = carpetasLineas.next().getFolders();
      while (carpetasMeses.hasNext()) {
        const archivos = carpetasMeses.next().getFilesByType(MimeType.GOOGLE_SHEETS);
        while (archivos.hasNext()) {
          const archivo = archivos.next();
          if (archivo.getName().startsWith(mesSeleccionado + "_")) {
             const libro = SpreadsheetApp.openById(archivo.getId());
             const h1 = libro.getSheetByName("1RA QUINCENA");
             const h2 = libro.getSheetByName("2DA QUINCENA");
             const data1 = h1 ? h1.getDataRange().getValues() : [];
             const data2 = h2 ? h2.getDataRange().getValues() : [];
             if (data1.length < 8 && data2.length < 8) continue;

             const infoCabecera = obtenerInfoCabecera(data1, data2);
             if (opciones.conteo) extraerConteoNL(data1, data2, infoCabecera, mapaNL, archivo.getUrl());
             if (opciones.duplicados) extraerDuplicados(data1, data2, infoCabecera, mapaEstudiantes, archivo.getUrl());
             if (opciones.busqueda) extraerBusquedaDocs(data1, data2, infoCabecera, targetDocs, mapaBusqueda, archivo.getUrl());
          }
        }
      }
    }
  }

  actualizarProgreso(1, 1, "Análisis Completado.");

  const resultados = {};
  if (opciones.conteo) resultados.conteoNL = Array.from(mapaNL.values());
  if (opciones.duplicados) {
     const duplicados = [];
     for (let [documento, registros] of mapaEstudiantes.entries()) {
       if (registros.length > 1) {
         const nls = registros.filter(r => r.estado === "NL");
         if (nls.length > 0) {
           for (let nl of nls) {
             for (let otro of registros) {
               if (nl.grupo === otro.grupo) continue;
               duplicados.push({ colegio: nl.colegio, nombre: nl.nombre, documento: documento, grupoActivo: otro.grupo, grupoNl: nl.grupo, fileUrl: nl.fileUrl });
             }
           }
         }
       }
     }
     resultados.duplicados = duplicados;
  }
  if (opciones.busqueda) resultados.busquedaDocs = Array.from(mapaBusqueda.values()).map(obj => ({ documentoEncontrado: obj.doc, nombre: obj.nombre, colegio: obj.colegio, grupo: obj.grupo, asistenciasMes: obj.totalAsis, fileUrl: obj.fileUrl }));
  resultados.summaryMsg = "✅ Módulos extraídos con éxito.";
  return resultados;
}

function ejecutarReporteReemplazosJSON(colegiosSeleccionados, mesSeleccionado, folderId) {
  actualizarProgreso(0, 1, "Iniciando búsqueda de reemplazos...");
  const idRaiz = folderId || API_ID_CARPETA_RAIZ;
  let carpetaRaiz;
  try { carpetaRaiz = DriveApp.getFolderById(idRaiz); } 
  catch (e) { throw new Error("No hay acceso a la carpeta raíz."); }

  const arrReemplazos = [];
  
  let colegiosAProcesar = [];
  const carpetasColegios = carpetaRaiz.getFolders();
  while (carpetasColegios.hasNext()) {
    let c = carpetasColegios.next();
    if (colegiosSeleccionados && colegiosSeleccionados.length > 0 && !colegiosSeleccionados.includes(c.getName())) continue;
    colegiosAProcesar.push(c);
  }

  const total = colegiosAProcesar.length;
  let procesados = 0;

  for (let carpetaColegio of colegiosAProcesar) {
    procesados++;
    actualizarProgreso(procesados, total, `Analizando: ${carpetaColegio.getName()}`);

    const carpetasLineas = carpetaColegio.getFolders();
    while (carpetasLineas.hasNext()) {
      const carpetasMeses = carpetasLineas.next().getFolders();
      while (carpetasMeses.hasNext()) {
        const archivos = carpetasMeses.next().getFilesByType(MimeType.GOOGLE_SHEETS);
        while (archivos.hasNext()) {
          const archivo = archivos.next();
          if (archivo.getName().startsWith(mesSeleccionado + "_")) {
            
            try {
              const libro = SpreadsheetApp.openById(archivo.getId());
              const h1 = libro.getSheetByName("1RA QUINCENA");
              const h2 = libro.getSheetByName("2DA QUINCENA");
              const data1 = h1 ? h1.getDataRange().getValues() : [];
              const data2 = h2 ? h2.getDataRange().getValues() : [];
              if (data1.length < 8 && data2.length < 8) continue;
              
              const infoCab = obtenerInfoCabecera(data1, data2);

              [data1, data2].forEach((dataQ) => {
                if (dataQ.length < 8) return;
                for (let b = 0; b < 10; b++) {
                  let colIndexDate = 15 + (b * 8); 
                  let rawDate = dataQ[7][colIndexDate]; 
                  let obs = String(dataQ[7][colIndexDate + 7] || "").trim();
                  let docente = String(dataQ[5][colIndexDate + 2] || "").trim();
                  let cc = String(dataQ[5][colIndexDate + 7] || "").replace(/\D/g, "");
                  
                  let textoObsLimpio = obs.toUpperCase().normalize("NFD").replace(/[^A-Z]/g, "");
                  let textoNomLimpio = docente.toUpperCase().normalize("NFD").replace(/[^A-Z]/g, "");
                  
                  if (textoObsLimpio.includes("REEMPLAZO") || textoObsLimpio.includes("REMPLAZO") ||
                      textoNomLimpio.includes("REEMPLAZO") || textoNomLimpio.includes("REMPLAZO")) {
                    
                    let fechaS = extraerFechaSegura(rawDate);
                    let fechaTxt = fechaS ? Utilities.formatDate(fechaS, Session.getScriptTimeZone(), "dd/MM/yyyy") : "Sin Fecha";
                    
                    arrReemplazos.push({ fecha: fechaTxt, grupo: infoCab.grupoGeneral, colegio: infoCab.institucion, docente: docente || "NO REGISTRADO", cc: cc || "FALTA CC", observacion: obs, fileUrl: archivo.getUrl() });
                  }
                }
              });
            } catch(e) { continue; }
          }
        }
      }
    }
  }

  actualizarProgreso(1, 1, "Búsqueda Completada.");
  return { reemplazos: arrReemplazos, summaryMsg: `✅ Se encontraron ${arrReemplazos.length} reemplazos registrados.` };
}

function obtenerHistorialPlaneacionesJSON() {
  try {
    const ss = SpreadsheetApp.openById(ID_ARCHIVO_SEGUIMIENTO);
    const hoja = ss.getSheetByName("SEGUIMIENTO_PLANEACIONES");
    if (!hoja) throw new Error("No se encontró la hoja SEGUIMIENTO_PLANEACIONES en el archivo maestro.");

    const data = hoja.getDataRange().getValues();
    const backgrounds = hoja.getDataRange().getBackgrounds();
    
    if (data.length < 1) return { headers: [], rows: [] };

    const headers = data[0].map((text, i) => ({
      text: text,
      bgColor: backgrounds[0][i],
      textColor: (backgrounds[0][i] === "#5dd39e" || backgrounds[0][i] === "#ffffff") ? "#000000" : "#ffffff" 
    }));

    const rows = [];
    for (let i = 1; i < data.length; i++) {
      let rowCells = [];
      for (let j = 0; j < data[i].length; j++) {
        rowCells.push({
          value: data[i][j],
          bgColor: backgrounds[i][j]
        });
      }
      rows.push(rowCells);
    }

    return { headers: headers, rows: rows, summaryMsg: "✅ Historial sincronizado correctamente desde Sheets." };

  } catch(e) {
    throw new Error("Fallo al leer el historial: " + e.message);
  }
}

// ------------------------------------------------
// 7. COPIA DE RESPALDO (MEMORIA Y RELEVOS)
// ------------------------------------------------
function iniciarCopiaListasAPI(params) {
  const mesOrigenCrudo = params.mesOrigen || "07";
  const matchNum = mesOrigenCrudo.match(/\d{2}/);
  const mesOrigen = matchNum ? matchNum[0] : "07";

  const mesDestinoCrudo = params.mesDestino || "Julio (07)";
  const matchDestNum = mesDestinoCrudo.match(/\d{2}/);
  const numDest = matchDestNum ? matchDestNum[0] : "";
  const textoDest = mesDestinoCrudo.replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñ]/g, "").toUpperCase();
  const mesDestino = numDest ? `${numDest}_${textoDest}` : textoDest;

  const colegiosSeleccionados = normalizarLista(params.colegios);
  const semanaDestino = params.semanaDestino || "SEMANA 1";

  actualizarProgreso(0, 1, "Escaneando archivos a respaldar...");

  let carpetaRaiz;
  try { carpetaRaiz = DriveApp.getFolderById(API_ID_CARPETA_RAIZ); }
  catch(e) { throw new Error("No hay acceso a la carpeta raíz de origen."); }

  let listaArchivos = [];
  const carpetasColegios = carpetaRaiz.getFolders();
  while (carpetasColegios.hasNext()) {
    const carpetaColegio = carpetasColegios.next();
    if (colegiosSeleccionados.length > 0 && !colegiosSeleccionados.includes(carpetaColegio.getName())) continue;

    const carpetasLineas = carpetaColegio.getFolders();
    while (carpetasLineas.hasNext()) {
      const carpetasMeses = carpetasLineas.next().getFolders();
      while (carpetasMeses.hasNext()) {
        const archivos = carpetasMeses.next().getFilesByType(MimeType.GOOGLE_SHEETS);
        while (archivos.hasNext()) {
          const archivo = archivos.next();
          if (archivo.getName().startsWith(mesOrigen + "_")) {
            listaArchivos.push({ id: archivo.getId(), nombre: archivo.getName() });
          }
        }
      }
    }
  }

  if (listaArchivos.length === 0) {
     actualizarProgreso(1, 1, "No se encontraron archivos.");
     return { status: "error", message: "No se encontraron archivos para copiar." };
  }

  PropertiesService.getScriptProperties().setProperty("QUEUE_COPIA", JSON.stringify({
    pendientes: listaArchivos,
    total: listaArchivos.length,
    mesDestino: mesDestino,
    semanaDestino: semanaDestino
  }));

  procesarLoteCopias(true);

  return { status: "success", message: `Copia iniciada en lotes...` };
}

function procesarLoteCopias(esInicial) {
  // Ajuste de tiempos optimizados para evitar sobrepasar límites de ejecución
  const TIEMPO_INICIO = Date.now();
  const TIEMPO_MAXIMO = (esInicial === true) ? 60000 : 240000; // 1 min inicial (web request rápido) / 4 min en relevos

  const props = PropertiesService.getScriptProperties();
  const queueData = props.getProperty("QUEUE_COPIA");
  if (!queueData) return;

  props.deleteProperty("CANCEL_COPIA");

  let queue = JSON.parse(queueData);
  let pendientes = queue.pendientes;
  let total = queue.total;

  let carpetaCopiasRaiz;
  try { carpetaCopiasRaiz = DriveApp.getFolderById(ID_CARPETA_COPIAS); }
  catch (e) { return; }

  let carpetaMes = obtenerOCrearCarpeta(carpetaCopiasRaiz, queue.mesDestino);
  let carpetaSemana = obtenerOCrearCarpeta(carpetaMes, queue.semanaDestino);

  while (pendientes.length > 0) {
    if (props.getProperty("CANCEL_COPIA") === "true") {
       props.deleteProperty("CANCEL_COPIA");
       return; 
    }

    if (Date.now() - TIEMPO_INICIO > TIEMPO_MAXIMO) {
      queue.pendientes = pendientes;
      props.setProperty("QUEUE_COPIA", JSON.stringify(queue));
      
      let copiados = total - pendientes.length;
      actualizarProgreso(copiados, total, `Copiados ${copiados}/${total}. Pausa de seguridad (1 min)... NO CIERRES.`);
      
      limpiarTriggersCopias(); 
      ScriptApp.newTrigger("procesarLoteCopiasCron").timeBased().after(60 * 1000).create();
      return;
    }

    const archivoInfo = pendientes.pop();
    try {
      let file = DriveApp.getFileById(archivoInfo.id);
      file.makeCopy("COPIA " + archivoInfo.nombre, carpetaSemana);
    } catch(e) {}

    let procesados = total - pendientes.length;
    actualizarProgreso(procesados, total, `Copiando: ${archivoInfo.nombre}`);
  }

  props.deleteProperty("QUEUE_COPIA");
  limpiarTriggersCopias();
  actualizarProgreso(1, 1, "¡Todas las listas han sido copiadas!");
}

function cancelarCopiaAPI() {
  const props = PropertiesService.getScriptProperties();
  props.deleteProperty("QUEUE_COPIA");
  props.setProperty("CANCEL_COPIA", "true");
  limpiarTriggersCopias();
  actualizarProgreso(1, 1, "Proceso abortado. Se detuvo la copia de archivos.");
  return { status: "success", message: "Copia detenida en el servidor." };
}

function obtenerOCrearCarpeta(carpetaPadre, nombreBuscado) {
  let carpetas = carpetaPadre.getFolders();
  let nombreBuscadoLimpio = String(nombreBuscado).trim().toUpperCase();

  while (carpetas.hasNext()) {
    let carpetaActual = carpetas.next();
    if (carpetaActual.getName().trim().toUpperCase() === nombreBuscadoLimpio) {
      return carpetaActual; 
    }
  }
  return carpetaPadre.createFolder(nombreBuscadoLimpio);
}

function procesarLoteCopiasCron() {
  limpiarTriggersCopias();
  procesarLoteCopias(false);
}

function limpiarTriggersCopias() {
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === 'procesarLoteCopiasCron') ScriptApp.deleteTrigger(t);
  });
}

function cargarHistorialPlaneacionesEnMemoria(mesSeleccionado) {
  const mapaHistorial = {};
  try {
    const ssSeguimiento = SpreadsheetApp.openById(ID_ARCHIVO_SEGUIMIENTO);
    const hojaSeguimiento = ssSeguimiento.getSheetByName("SEGUIMIENTO_PLANEACIONES");
    if (hojaSeguimiento) {
      const dataSeg = hojaSeguimiento.getDataRange().getValues();
      if (dataSeg.length < 2) return mapaHistorial;
      
      const cabeceras = dataSeg[0];
      const colsAnteriores = [];
      
      for (let c = 2; c < cabeceras.length; c++) {
        let header = String(cabeceras[c]).trim();
        let mesCol = header.substring(0, 2);
        if (mesCol !== mesSeleccionado && !isNaN(Number(mesCol))) colsAnteriores.push(c);
      }
      
      for (let i = 1; i < dataSeg.length; i++) {
        let colegio = String(dataSeg[i][0] || "").trim();
        let grupo = String(dataSeg[i][1] || "").trim();
        if (colegio === "" || grupo === "") continue;
        
        let keySeg = `${colegio}|${grupo}`;
        let nums = [];
        
        colsAnteriores.forEach(c => {
          let v = dataSeg[i][c];
          if (v !== "" && v !== null && !isNaN(Number(v))) { let n = Number(v); if (n > 0) nums.push(n); }
        });
        
        if (nums.length > 0) {
          let maxVal = Math.max(...nums);
          let lastNum = nums[nums.length - 1];
          let trailing = [];
          
          for (let k = nums.length - 1; k >= 0; k--) {
            if (nums[k] === lastNum) trailing.unshift(nums[k]);
            else break;
          }
          mapaHistorial[keySeg] = { max: maxVal, trailing: trailing };
        } else {
          mapaHistorial[keySeg] = "N/A";
        }
      }
    }
  } catch (e) { }
  return mapaHistorial;
}

function obtenerInfoCabecera(data1, data2) {
  let dataCabecera = data1.length >= 8 ? data1 : data2;
  let institucion = "", grupoGeneral = "";
  for (let r = 0; r < Math.min(15, dataCabecera.length); r++) {
    let label = String(dataCabecera[r][0]).trim().toUpperCase();
    if (label === "COLEGIO") institucion = String(dataCabecera[r][1] || dataCabecera[r][2]).trim();
    if (label === "GRUPO") grupoGeneral = String(dataCabecera[r][1] || dataCabecera[r][2]).trim();
  }
  return { institucion, grupoGeneral };
}

function extraerConteoNL(data1, data2, infoCab, mapaNL, fileUrl) {
  [data1, data2].forEach((dataQ) => {
    if (dataQ.length < 8) return;
    for (let r = 7; r < dataQ.length; r++) {
      let nombre = String(dataQ[r][2] || "").trim(); 
      let documento = String(dataQ[r][4] || "").trim().toUpperCase(); 
      let estado = String(dataQ[r][12] || "").trim().toUpperCase().replace(/\s+/g, " "); 
      let asisUnica = String(dataQ[r][14] || "").trim(); 
      if (estado === "NL" && nombre !== "") {
        let asisContador = 0;
        for (let b = 0; b < 10; b++) { if (String(dataQ[r][15 + (b * 8) + 4]).trim() === "1") asisContador++; }
        let claveUnica = `${infoCab.institucion}|${infoCab.grupoGeneral}|${nombre}`;
        if (!mapaNL.has(claveUnica)) {
          mapaNL.set(claveUnica, { nombre, documento: documento || "VACÍO", colegio: infoCab.institucion, grupo: infoCab.grupoGeneral, asisUnica, totalAsis: asisContador, fileUrl });
        } else {
          let obj = mapaNL.get(claveUnica);
          if (obj.asisUnica === "" && asisUnica !== "") obj.asisUnica = asisUnica;
          obj.totalAsis += asisContador;
        }
      }
    }
  });
}

function extraerDuplicados(data1, data2, infoCab, mapaEstudiantes, fileUrl) {
  [data1, data2].forEach((dataQ) => {
    if (dataQ.length < 8) return;
    for (let r = 7; r < dataQ.length; r++) {
      let nombre = String(dataQ[r][2] || "").trim(); 
      let documento = String(dataQ[r][4] || "").trim().toUpperCase(); 
      let estado = String(dataQ[r][12] || "").trim().toUpperCase().replace(/\s+/g, " "); 
      if (documento && nombre) {
        if (!mapaEstudiantes.has(documento)) mapaEstudiantes.set(documento, []);
        let lista = mapaEstudiantes.get(documento);
        let existe = lista.find(e => e.grupo === infoCab.grupoGeneral && e.colegio === infoCab.institucion);
        if (!existe) lista.push({ colegio: infoCab.institucion, grupo: infoCab.grupoGeneral, estado, nombre, fileUrl });
        else if (existe.estado === "" && estado !== "") existe.estado = estado;
      }
    }
  });
}

function extraerBusquedaDocs(data1, data2, infoCab, targetDocs, mapaBusqueda, fileUrl) {
  if (targetDocs.size === 0) return;
  [data1, data2].forEach((dataQ) => {
    if (dataQ.length < 8) return;
    for (let r = 7; r < dataQ.length; r++) {
      let nombre = String(dataQ[r][2] || "").trim(); 
      let documento = String(dataQ[r][4] || "").trim().toUpperCase(); 
      if (documento && targetDocs.has(documento)) {
        let asisContadorBuscar = 0;
        for (let b = 0; b < 10; b++) { if (String(dataQ[r][15 + (b * 8) + 4]).trim() === "1") asisContadorBuscar++; }
        let cKey = `${documento}|${infoCab.institucion}|${infoCab.grupoGeneral}`;
        if (!mapaBusqueda.has(cKey)) mapaBusqueda.set(cKey, { doc: documento, nombre, colegio: infoCab.institucion, grupo: infoCab.grupoGeneral, totalAsis: asisContadorBuscar, fileUrl });
        else mapaBusqueda.get(cKey).totalAsis += asisContadorBuscar;
      }
    }
  });
}

function agruparIDKsAux(arr) {
  if (arr.length === 0) return ""; 
  if (arr.length <= 5) return "IDK: " + arr.join(", ");
  let numArr = arr.map(Number).filter(n => !isNaN(n)).sort((a,b) => a-b);
  let rangos = [], inicio = numArr[0], fin = numArr[0];
  for (let i = 1; i < numArr.length; i++) {
    if (numArr[i] === fin + 1) fin = numArr[i];
    else { rangos.push(inicio === fin ? inicio : inicio + "-" + fin); inicio = numArr[i]; fin = numArr[i]; }
  }
  rangos.push(inicio === fin ? inicio : inicio + "-" + fin);
  return "IDK: " + rangos.join(", ");
}

function extraerFechaSegura(raw) {
  if (raw instanceof Date) return new Date(raw);
  let match = String(raw).trim().match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})$/);
  if (match) {
    let y = parseInt(match[3], 10);
    return new Date(y < 100 ? y + 2000 : y, parseInt(match[2], 10) - 1, parseInt(match[1], 10));
  }
  return null;
}

function iniciarConsolidacionAPI(params) {
  return { mensaje: "Consolidación en cola de ejecución." };
}

function obtenerEstadoConsolidacionAPI() {
  return { estado: "listo", mensaje: "Consolidador disponible." };
}

// ------------------------------------------------
// 8. REPORTE NIÑOS CERO
// ------------------------------------------------
function ejecutarReporteNinosCero(colegiosSeleccionados, mesSeleccionado, folderId) {
  actualizarProgreso(0, 1, "Buscando Niños con Atención Única 0...");
  const idRaiz = folderId || API_ID_CARPETA_RAIZ;
  let carpetaRaiz;
  try { carpetaRaiz = DriveApp.getFolderById(idRaiz); } 
  catch (e) { return { ninosCeroData: [], count: 0, summaryMsg: "Error al acceder a Drive." }; }

  const resultadosArr = [];
  let colegiosAProcesar = [];
  const carpetasColegios = carpetaRaiz.getFolders();
  
  while (carpetasColegios.hasNext()) {
    let c = carpetasColegios.next();
    if (colegiosSeleccionados && colegiosSeleccionados.length > 0 && !colegiosSeleccionados.includes(c.getName())) continue;
    colegiosAProcesar.push(c);
  }

  const total = colegiosAProcesar.length;
  let procesados = 0;

  for (let carpetaColegio of colegiosAProcesar) {
    procesados++;
    let porcentajeCalc = Math.round((procesados / total) * 100);
    if (porcentajeCalc >= 100) porcentajeCalc = 99;
    
    PropertiesService.getScriptProperties().setProperty("PROGRESO_ACTUAL", JSON.stringify({
      porcentaje: porcentajeCalc,
      mensaje: `Analizando: ${carpetaColegio.getName()}`
    }));

    const carpetasLineas = carpetaColegio.getFolders();
    while (carpetasLineas.hasNext()) {
      const carpetasMeses = carpetasLineas.next().getFolders();
      while (carpetasMeses.hasNext()) {
        const archivos = carpetasMeses.next().getFilesByType(MimeType.GOOGLE_SHEETS);
        while (archivos.hasNext()) {
          const archivo = archivos.next();
          if (archivo.getName().startsWith(mesSeleccionado + "_")) {
            try {
              const libro = SpreadsheetApp.openById(archivo.getId());
              const h1 = libro.getSheetByName("1RA QUINCENA");
              const h2 = libro.getSheetByName("2DA QUINCENA");
              const data1 = h1 ? h1.getDataRange().getValues() : [];
              const data2 = h2 ? h2.getDataRange().getValues() : [];
              if (data1.length < 8 && data2.length < 8) continue;
              
              const infoCab = obtenerInfoCabecera(data1, data2);
              let mapaEstudiantes = new Map();

              // Procesar 1ra Quincena
              if (data1.length >= 8) {
                for (let r = 7; r < data1.length; r++) {
                  let docRaw = data1[r][4];
                  let nomRaw = data1[r][2];
                  let estadoRaw = data1[r][12];
                  let atencionRaw = data1[r][14];
                  
                  let doc = (docRaw !== undefined && docRaw !== null) ? String(docRaw).trim() : "";
                  let nom = (nomRaw !== undefined && nomRaw !== null) ? String(nomRaw).trim() : "";
                  let estado = (estadoRaw !== undefined && estadoRaw !== null) ? String(estadoRaw).trim().toUpperCase().replace(/\s+/g, " ") : "";
                  let atencion = (atencionRaw !== undefined && atencionRaw !== null && atencionRaw !== "") ? String(atencionRaw).trim() : "";
                  
                  if (doc !== "" && nom !== "") {
                    mapaEstudiantes.set(doc, { nombre: nom, estado: estado, q1: atencion, q2: null, colegio: infoCab.institucion, grupo: infoCab.grupoGeneral });
                  }
                }
              }

              // Procesar 2da Quincena
              if (data2.length >= 8) {
                for (let r = 7; r < data2.length; r++) {
                  let docRaw = data2[r][4];
                  let nomRaw = data2[r][2];
                  let estadoRaw = data2[r][12];
                  let atencionRaw = data2[r][14];
                  
                  let doc = (docRaw !== undefined && docRaw !== null) ? String(docRaw).trim() : "";
                  let nom = (nomRaw !== undefined && nomRaw !== null) ? String(nomRaw).trim() : "";
                  let estado = (estadoRaw !== undefined && estadoRaw !== null) ? String(estadoRaw).trim().toUpperCase().replace(/\s+/g, " ") : "";
                  let atencion = (atencionRaw !== undefined && atencionRaw !== null && atencionRaw !== "") ? String(atencionRaw).trim() : "";
                  
                  if (doc !== "" && nom !== "") {
                    if (mapaEstudiantes.has(doc)) {
                      let est = mapaEstudiantes.get(doc);
                      est.q2 = atencion;
                      if (est.estado === "" && estado !== "") est.estado = estado;
                    } else {
                      mapaEstudiantes.set(doc, { nombre: nom, estado: estado, q1: null, q2: atencion, colegio: infoCab.institucion, grupo: infoCab.grupoGeneral });
                    }
                  }
                }
              }

              // Lógica de Extracción (Regla de Oro)
              for (let [documento, datos] of mapaEstudiantes.entries()) {
                let val1 = datos.q1;
                let val2 = datos.q2;
                
                let tieneCero = (val1 === "0" || val2 === "0");
                let tieneOtroNumero = false;
                
                if (val1 !== null && val1 !== "" && val1 !== "0") tieneOtroNumero = true;
                if (val2 !== null && val2 !== "" && val2 !== "0") tieneOtroNumero = true;

                if (tieneCero && !tieneOtroNumero) {
                   resultadosArr.push({
                     "DOCUMENTO": documento,
                     "NOMBRE DEL BENEFICIARIO": datos.nombre,
                     "ESTADO": datos.estado || "SIN ESTADO",
                     "COLEGIO": datos.colegio,
                     "GRUPO": datos.grupo
                   });
                }
              }
            } catch(e) { continue; }
          }
        }
      }
    }
  }

  PropertiesService.getScriptProperties().setProperty("PROGRESO_ACTUAL", JSON.stringify({
    porcentaje: 100,
    mensaje: "Preparando archivo para descarga local..."
  }));
  
  return { ninosCeroData: resultadosArr, count: resultadosArr.length, summaryMsg: `Listo para descargar.` };
}
