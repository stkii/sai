import { emitTo } from '@tauri-apps/api/event';
import { getCurrentWebviewWindow, WebviewWindow } from '@tauri-apps/api/webviewWindow';
import type { AnalysisResultPayload } from '../../analysis/api';
import { ANALYSIS_READY_EVENT, ANALYSIS_RESULT_EVENT, RESULT_WINDOW_LABEL } from '../events';

const RESULT_WINDOW_READY_TIMEOUT_MS = 5000;

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

const toTaggedWindowError = (code: string, message: string): Error => {
  return new Error(`[${code}] ${message}`);
};

const waitForResultWindowReady = async () => {
  const currentWindow = getCurrentWebviewWindow();

  let resolveReady: (() => void) | null = null;
  let rejectReady: ((error: Error) => void) | null = null;
  let settled = false;
  const ready = new Promise<void>((resolve, reject) => {
    resolveReady = resolve;
    rejectReady = (error) => reject(error);
  });

  const unlisten = await currentWindow.listen(ANALYSIS_READY_EVENT, (event) => {
    if (settled) {
      return;
    }
    const payload = event.payload as { label?: unknown } | null;
    if (payload?.label !== RESULT_WINDOW_LABEL) {
      return;
    }
    settled = true;
    if (resolveReady) {
      resolveReady();
    }
  });

  const timeoutId = setTimeout(() => {
    if (settled) {
      return;
    }
    settled = true;
    if (rejectReady) {
      rejectReady(
        toTaggedWindowError(
          'RESULT_WINDOW_READY_TIMEOUT',
          `結果ウィンドウの初期化待機がタイムアウトしました (${RESULT_WINDOW_READY_TIMEOUT_MS}ms)`
        )
      );
    }
  }, RESULT_WINDOW_READY_TIMEOUT_MS);

  try {
    await ready;
  } finally {
    clearTimeout(timeoutId);
    unlisten();
  }
};

export const openResultWindow = async () => {
  const existing = await WebviewWindow.getByLabel(RESULT_WINDOW_LABEL);
  if (existing) {
    await existing.show();
    await existing.setFocus();
    return;
  }

  const ready = waitForResultWindowReady();
  const resultWindow = new WebviewWindow(RESULT_WINDOW_LABEL, {
    url: '/windows/result-window.html',
    title: 'SAI (結果ビュー)',
    width: 960,
    height: 720,
    minWidth: 860,
    minHeight: 600,
  });

  try {
    await new Promise<void>((resolve, reject) => {
      resultWindow.once('tauri://created', () => resolve());
      resultWindow.once('tauri://error', (event) => {
        reject(toTaggedWindowError('RESULT_WINDOW_CREATE_FAILED', toWindowErrorMessage(event)));
      });
    });

    await ready;
  } catch (error: unknown) {
    const normalized = error instanceof Error ? error : new Error(String(error));
    console.error(normalized.message);
    throw normalized;
  }
};

export const emitResultToResultWindow = async (payload: AnalysisResultPayload) => {
  await emitTo(RESULT_WINDOW_LABEL, ANALYSIS_RESULT_EVENT, payload);
};
