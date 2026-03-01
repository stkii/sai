import { emitTo } from '@tauri-apps/api/event';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { useCallback } from 'react';
import { ANALYSIS_READY_EVENT, ANALYSIS_RESULT_EVENT } from '../analysis/runtime/events';
import type { AnalysisResultPayload } from '../types';

interface Args {
  payload?: unknown;
}

const toWindowErrorMessage = (event: Args): string => {
  const payload = event?.payload;
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

export interface ResultWindowBridge {
  openResultWindow: () => Promise<void>;
  emitResult: (payload: AnalysisResultPayload) => Promise<void>;
}

export const useResultWindowBridge = (): ResultWindowBridge => {
  const openResultWindow = useCallback(async () => {
    const existing = await WebviewWindow.getByLabel('resultView');
    if (existing) {
      await existing.show();
      await existing.setFocus();
      return;
    }

    const ready = new Promise<void>((resolve) => {
      void WebviewWindow.getCurrent().once(ANALYSIS_READY_EVENT, () => resolve());
    });

    const resultWindow = new WebviewWindow('resultView', {
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
  }, []);

  const emitResult = useCallback(async (payload: AnalysisResultPayload) => {
    await emitTo('resultView', ANALYSIS_RESULT_EVENT, payload);
  }, []);

  return { openResultWindow, emitResult };
};
