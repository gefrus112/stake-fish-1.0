"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getEngine,
  type EngineInfo,
  type EngineStatus,
  type AnalyzeOptions,
} from "@/lib/engine/engine-client";

export function useEngine() {
  const engine = useMemo(() => getEngine(), []);
  const [status, setStatus] = useState<EngineStatus>("idle");
  const [statusDetail, setStatusDetail] = useState<string | undefined>(undefined);
  const [info, setInfo] = useState<EngineInfo | null>(null);

  useEffect(() => {
    const offStatus = engine.onStatus((s, detail) => {
      setStatus(s);
      setStatusDetail(detail);
    });
    const offInfo = engine.onInfo((i) => setInfo(i));
    engine.init().catch(() => {
      /* status callback already flipped to error */
    });
    return () => {
      offStatus();
      offInfo();
    };
  }, [engine]);

  const analyze = useCallback(
    (fen: string, opts: AnalyzeOptions = {}) => engine.analyze(fen, opts),
    [engine]
  );

  const stop = useCallback(() => engine.stop(), [engine]);

  return { status, statusDetail, info, analyze, stop };
}
