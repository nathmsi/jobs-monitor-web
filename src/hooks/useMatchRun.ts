import { useCallback, useEffect, useReducer, useRef } from "react";

import type { MatchedOffer } from "../api/client";
import { consumeMatchStream } from "../api/stream";
import { errorMessage } from "../utils/errorMessage";

export interface MatchStep {
  /** The server's call id (parallel searches share a tool name). */
  id: string;
  name: string;
  input: unknown;
  status: "running" | "done" | "failed";
  /** Milliseconds, once the step finished. */
  duration?: number;
}

export interface MatchFilters {
  region?: string;
  kind?: string;
  remote?: boolean;
}

export type MatchStatus = "idle" | "running" | "done" | "error";

interface State {
  status: MatchStatus;
  steps: MatchStep[];
  results: MatchedOffer[];
  error: string | null;
}

type Action =
  | { type: "start" }
  | { type: "call"; step: MatchStep }
  | { type: "result"; id: string; name: string; ok: boolean; duration: number }
  | { type: "done"; results: MatchedOffer[] }
  | { type: "fail"; message: string };

const INITIAL: State = { status: "idle", steps: [], results: [], error: null };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "start":
      return { status: "running", steps: [], results: [], error: null };
    case "call":
      return { ...state, steps: [...state.steps, action.step] };
    case "result": {
      // Match by call id; a server without ids falls back to the first running step of that name.
      let target = state.steps.findIndex((s) => s.status === "running" && s.id === action.id);
      if (target === -1) target = state.steps.findIndex((s) => s.status === "running" && s.name === action.name);
      if (target === -1) return state;
      const status = action.ok ? "done" : "failed";
      return {
        ...state,
        steps: state.steps.map((s, i) => (i === target ? { ...s, status, duration: action.duration } : s)),
      };
    }
    case "done":
      return { ...state, status: "done", results: action.results };
    case "fail":
      return { ...state, status: "error", error: action.message };
  }
}

/**
 * Runs the match for a CV and exposes its live progress: every search the agent
 * makes, then the ranked offers. A new run (or unmounting) cancels the previous one.
 */
export function useMatchRun(cv: string) {
  const [state, dispatch] = useReducer(reducer, INITIAL);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  const run = useCallback(
    async (filters: MatchFilters = {}) => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      dispatch({ type: "start" });

      try {
        const results = await consumeMatchStream(
          cv.trim(),
          filters,
          {
            onToolCall: (name, input, callId) =>
              dispatch({ type: "call", step: { id: callId ?? name, name, input, status: "running" } }),
            onToolResult: (name, duration, ok, callId) =>
              dispatch({ type: "result", id: callId ?? name, name, ok, duration }),
          },
          ctrl.signal,
        );
        if (!ctrl.signal.aborted) dispatch({ type: "done", results: results ?? [] });
      } catch (e) {
        if (!ctrl.signal.aborted) dispatch({ type: "fail", message: errorMessage(e) });
      }
    },
    [cv],
  );

  return { ...state, run, busy: state.status === "running", hasRun: state.status !== "idle" };
}
