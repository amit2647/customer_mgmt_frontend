import { createContext, useCallback, useContext, useRef, useState } from "react";

import {
  getAssistantCapabilities,
  sendAssistantMessage,
} from "../api/assistant";

const AssistantContext = createContext(null);

/*
 * One conversation, shared by the docked panel and the full-page view.
 *
 * The state sits above both so that expanding the panel — or collapsing the
 * page back down — continues the same thread rather than starting a new one.
 * It is mounted inside AppLayout, so it also survives navigation between
 * screens; a browser reload still clears it, since the backend holds no
 * session and nothing is persisted.
 */
export function AssistantProvider({ children }) {
  const [messages, setMessages] = useState([]);
  const [pending, setPending] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [capabilities, setCapabilities] = useState(null);

  // Guarded by a ref rather than by reading state: both views call this on
  // mount, and under StrictMode each effect runs twice.
  const capabilitiesRequested = useRef(false);

  // Fetched once, on first use. What the assistant may actually do is re-read
  // server-side on every request; this list only drives the empty state.
  const loadCapabilities = useCallback(() => {
    if (capabilitiesRequested.current) {
      return;
    }

    capabilitiesRequested.current = true;

    getAssistantCapabilities()
      .then(setCapabilities)
      .catch(() => setCapabilities({ tools: [], configured: false }));
  }, []);

  const turn = useCallback(async (nextMessages, confirm) => {
    setBusy(true);
    setError("");
    setPending(null);

    try {
      const result = await sendAssistantMessage({
        messages: nextMessages,
        confirm,
      });

      const reply = (result.reply || "").trim();

      if (reply) {
        setMessages([...nextMessages, { role: "assistant", content: reply }]);
      }

      if (result.pendingAction) {
        setPending({ ...result.pendingAction, history: nextMessages });
      }
    } catch (requestError) {
      setError(requestError.message || "The assistant could not answer.");
    } finally {
      setBusy(false);
    }
  }, []);

  const send = useCallback(
    (text) => {
      const trimmed = text.trim();

      if (!trimmed || busy) {
        return;
      }

      // Built from the current messages rather than inside a state updater:
      // an updater can run twice, which would post the turn twice.
      const next = [...messages, { role: "user", content: trimmed }];

      setMessages(next);
      turn(next);
    },
    [messages, busy, turn],
  );

  const confirmAction = useCallback(() => {
    if (!pending) {
      return;
    }

    /*
     * The action goes back for the server to run. It re-checks the permission
     * rather than trusting this payload, so a tampered one still cannot exceed
     * what the signed-in user may do.
     */
    turn(pending.history, {
      callId: pending.callId,
      name: pending.name,
      arguments: pending.arguments,
    });
  }, [pending, turn]);

  const cancelAction = useCallback(() => {
    setPending(null);

    setMessages((current) => [
      ...current,
      { role: "assistant", content: "Cancelled — nothing was changed." },
    ]);
  }, []);

  const clear = useCallback(() => {
    setMessages([]);
    setPending(null);
    setError("");
  }, []);

  const value = {
    messages,
    pending,
    busy,
    error,
    capabilities,
    loadCapabilities,
    send,
    confirmAction,
    cancelAction,
    clear,
  };

  return (
    <AssistantContext.Provider value={value}>
      {children}
    </AssistantContext.Provider>
  );
}

export function useAssistant() {
  const context = useContext(AssistantContext);

  if (!context) {
    throw new Error("useAssistant must be used inside AssistantProvider");
  }

  return context;
}
