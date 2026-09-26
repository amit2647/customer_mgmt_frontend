import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  cancelAssistantAction,
  confirmAssistantAction,
  deleteConversation as deleteConversationRequest,
  getAssistantCapabilities,
  getConversationMessages,
  listConversations,
  newId,
  renameConversation as renameConversationRequest,
  sendConversationMessage,
} from "../api/assistant";

const AssistantContext = createContext(null);

/*
 * The conversation last opened in this browser, so a reload lands back on it.
 * A per-viewer convenience only: the thread itself lives on the server, and an
 * id belonging to someone else simply 404s and falls back to the most recent.
 */
const LAST_CONVERSATION_KEY = "omnicore_assistant_conversation";

function rememberConversation(id) {
  try {
    if (id) {
      localStorage.setItem(LAST_CONVERSATION_KEY, id);
    } else {
      localStorage.removeItem(LAST_CONVERSATION_KEY);
    }
  } catch {
    // Storage can be unavailable (private windows); the default still works.
  }
}

function recallConversation() {
  try {
    return localStorage.getItem(LAST_CONVERSATION_KEY);
  } catch {
    return null;
  }
}

/*
 * Folds server messages into the thread. The optimistic copy of a user message
 * is matched by its clientMessageId and replaced; everything else is keyed by
 * id, so a replayed response never shows a message twice.
 */
function mergeMessages(current, incoming) {
  const byClientId = new Map(
    incoming
      .filter((message) => message.clientMessageId)
      .map((message) => [message.clientMessageId, message]),
  );

  const known = new Set();

  const merged = current.map((message) => {
    const replacement =
      message.clientMessageId && byClientId.get(message.clientMessageId);

    const next = replacement || message;

    known.add(next.id);

    return next;
  });

  for (const message of incoming) {
    if (!known.has(message.id)) {
      merged.push(message);
      known.add(message.id);
    }
  }

  return merged.sort((a, b) => (a.seq ?? Infinity) - (b.seq ?? Infinity));
}

/*
 * The assistant's state, shared by the docked panel and the full page.
 *
 * Conversations are stored server-side, so this holds only what is on screen:
 * the open conversation, one page of its messages, and the history list. It
 * sits above both surfaces, so expanding or collapsing continues the thread.
 */
export function AssistantProvider({ children }) {
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [loadingThread, setLoadingThread] = useState(false);
  const [pending, setPending] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [capabilities, setCapabilities] = useState(null);

  const [conversations, setConversations] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  /*
   * The conversation on screen, readable from inside async callbacks. A reply
   * that arrives after the person has switched threads must not be written
   * into the one they switched to.
   */
  const activeId = useRef(null);

  /*
   * Presentation state for the orb. `composerActive` is set by whichever
   * surface holds focus, and `responding` is a short flourish after a reply
   * lands — without it the orb would snap from Thinking straight back to Idle
   * and the arrival would go unmarked.
   */
  const [composerActive, setComposerActive] = useState(false);
  const [responding, setResponding] = useState(false);

  const respondingTimer = useRef(null);

  useEffect(() => () => clearTimeout(respondingTimer.current), []);

  const flashResponding = useCallback(() => {
    clearTimeout(respondingTimer.current);

    setResponding(true);

    respondingTimer.current = setTimeout(() => setResponding(false), 1800);
  }, []);

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

  const startNewConversation = useCallback(() => {
    activeId.current = null;

    setConversationId(null);
    setMessages([]);
    setHasMore(false);
    setPending(null);
    setError("");

    rememberConversation(null);
  }, []);

  const openConversation = useCallback(async (id) => {
    activeId.current = id;

    setConversationId(id);
    setMessages([]);
    setHasMore(false);
    setPending(null);
    setError("");
    setLoadingThread(true);

    rememberConversation(id);

    try {
      const page = await getConversationMessages(id);

      if (activeId.current !== id) {
        return;
      }

      setMessages(page.messages);
      setHasMore(page.hasMore);
      setPending(page.pendingAction);
    } catch (requestError) {
      if (activeId.current !== id) {
        return;
      }

      if (requestError.status === 404) {
        // Deleted, or never ours: start clean rather than showing an error.
        activeId.current = null;
        setConversationId(null);
        rememberConversation(null);
      } else {
        setError(requestError.message || "Could not load the conversation.");
      }
    } finally {
      if (activeId.current === id) {
        setLoadingThread(false);
      }
    }
  }, []);

  const loadOlder = useCallback(async () => {
    const id = activeId.current;
    const oldest = messages.find((message) => message.seq)?.seq;

    if (!id || !oldest) {
      return;
    }

    try {
      const page = await getConversationMessages(id, { before: oldest });

      if (activeId.current !== id) {
        return;
      }

      setMessages((current) => mergeMessages(page.messages, current));
      setHasMore(page.hasMore);
    } catch (requestError) {
      setError(requestError.message || "Could not load earlier messages.");
    }
  }, [messages]);

  const historyRequested = useRef(false);

  /*
   * The history list, first page. On the very first load it also reopens the
   * conversation this browser was last on — or the most recent one — so a
   * reload continues where the person left off.
   */
  const loadHistory = useCallback(async () => {
    if (historyRequested.current) {
      return;
    }

    historyRequested.current = true;

    try {
      const page = await listConversations();

      setConversations(page.conversations);
      setNextCursor(page.nextCursor);

      if (activeId.current === null) {
        const remembered = recallConversation();
        const target = remembered || page.conversations[0]?.id;

        if (target) {
          openConversation(target);
        }
      }
    } catch {
      // The thread still works without the list; it just is not shown.
    } finally {
      setHistoryLoaded(true);
    }
  }, [openConversation]);

  const loadMoreHistory = useCallback(async () => {
    if (!nextCursor) {
      return;
    }

    try {
      const page = await listConversations({ cursor: nextCursor });

      setConversations((current) => {
        const seen = new Set(current.map((item) => item.id));

        return [...current, ...page.conversations.filter((item) => !seen.has(item.id))];
      });
      setNextCursor(page.nextCursor);
    } catch {
      // Leave the list as it is; the button stays available to try again.
    }
  }, [nextCursor]);

  // Moves the conversation to the top of the list, adding it if it is new.
  const touchConversation = useCallback((id, title) => {
    setConversations((current) => {
      const existing = current.find((item) => item.id === id);
      const rest = current.filter((item) => item.id !== id);

      return [
        {
          ...(existing || { id, title }),
          lastMessageAt: new Date().toISOString(),
        },
        ...rest,
      ];
    });
  }, []);

  const applyResult = useCallback(
    (id, result) => {
      if (activeId.current !== id) {
        return;
      }

      setMessages((current) => mergeMessages(current, result.messages || []));
      setPending(result.pendingAction || null);

      if ((result.messages || []).some((message) => message.role === "assistant")) {
        flashResponding();
      }
    },
    [flashResponding],
  );

  /*
   * Sends a message, or re-sends one that failed. A retry reuses the original
   * clientMessageId, so if the first attempt did reach the server the stored
   * answer comes back instead of the question being asked twice.
   */
  const deliver = useCallback(
    async (id, clientMessageId, content) => {
      setBusy(true);
      setError("");

      try {
        const result = await sendConversationMessage(id, { clientMessageId, content });

        applyResult(id, result);
        touchConversation(id, content);
      } catch (requestError) {
        if (activeId.current !== id) {
          return;
        }

        setMessages((current) =>
          current.map((message) =>
            message.clientMessageId === clientMessageId
              ? { ...message, status: "failed" }
              : message,
          ),
        );

        setError(requestError.message || "The assistant could not answer.");
      } finally {
        setBusy(false);
      }
    },
    [applyResult, touchConversation],
  );

  const send = useCallback(
    (text) => {
      const content = text.trim();

      if (!content || busy || pending) {
        return;
      }

      // A new conversation gets its id here, before the first request, so a
      // retried first send cannot create a second conversation.
      let id = activeId.current;

      if (!id) {
        id = newId();
        activeId.current = id;
        setConversationId(id);
        rememberConversation(id);
      }

      const clientMessageId = newId();

      // Built outside any state updater: an updater can run twice, and this one
      // is followed by a request.
      setMessages((current) => [
        ...current,
        {
          id: `local-${clientMessageId}`,
          role: "user",
          content,
          clientMessageId,
          status: "sending",
        },
      ]);

      deliver(id, clientMessageId, content);
    },
    [busy, pending, deliver],
  );

  const retry = useCallback(
    (message) => {
      const id = activeId.current;

      if (!id || busy || !message.clientMessageId) {
        return;
      }

      setMessages((current) =>
        current.map((item) =>
          item.clientMessageId === message.clientMessageId
            ? { ...item, status: "sending" }
            : item,
        ),
      );

      deliver(id, message.clientMessageId, message.content);
    },
    [busy, deliver],
  );

  const decide = useCallback(
    async (request) => {
      const id = activeId.current;

      if (!pending || !id || busy) {
        return;
      }

      setBusy(true);
      setError("");

      try {
        const result = await request(id, pending.id);

        applyResult(id, result);
      } catch (requestError) {
        if (activeId.current !== id) {
          return;
        }

        // Already decided elsewhere (another tab, a double click): reload the
        // thread so it shows what actually happened.
        if (requestError.status === 409) {
          openConversation(id);
          return;
        }

        setError(requestError.message || "The assistant could not complete that.");
      } finally {
        setBusy(false);
      }
    },
    [pending, busy, applyResult, openConversation],
  );

  const confirmAction = useCallback(() => decide(confirmAssistantAction), [decide]);

  const cancelAction = useCallback(() => decide(cancelAssistantAction), [decide]);

  const renameConversation = useCallback(async (id, title) => {
    const updated = await renameConversationRequest(id, title);

    setConversations((current) =>
      current.map((item) => (item.id === id ? { ...item, title: updated.title } : item)),
    );
  }, []);

  const deleteConversation = useCallback(
    async (id) => {
      await deleteConversationRequest(id);

      setConversations((current) => current.filter((item) => item.id !== id));

      if (activeId.current === id) {
        startNewConversation();
      }
    },
    [startNewConversation],
  );

  /*
   * One derived state rather than four booleans in the view: the orb and its
   * caption can never disagree, and the precedence is stated once here.
   */
  const state = busy
    ? "processing"
    : pending
      ? "confirming"
      : responding
        ? "responding"
        : composerActive
          ? "listening"
          : "idle";

  const value = {
    conversationId,
    messages,
    hasMore,
    loadingThread,
    pending,
    busy,
    error,
    state,
    setComposerActive,
    capabilities,
    loadCapabilities,
    send,
    retry,
    confirmAction,
    cancelAction,
    loadOlder,
    conversations,
    nextCursor,
    historyLoaded,
    loadHistory,
    loadMoreHistory,
    openConversation,
    startNewConversation,
    renameConversation,
    deleteConversation,
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
