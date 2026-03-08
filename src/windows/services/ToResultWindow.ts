import { emitTo } from '@tauri-apps/api/event';
import { getCurrentWebviewWindow, WebviewWindow } from '@tauri-apps/api/webviewWindow';
import type { AnalysisResultPayload } from '../../analysis/api';
import { ANALYSIS_READY_EVENT, ANALYSIS_RESULT_EVENT, RESULT_WINDOW_LABEL } from '../events';

interface WindowErrorEvent {
  payload?: unknown;
}

const toWindowErrorMessage = (event: WindowErrorEvent): string => {
  const payload = event.payload;
  if (typeof payload === 'string') {
    return payload;
  }
  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>;
    if (typeof record.message === 'string') {
      return record.message;
    }
    if (typeof record.error === 'string') {
      return record.error;
    }
    try {
      return JSON.stringify(payload);
    } catch {
      return '結果ウィンドウの作成に失敗しました';
    }
  }
  return '結果ウィンドウの作成に失敗しました';
};

const prepareResultWindowReadyWaiter = async () => {
  const currentWindow = getCurrentWebviewWindow();

  let resolveReady: (() => void) | null = null;
  const ready = new Promise<void>((resolve) => {
    resolveReady = resolve;
  });
  const unlisten = await currentWindow.listen(ANALYSIS_READY_EVENT, (event) => {
    const payload = event.payload as { label?: unknown } | null;
    if (payload?.label !== RESULT_WINDOW_LABEL) {
      return;
    }
    unlisten();
    if (resolveReady) {
      resolveReady();
    }
  });

  return ready;
};

export const openResultWindow = async () => {
  const existing = await WebviewWindow.getByLabel(RESULT_WINDOW_LABEL);
  if (existing) {
    await existing.show();
    await existing.setFocus();
    return;
  }

  const ready = await prepareResultWindowReadyWaiter();
  const resultWindow = new WebviewWindow(RESULT_WINDOW_LABEL, {
    url: '/windows/result-window.html',
    title: 'SAI (結果ビュー)',
    width: 960,
    height: 720,
    minWidth: 860,
    minHeight: 600,
  });

  await new Promise<void>((resolve, reject) => {
    resultWindow.once('tauri://created', () => resolve());
    resultWindow.once('tauri://error', (event) => reject(new Error(toWindowErrorMessage(event))));
  });

  await ready;
};

export const emitResultToResultWindow = async (payload: AnalysisResultPayload) => {
  await emitTo(RESULT_WINDOW_LABEL, ANALYSIS_RESULT_EVENT, payload);
};
