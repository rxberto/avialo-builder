import { useState, useEffect, useCallback, useRef } from 'react';
import { getJobLogsSSEUrl, getJob } from './api';

/**
 * Hook de React para escuchar los logs SSE de un job del orquestador.
 * Se suscribe automáticamente al stream cuando se proporciona un jobId.
 * Se desuscribe al desmontar el componente.
 */
export function useJobSSE(jobId) {
  const [logs, setLogs] = useState([]);
  const [status, setStatus] = useState('pending');
  const [progress, setProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [error, setError] = useState(null);
  const esRef = useRef(null);
  const pollingRef = useRef(null);

  const cleanup = useCallback(() => {
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  // Polling de estado como respaldo por si SSE no llega a tiempo
  const startPolling = useCallback(() => {
    if (!jobId || pollingRef.current) return;
    pollingRef.current = setInterval(async () => {
      try {
        const job = await getJob(jobId);
        setError(null);
        setStatus(job.status);
        setProgress(job.progress ?? 0);
        if (job.previewUrl) setPreviewUrl(job.previewUrl);
        if (job.status === 'deployed' || job.status === 'failed') {
          cleanup();
        }
      } catch {
        // silencioso
      }
    }, 3000);
  }, [jobId, cleanup]);

  useEffect(() => {
    if (!jobId) return;

    // Conectar SSE
    const url = getJobLogsSSEUrl(jobId);
    const es = new EventSource(url);
    esRef.current = es;

    es.addEventListener('log', (e) => {
      try {
        const data = JSON.parse(e.data);
        setLogs((prev) => [...prev, data.message ?? e.data]);
      } catch {
        setLogs((prev) => [...prev, e.data]);
      }
    });

    es.addEventListener('progress', (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.status) setStatus(data.status);
        if (data.progress !== undefined) setProgress(data.progress);
        if (data.previewUrl) setPreviewUrl(data.previewUrl);
        if (data.status === 'deployed' || data.status === 'failed') {
          cleanup();
        }
      } catch {
        // silencioso
      }
    });

    es.onerror = () => {
      // SSE cerrado — activar polling como respaldo y exponer el fallo
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }
      setError('Conexión de logs en tiempo real interrumpida; usando sondeo periódico.');
      startPolling();
    };

    startPolling();

    return cleanup;
  }, [jobId, cleanup, startPolling]);

  return { logs, status, progress, previewUrl, error };
}
