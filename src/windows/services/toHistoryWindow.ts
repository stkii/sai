import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { HISTORY_WINDOW_LABEL } from '../events';

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
      return '履歴ウィンドウの作成に失敗しました';
    }
  }
  return '履歴ウィンドウの作成に失敗しました';
};

const toTaggedWindowError = (code: string, message: string): Error => {
  return new Error(`[${code}] ${message}`);
};

export const openHistoryWindow = async () => {
  const existing = await WebviewWindow.getByLabel(HISTORY_WINDOW_LABEL);
  if (existing) {
    await existing.show();
    await existing.setFocus();
    return;
  }

  const historyWindow = new WebviewWindow(HISTORY_WINDOW_LABEL, {
    url: '/windows/history-window.html',
    title: 'SAI (分析履歴)',
    width: 1200,
    height: 742,
    minWidth: 1200,
    minHeight: 742,
  });

  await new Promise<void>((resolve, reject) => {
    historyWindow.once('tauri://created', () => resolve());
    historyWindow.once('tauri://error', (event) => {
      reject(toTaggedWindowError('HISTORY_WINDOW_CREATE_FAILED', toWindowErrorMessage(event)));
    });
  });
};
