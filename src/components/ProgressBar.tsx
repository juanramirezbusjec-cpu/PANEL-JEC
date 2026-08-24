import React, { useEffect, useState, useRef } from "react";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { fetchFromWebApp } from "../utils";

interface ProgressBarProps {
  isLoading: boolean;
  webAppUrl?: string;
  isDemoMode?: boolean;
  title?: string;
  statusText?: string;
  onStop?: () => void;
  accentColor?: "indigo" | "orange" | "amber" | "purple";
  onComplete?: (data?: { copiados?: number | string; total?: number | string }) => void;
  onProgress?: (pct: number) => void;
  onPollData?: (data: any) => void;
  defaultTotal?: number;
  initialDelayMs?: number;
}

export default function ProgressBar({
  isLoading,
  webAppUrl,
  isDemoMode = false,
  title = "Procesando información...",
  statusText = "Conectando con Google Apps Script...",
  onStop,
  accentColor = "indigo",
  onComplete,
  onProgress,
  onPollData,
  defaultTotal = 0,
  initialDelayMs = 0
}: ProgressBarProps) {
  const [progress, setProgress] = useState(0);
  const [currentStatusText, setCurrentStatusText] = useState(statusText);
  const [showComponent, setShowComponent] = useState(isLoading);

  const delayTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const fallbackIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const lastCopiadosRef = useRef<number | string | undefined>(undefined);
  const lastTotalRef = useRef<number | string | undefined>(defaultTotal);

  const onCompleteRef = useRef(onComplete);
  const onProgressRef = useRef(onProgress);
  const onPollDataRef = useRef(onPollData);

  useEffect(() => {
    onCompleteRef.current = onComplete;
    onProgressRef.current = onProgress;
    onPollDataRef.current = onPollData;
  }, [onComplete, onProgress, onPollData]);

  useEffect(() => {
    lastTotalRef.current = defaultTotal;
  }, [defaultTotal]);

  useEffect(() => {
    if (statusText && progress < 100) {
      setCurrentStatusText(statusText);
    }
  }, [statusText]);

  useEffect(() => {
    const clearAllIntervals = () => {
      if (delayTimeoutRef.current) {
        clearTimeout(delayTimeoutRef.current);
        delayTimeoutRef.current = null;
      }
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      if (fallbackIntervalRef.current) {
        clearInterval(fallbackIntervalRef.current);
        fallbackIntervalRef.current = null;
      }
    };

    if (!isLoading) {
      clearAllIntervals();
      setShowComponent(false);
      return;
    }

    // When loading starts: show component and initialize progress at 0%
    setShowComponent(true);
    setProgress(0);
    if (statusText) {
      setCurrentStatusText(statusText);
    }

    const canPoll = Boolean(webAppUrl && !isDemoMode && webAppUrl.trim().length > 0);

    const startPollingRoutine = () => {
      if (canPoll) {
        // Immediate polling call + 2500ms interval
        const doPoll = async () => {
          try {
            const response = await fetchFromWebApp<any>(webAppUrl, { action: "getProgress" });
            if (response) {
              if (onPollDataRef.current) {
                onPollDataRef.current(response);
              }
              const rawPct = response.porcentaje ?? response.data?.porcentaje ?? response.percent ?? response.data?.percent;
              const rawMsg = response.mensaje ?? response.data?.mensaje ?? response.message ?? response.data?.message;
              const rawCopiados = response.copiados ?? response.data?.copiados;
              const rawTotal = response.total ?? response.data?.total;

              if (rawCopiados !== undefined) lastCopiadosRef.current = rawCopiados;
              if (rawTotal !== undefined) lastTotalRef.current = rawTotal;

              if (rawPct !== undefined && rawPct !== null && !isNaN(Number(rawPct))) {
                let numPct = Number(rawPct);
                if (numPct > 0 && numPct <= 1) {
                  numPct = numPct * 100;
                }
                const clamped = Math.min(100, Math.max(0, Math.round(numPct)));
                setProgress(clamped);
                if (onProgressRef.current) {
                  onProgressRef.current(clamped);
                }

                if (clamped >= 100) {
                  setCurrentStatusText("Terminando análisis, aguarde unos instantes mientras se presenta la información...");
                  if (onCompleteRef.current) {
                    clearAllIntervals();
                    const cb = onCompleteRef.current;
                    setTimeout(() => {
                      setShowComponent(false);
                      cb({
                        copiados: lastCopiadosRef.current ?? lastTotalRef.current ?? defaultTotal,
                        total: lastTotalRef.current ?? defaultTotal
                      });
                    }, 1500);
                  }
                } else if (rawMsg && typeof rawMsg === "string" && rawMsg.trim().length > 0) {
                  setCurrentStatusText(rawMsg);
                }
              } else if (rawMsg && typeof rawMsg === "string" && rawMsg.trim().length > 0) {
                setProgress((currPct) => {
                  if (currPct < 100) {
                    setCurrentStatusText(rawMsg);
                  }
                  return currPct;
                });
              }
            }
          } catch (err) {
            // Ignore transient polling errors
          }
        };

        doPoll();
        pollIntervalRef.current = setInterval(doPoll, 2500);
      } else {
        // Fallback simulation for demo mode or local testing
        if (onPollDataRef.current) {
          onPollDataRef.current({ total: defaultTotal || 35, data: { total: defaultTotal || 35 } });
        }
        fallbackIntervalRef.current = setInterval(() => {
          if (onPollDataRef.current) {
            onPollDataRef.current({ total: defaultTotal || 35, data: { total: defaultTotal || 35 } });
          }
          setProgress((prev) => {
            const next = prev + 25;
            if (next >= 100) {
              setCurrentStatusText("Terminando análisis, aguarde unos instantes mientras se presenta la información...");
              if (onCompleteRef.current) {
                clearAllIntervals();
                const cb = onCompleteRef.current;
                setTimeout(() => {
                  setShowComponent(false);
                  cb({
                    copiados: defaultTotal,
                    total: defaultTotal
                  });
                }, 1500);
              }
              return 100;
            }
            return next;
          });
        }, 1000);
      }
    };

    if (initialDelayMs > 0) {
      delayTimeoutRef.current = setTimeout(startPollingRoutine, initialDelayMs);
    } else {
      startPollingRoutine();
    }

    return () => {
      clearAllIntervals();
    };
  }, [isLoading, webAppUrl, isDemoMode, initialDelayMs]);

  if (!showComponent) return null;

  const barColorClass =
    accentColor === "orange"
      ? "bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600"
      : accentColor === "amber"
      ? "bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600"
      : accentColor === "purple"
      ? "bg-gradient-to-r from-purple-600 via-fuchsia-500 to-purple-700"
      : "bg-gradient-to-r from-indigo-500 via-blue-500 to-indigo-600";

  const textColorClass =
    accentColor === "orange"
      ? "text-orange-900"
      : accentColor === "amber"
      ? "text-amber-900"
      : accentColor === "purple"
      ? "text-purple-900"
      : "text-indigo-900";

  const bgBoxClass =
    accentColor === "orange"
      ? "bg-orange-50/80 border-orange-200"
      : accentColor === "amber"
      ? "bg-amber-50/80 border-amber-200"
      : accentColor === "purple"
      ? "bg-purple-50/80 border-purple-200"
      : "bg-indigo-50/80 border-indigo-200";

  return (
    <div className={`p-3.5 rounded-lg border shadow-xs transition-all duration-300 ${bgBoxClass}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {progress === 100 ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 animate-bounce" />
          ) : (
            <Loader2 className={`w-4 h-4 animate-spin ${
              accentColor === 'orange' ? 'text-orange-600' : accentColor === 'purple' ? 'text-purple-600' : accentColor === 'amber' ? 'text-amber-600' : 'text-indigo-600'
            }`} />
          )}
          <span className={`text-xs font-bold font-sans uppercase tracking-tight ${textColorClass}`}>
            {progress === 100 ? "Proceso Completado" : title}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-black font-mono px-2 py-0.5 rounded border shadow-2xs ${
            progress === 100 ? "bg-emerald-100 text-emerald-800 border-emerald-300" : "bg-white/80 text-slate-700 border-slate-200"
          }`}>
            {progress}%
          </span>
          {onStop && progress < 100 && (
            <button
              type="button"
              onClick={onStop}
              className="inline-flex items-center gap-1 text-[10px] font-bold text-red-700 hover:text-red-800 bg-red-100 hover:bg-red-200 px-2 py-0.5 rounded transition cursor-pointer"
            >
              <XCircle className="w-3 h-3 text-red-600" />
              Detener
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar Track */}
      <div className="w-full bg-slate-200/80 rounded-full h-2.5 overflow-hidden p-0.5 shadow-inner">
        <div
          className={`h-full rounded-full transition-all duration-300 ease-out relative ${
            progress === 100 ? "bg-gradient-to-r from-emerald-500 to-teal-600" : barColorClass
          }`}
          style={{ width: `${progress}%` }}
        >
          {/* Shimmer effect inside progress bar */}
          <div className="absolute inset-0 bg-white/30 animate-pulse rounded-full" />
        </div>
      </div>

      <div className="flex items-center justify-between mt-1.5 text-[10px] text-slate-500">
        <span className="italic truncate">
          {progress >= 100
            ? "Terminando análisis, aguarde unos instantes mientras se presenta la información..."
            : currentStatusText}
        </span>
        <span className="shrink-0 font-medium text-slate-400">
          {progress >= 100 ? "¡Finalizado!" : "Por favor espera..."}
        </span>
      </div>
    </div>
  );
}

