import { ReportData, DiarioRow, NlRow, PlaneacionRow, RefrigerioRow, DocenteRow } from "./types";

export const MOCK_SCHOOLS = [
  "Colegio Colsubsidio Chicalá",
  "Colegio Colsubsidio Maiporé",
  "Colegio Colsubsidio Torca",
  "Colegio Colsubsidio Ciudad Roma",
  "Colegio Colsubsidio San Vicente",
  "Liceo Técnico Colsubsidio",
  "Colegio Colsubsidio Las Mercedes"
];

export const MONTHS = [
  { value: "01", label: "Enero (01)" },
  { value: "02", label: "Febrero (02)" },
  { value: "03", label: "Marzo (03)" },
  { value: "04", label: "Abril (04)" },
  { value: "05", label: "Mayo (05)" },
  { value: "06", label: "Junio (06)" },
  { value: "07", label: "Julio (07)" },
  { value: "08", label: "Agosto (08)" },
  { value: "09", label: "Septiembre (09)" },
  { value: "10", label: "Octubre (10)" },
  { value: "11", label: "Noviembre (11)" },
  { value: "12", label: "Diciembre (12)" }
];

export function generateMockReportData(month: string, selectedSchools: string[]): ReportData {
  const schools = selectedSchools.length > 0 ? selectedSchools : MOCK_SCHOOLS;
  const diario: DiarioRow[] = [];
  const nl: NlRow[] = [];
  const planeaciones: PlaneacionRow[] = [];
  const refrigerios: RefrigerioRow[] = [];
  const docentes: DocenteRow[] = [];

  const groups = ["Grupo 101", "Grupo 102", "Grupo 201", "Grupo 301", "Grupo 401", "Grupo 502"];
  const firstNames = ["Santiago", "Alejandro", "Valeria", "Mariana", "Juan", "Sofía", "Gabriela", "Mateo", "Camila", "Andrés"];
  const lastNames = ["Rodríguez", "Martínez", "Gómez", "López", "González", "Pérez", "Sánchez", "Ramírez", "Díaz", "Castro"];
  const teachersList = ["Sandra Milena Rojas", "Carlos Mario Aristizábal", "Claudia Patricia Silva", "John Jairo Bermúdez", "Martha Cecilia Restrepo"];

  schools.forEach(school => {
    groups.forEach((group) => {
      const day1 = Math.floor(Math.random() * 15) + 1;
      const date1 = `${day1.toString().padStart(2, "0")}/${month}/2026`;

      // ONLY generate rows that contain actual errors or alerts
      const hasPlanError = Math.random() > 0.6;
      const hasAsisError = Math.random() > 0.6;
      const hasTeacherAlert = Math.random() > 0.7;

      if (hasPlanError || hasAsisError || hasTeacherAlert) {
        diario.push({
          colegio: school,
          grupo: group,
          fechaSesion: date1,
          planeacion: hasPlanError ? "Falta Plan." : "OK",
          asistenciasFaltantes: hasAsisError ? `IDK: ${Math.floor(Math.random() * 300) + 100}, ${Math.floor(Math.random() * 300) + 100}` : "OK",
          alertaDocente: hasTeacherAlert ? "Falta CC Docente" : ""
        });
      }

      if (Math.random() > 0.6) {
        const studentName = `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
        const studentDoc = (Math.floor(Math.random() * 90000000) + 1000000000).toString();
        nl.push({
          nombre: studentName,
          documento: studentDoc,
          colegio: school,
          grupo: group,
          asistencia: "Novedad NL",
          observacion: Math.random() > 0.5 ? "Falta Asistencia Sesión 3 (Q1-S3)" : "Falta Documento de Soporte"
        });
      }

      const hasPlanFailure = Math.random() > 0.65;
      if (hasPlanFailure) {
        const fileId = `${month}_MM_${school.replace(/ /g, "_")}_${group.replace(/ /g, "_")}`;
        planeaciones.push({
          archivo: `${fileId}.xlsx`,
          estado: "❌ ERROR",
          ultimaPlaneacion: `Plan ${Math.floor(Math.random() * 4) + 1}`,
          detalles: Math.random() > 0.5 ? "Salto Planeacion:1 | Retrocesos:1" : "Falta Obs por Plan 0 (Q1-S2)",
          secuenciaActual: "1 → 2 → 4 → 3"
        });
      }

      if (Math.random() > 0.6) {
        const kidName = `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
        const kidDoc = (Math.floor(Math.random() * 90000000) + 1000000000).toString();
        const alertType = Math.random() > 0.5 
          ? `Asistió sin Refri (Q1-S${Math.floor(Math.random() * 5) + 1})` 
          : `Refri sin Asis (Q2-S${Math.floor(Math.random() * 5) + 1})`;
        
        refrigerios.push({
          nombre: kidName,
          documento: kidDoc,
          colegio: school,
          grupo: group,
          idk: (Math.floor(Math.random() * 8000) + 1000).toString(),
          alertaRefrigerio: alertType
        });
      }

      const hasTeacherChange = Math.random() > 0.7;
      const hasMissingCC = Math.random() > 0.7;
      if (hasTeacherChange || hasMissingCC) {
        const assignTeachers = `${teachersList[Math.floor(Math.random() * teachersList.length)]}${hasTeacherChange ? " / " + teachersList[Math.floor(Math.random() * teachersList.length)] : ""}`;
        docentes.push({
          grupo: `${school} - ${group}`,
          docentes: assignTeachers,
          alerta1raQuincena: hasTeacherChange ? "CAMBIO DOCENTE SIN REEMPLAZO" : "OK",
          alerta2daQuincena: hasMissingCC ? "Falta CC en S2" : "OK"
        });
      }
    });
  });

  return { diario, nl, planeaciones, refrigerios, docentes };
}

import { postToAppsScript } from "./services/apiService";

export async function fetchFromWebApp<T>(url: string, params: Record<string, any>, externalSignal?: AbortSignal): Promise<T> {
  return postToAppsScript<T>(url, params, externalSignal);
}

import * as XLSX from "xlsx";

export function exportToExcel(filename: string, headers: string[], rows: Record<string, any>[], keys: string[], sheetTitle: string = "Reporte") {
  // Map rows to clean objects with header names as keys
  const formattedData = rows.map(row => {
    const obj: Record<string, any> = {};
    headers.forEach((header, idx) => {
      const key = keys[idx];
      obj[header] = row[key] !== undefined && row[key] !== null ? row[key] : "";
    });
    return obj;
  });

  // Create worksheet from json data
  const worksheet = XLSX.utils.json_to_sheet(formattedData);

  // Set column widths automatically based on content length
  const colWidths = headers.map((header, idx) => {
    const key = keys[idx];
    const maxLen = Math.max(
      header.length,
      ...rows.map(row => String(row[key] || "").length)
    );
    return { wch: Math.min(Math.max(maxLen + 3, 12), 65) };
  });
  worksheet["!cols"] = colWidths;

  // Create workbook and append sheet
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetTitle);

  // Trigger download
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

export function exportToCSV(filename: string, headers: string[], rows: Record<string, any>[], keys: string[]) {
  const csvContent = [];
  csvContent.push(headers.map(h => `"${h.replace(/"/g, '""')}"`).join(","));

  rows.forEach(row => {
    const line = keys.map(key => {
      const val = row[key] !== undefined && row[key] !== null ? String(row[key]) : "";
      return `"${val.replace(/"/g, '""')}"`;
    }).join(",");
    csvContent.push(line);
  });

  const fullCsvString = csvContent.join("\n");
  const BOM = "\uFEFF";
  const blob = new Blob([BOM + fullCsvString], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
