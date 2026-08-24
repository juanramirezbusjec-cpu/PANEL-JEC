import React from "react";
import { ReportData } from "../types";
import { AlertCircle, Eye, ShieldAlert, Coffee, Users } from "lucide-react";

interface SummaryCardsProps {
  data: ReportData;
  onSelectTab: (tabId: string) => void;
  activeTab: string;
}

export default function SummaryCards({ data, onSelectTab, activeTab }: SummaryCardsProps) {
  // 1. Diario (Alerts are entries with Falta Plan, missing attendance, or teacher alerts)
  const diarioAlerts = (data.diario || []).filter(
    item => (item.planeacion && item.planeacion !== "OK") || (item.asistenciasFaltantes && item.asistenciasFaltantes !== "OK") || (item.alertaDocente && item.alertaDocente.trim() !== "")
  ).length;

  // 2. NL (All pencils are anomalies)
  const nlAlerts = (data.nl || []).length;

  // 3. Planeaciones (Errors or warnings)
  const planeacionAlerts = (data.planeaciones || []).filter(
    item => (item.estado && (item.estado.toUpperCase().includes("ERROR") || item.estado.includes("❌"))) || (item.detalles && item.detalles !== "OK")
  ).length;

  // 4. Refrigerios (All snack list entries are discrepancies/alerts)
  const refrigerioAlerts = (data.refrigerios || []).length;

  // 5. Docentes (Alerts on quincenas)
  const docenteAlerts = (data.docentes || []).filter(
    item => (item.alerta1raQuincena && item.alerta1raQuincena !== "OK") || (item.alerta2daQuincena && item.alerta2daQuincena !== "OK") || (item.observacion && item.observacion.trim() !== "")
  ).length;

  const cards = [
    {
      id: "diario",
      title: "Alertas Diarias",
      count: diarioAlerts,
      total: data.diario.length,
      color: "#4A86E8",
      bgColor: "bg-[#4A86E8]/5",
      borderColor: "border-[#4A86E8]/20",
      textColor: "text-[#4A86E8]",
      icon: AlertCircle,
      description: "Planeaciones faltantes, inasistencias o errores CC"
    },
    {
      id: "nl",
      title: "Novedades NL",
      count: nlAlerts,
      total: data.nl.length,
      color: "#FF9900",
      bgColor: "bg-[#FF9900]/5",
      borderColor: "border-[#FF9900]/20",
      textColor: "text-[#FF9900]",
      icon: Eye,
      description: "Niños a lápiz con novedades"
    },
    {
      id: "planeaciones",
      title: "ALERTA PLANEACIONES",
      count: planeacionAlerts,
      total: data.planeaciones.length,
      color: "#8E7CC3",
      bgColor: "bg-[#8E7CC3]/5",
      borderColor: "border-[#8E7CC3]/20",
      textColor: "text-[#8E7CC3]",
      icon: ShieldAlert,
      description: "Planeaciones con saltos, retrocesos o errores"
    },
    {
      id: "refrigerios",
      title: "Alertas Refrigerio",
      count: refrigerioAlerts,
      total: data.refrigerios.length,
      color: "#CC0000",
      bgColor: "bg-[#CC0000]/5",
      borderColor: "border-[#CC0000]/20",
      textColor: "text-[#CC0000]",
      icon: Coffee,
      description: "Estudiantes que asistieron sin recibir refrigerio"
    },
    {
      id: "docentes",
      title: "Alertas Docentes",
      count: docenteAlerts,
      total: data.docentes.length,
      color: "#38761D",
      bgColor: "bg-[#38761D]/5",
      borderColor: "border-[#38761D]/20",
      textColor: "text-[#38761D]",
      icon: Users,
      description: "Cambio de docente sin reemplazo o alertas Q1/Q2"
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
      {cards.map((card) => {
        const Icon = card.icon;
        const isActive = activeTab === card.id;

        return (
          <button
            key={card.id}
            onClick={() => onSelectTab(card.id)}
            className={`flex flex-col text-left p-2.5 rounded-lg border-y border-r border-l-4 transition-all duration-150 cursor-pointer ${
              isActive
                ? "bg-white shadow-xs ring-1 ring-slate-300/80"
                : "bg-white hover:bg-slate-50 border-slate-200"
            }`}
            style={{
              borderLeftColor: card.color,
              borderColor: isActive ? card.color : undefined,
              boxShadow: isActive ? `0 2px 6px ${card.color}15` : undefined
            }}
          >
            <div className="flex items-center justify-between w-full mb-2">
              <span className={`text-[10px] font-bold uppercase tracking-wider font-sans text-slate-500`}>
                {card.title}
              </span>
              <div className={`p-1 rounded ${card.bgColor} ${card.textColor}`}>
                <Icon className="w-3.5 h-3.5" />
              </div>
            </div>

            <div className="flex items-baseline gap-1 mb-0.5">
              <span className="text-2xl font-extrabold text-slate-900 font-sans tracking-tight">
                {card.count}
              </span>
              <span className="text-[9px] text-slate-400 font-medium">
                de {card.total} regs
              </span>
            </div>

            <p className="text-[10px] text-slate-500 leading-tight">
              {card.description}
            </p>

            <div className="mt-2 w-full bg-slate-100 rounded-full h-1">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${card.total > 0 ? (card.count / card.total) * 100 : 0}%`,
                  backgroundColor: card.color
                }}
              />
            </div>
          </button>
        );
      })}
    </div>
  );
}
