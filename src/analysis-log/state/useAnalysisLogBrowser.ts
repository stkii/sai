import { emitTo } from '@tauri-apps/api/event';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { useEffect, useEffectEvent, useMemo, useState } from 'react';
import {
  ANALYSIS_METHODS,
  type AnalysisLogSummary,
  type AnalysisResultPayload,
  type MethodModule,
} from '../../analysis/api';
import { tauriIpc } from '../../ipc';
import {
  ANALYSIS_READY_EVENT,
  ANALYSIS_RESULT_EVENT,
  type AnalysisReadyPayload,
  DATA_WINDOW_LABEL,
} from '../../windows/events';
import { buildSearchText, getRecordCacheKey } from '../services/display';
import {
  ALL_ANALYSIS_FILTER,
  type AnalysisFilter,
  type AnalysisLogBrowserOptions,
  type LogSource,
  PERSISTENT_LOG_LIMIT,
  type SelectedIdsBySource,
} from '../types';

const METHODS: readonly MethodModule[] = ANALYSIS_METHODS;

export const useAnalysisLogBrowser = ({
  availableSources = ['session', 'persistent'],
  defaultSource,
  listenForLiveResults = availableSources.includes('session'),
  readyLabel = null,
}: AnalysisLogBrowserOptions = {}) => {
  const initialSource =
    defaultSource && availableSources.includes(defaultSource)
      ? defaultSource
      : (availableSources[0] ?? 'session');
  const [source, setSourceState] = useState<LogSource>(initialSource);
  const [sessionSummaries, setSessionSummaries] = useState<AnalysisLogSummary[]>([]);
  const [persistentSummaries, setPersistentSummaries] = useState<AnalysisLogSummary[]>([]);
  const [selectedIds, setSelectedIds] = useState<SelectedIdsBySource>({
    session: null,
    persistent: null,
  });
  const [recordsByKey, setRecordsByKey] = useState<Record<string, AnalysisResultPayload>>({});
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [analysisFilter, setAnalysisFilter] = useState<AnalysisFilter>(ALL_ANALYSIS_FILTER);
  const [sessionUpdateCount, setSessionUpdateCount] = useState(0);

  const currentSummaries = source === 'session' ? sessionSummaries : persistentSummaries;
  const currentSummariesById = useMemo(() => {
    return new Map(currentSummaries.map((item) => [item.id, item] as const));
  }, [currentSummaries]);

  const normalizedSearchQuery = searchQuery.trim().toLocaleLowerCase();
  const filteredSummaries = useMemo(() => {
    return currentSummaries.filter((item) => {
      if (analysisFilter !== ALL_ANALYSIS_FILTER && item.type !== analysisFilter) {
        return false;
      }
      if (!normalizedSearchQuery) {
        return true;
      }
      return buildSearchText(METHODS, item).includes(normalizedSearchQuery);
    });
  }, [analysisFilter, currentSummaries, normalizedSearchQuery]);

  const selectedId = selectedIds[source];
  const visibleSelectedId = useMemo(() => {
    if (selectedId && filteredSummaries.some((item) => item.id === selectedId)) {
      return selectedId;
    }
    return filteredSummaries[0]?.id ?? null;
  }, [filteredSummaries, selectedId]);

  const selectedSummary = useMemo(
    () => (visibleSelectedId ? (currentSummariesById.get(visibleSelectedId) ?? null) : null),
    [currentSummariesById, visibleSelectedId]
  );
  const selectedRecord = visibleSelectedId
    ? (recordsByKey[getRecordCacheKey(source, visibleSelectedId)] ?? null)
    : null;

  const ingestLiveResult = useEffectEvent((payload: AnalysisResultPayload) => {
    const nextSummary: AnalysisLogSummary = {
      id: payload.id,
      type: payload.type,
      timestamp: payload.timestamp,
      dataset: payload.dataset,
    };

    setSessionSummaries((prev) => {
      return [nextSummary, ...prev.filter((item) => item.id !== nextSummary.id)];
    });
    setRecordsByKey((prev) => ({
      ...prev,
      [getRecordCacheKey('session', payload.id)]: payload,
    }));
    setDetailError(null);

    if (source === 'session') {
      setSelectedIds((prev) => ({ ...prev, session: payload.id }));
      return;
    }

    setSessionUpdateCount((count) => count + 1);
  });

  useEffect(() => {
    if (!listenForLiveResults) {
      return;
    }

    let unlisten: (() => void) | null = null;
    let active = true;

    const setup = async () => {
      try {
        const webview = getCurrentWebviewWindow();
        unlisten = await webview.listen<AnalysisResultPayload>(ANALYSIS_RESULT_EVENT, (event) => {
          ingestLiveResult(event.payload);
        });

        if (readyLabel) {
          await emitTo<AnalysisReadyPayload>(DATA_WINDOW_LABEL, ANALYSIS_READY_EVENT, {
            label: readyLabel,
          });
        }
      } catch (error: unknown) {
        if (active) {
          setListError(error instanceof Error ? error.message : String(error));
        }
      }
    };

    void setup();

    return () => {
      active = false;
      if (unlisten) {
        unlisten();
      }
    };
  }, [listenForLiveResults, readyLabel]);

  useEffect(() => {
    if (!availableSources.includes(source)) {
      setSourceState(initialSource);
    }
  }, [availableSources, initialSource, source]);

  useEffect(() => {
    let cancelled = false;
    setListLoading(true);
    setListError(null);

    const loadSummaries = async () => {
      try {
        const items =
          source === 'session'
            ? await tauriIpc.listSessionAnalysisLogs()
            : await tauriIpc.listAnalysisLogs(PERSISTENT_LOG_LIMIT);

        if (cancelled) {
          return;
        }

        if (source === 'session') {
          setSessionSummaries(items);
        } else {
          setPersistentSummaries(items);
        }

        setSelectedIds((prev) => {
          const currentId = prev[source];
          const nextId = items.some((item) => item.id === currentId)
            ? currentId
            : (items[0]?.id ?? null);
          if (nextId === currentId) {
            return prev;
          }
          return { ...prev, [source]: nextId };
        });
      } catch (error: unknown) {
        if (!cancelled) {
          setListError(error instanceof Error ? error.message : String(error));
        }
      } finally {
        if (!cancelled) {
          setListLoading(false);
        }
      }
    };

    void loadSummaries();

    return () => {
      cancelled = true;
    };
  }, [source]);

  useEffect(() => {
    if (source === 'session') {
      setSessionUpdateCount(0);
    }
  }, [source]);

  useEffect(() => {
    if (!visibleSelectedId || selectedRecord) {
      return;
    }

    let cancelled = false;
    setDetailLoading(true);
    setDetailError(null);

    const fetchDetail = async () => {
      try {
        const record =
          source === 'session'
            ? await tauriIpc.getSessionAnalysisLog(visibleSelectedId)
            : await tauriIpc.getAnalysisLog(visibleSelectedId);

        if (cancelled) {
          return;
        }
        if (!record) {
          setDetailError('分析ログが見つかりません');
          return;
        }

        setRecordsByKey((prev) => ({
          ...prev,
          [getRecordCacheKey(source, visibleSelectedId)]: record,
        }));
      } catch (error: unknown) {
        if (!cancelled) {
          setDetailError(error instanceof Error ? error.message : String(error));
        }
      } finally {
        if (!cancelled) {
          setDetailLoading(false);
        }
      }
    };

    void fetchDetail();

    return () => {
      cancelled = true;
    };
  }, [selectedRecord, source, visibleSelectedId]);

  const selectRecord = (id: string) => {
    setSelectedIds((prev) => ({ ...prev, [source]: id }));
  };

  const setSource = (nextSource: LogSource) => {
    if (!availableSources.includes(nextSource)) {
      return;
    }
    setSourceState(nextSource);
  };

  return {
    availableSources,
    analysisFilter,
    currentSummariesCount: currentSummaries.length,
    detailError,
    detailLoading,
    filteredSummaries,
    listError,
    listLoading,
    methods: METHODS,
    normalizedSearchQuery,
    searchQuery,
    selectedRecord,
    selectedSummary,
    sessionUpdateCount,
    setAnalysisFilter,
    setSearchQuery,
    setSource,
    selectRecord,
    source,
    visibleSelectedId,
  };
};
