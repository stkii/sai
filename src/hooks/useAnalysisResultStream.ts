import { emitTo } from '@tauri-apps/api/event';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { useEffect, useEffectEvent } from 'react';
import { ANALYSIS_READY_EVENT, ANALYSIS_RESULT_EVENT } from '../analysis/runtime/events';
import type { AnalysisReadyPayload, AnalysisResultPayload } from '../types';

interface Args {
  onReceiveResult: (payload: AnalysisResultPayload) => void;
}

export const useAnalysisResultStream = ({ onReceiveResult }: Args) => {
  const handleReceiveResult = useEffectEvent(onReceiveResult);

  useEffect(() => {
    let unlisten: (() => void) | null = null;
    let active = true;

    const setup = async () => {
      const webview = getCurrentWebviewWindow();
      unlisten = await webview.listen<AnalysisResultPayload>(ANALYSIS_RESULT_EVENT, (event) => {
        handleReceiveResult(event.payload);
      });
      if (!active) {
        return;
      }
      await emitTo<AnalysisReadyPayload>('dataView', ANALYSIS_READY_EVENT, { label: 'resultView' });
    };

    void setup();

    return () => {
      active = false;
      if (unlisten) {
        unlisten();
      }
    };
  }, []);
};
