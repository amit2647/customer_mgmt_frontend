import { useEffect, useState } from "react";
import {
  Check,
  MagnifyingGlass,
  PencilSimple,
  Plus,
  Trash,
  X,
} from "@phosphor-icons/react";

import { searchConversations } from "../../api/assistant";
import { useAssistant } from "../../context/AssistantContext";

// Long enough that typing a word is one request, short enough to feel live.
const SEARCH_DELAY_MS = 300;

/*
 * Debounced search over the person's conversations. Results that arrive after
 * the query has changed again are dropped, so a slow early request can never
 * overwrite the answer to the latest one.
 */
function useConversationSearch(query) {
  const [results, setResults] = useState(null);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const trimmed = query.trim();

    if (!trimmed) {
      setResults(null);
      setSearching(false);
      return undefined;
    }

    let current = true;

    setSearching(true);

    const timer = setTimeout(() => {
      searchConversations(trimmed)
        .then((data) => current && setResults(data.results))
        .catch(() => current && setResults([]))
        .finally(() => current && setSearching(false));
    }, SEARCH_DELAY_MS);

    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [query]);

  return { results, searching };
}

function relativeTime(value) {
  const then = new Date(value).getTime();

  if (Number.isNaN(then)) {
    return "";
  }

  const minutes = Math.round((Date.now() - then) / 60000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.round(minutes / 60);

  if (hours < 24) return `${hours}h ago`;

  const days = Math.round(hours / 24);

  if (days < 7) return `${days}d ago`;

  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

/*
 * One row. Rename edits in place; delete asks once, in place, rather than with
 * a browser dialog.
 */
function HistoryItem({ item, active, onOpen }) {
  const { renameConversation, deleteConversation } = useAssistant();

  const [mode, setMode] = useState("view");
  const [title, setTitle] = useState(item.title || "");
  const [error, setError] = useState("");

  async function saveTitle(event) {
    event.preventDefault();

    const next = title.trim();

    if (!next || next === item.title) {
      setMode("view");
      return;
    }

    try {
      await renameConversation(item.id, next);
      setMode("view");
    } catch (requestError) {
      setError(requestError.message || "Could not rename.");
    }
  }

  async function confirmDelete() {
    try {
      await deleteConversation(item.id);
    } catch (requestError) {
      setError(requestError.message || "Could not delete.");
      setMode("view");
    }
  }

  if (mode === "rename") {
    return (
      <li className="assistant-history-item is-editing">
        <form onSubmit={saveTitle}>
          <input
            autoFocus
            value={title}
            maxLength={80}
            onChange={(event) => setTitle(event.target.value)}
            onKeyDown={(event) => event.key === "Escape" && setMode("view")}
            aria-label="Conversation title"
          />

          <button type="submit" className="assistant-icon-button" aria-label="Save title">
            <Check size={14} weight="bold" />
          </button>
        </form>

        {error && <span className="assistant-history-error">{error}</span>}
      </li>
    );
  }

  if (mode === "delete") {
    return (
      <li className="assistant-history-item is-confirming">
        <span>Delete this conversation?</span>

        <div className="assistant-history-actions is-visible">
          <button
            type="button"
            className="assistant-icon-button danger"
            onClick={confirmDelete}
            aria-label="Delete"
            title="Delete"
          >
            <Trash size={14} />
          </button>

          <button
            type="button"
            className="assistant-icon-button"
            onClick={() => setMode("view")}
            aria-label="Keep"
            title="Keep"
          >
            <X size={14} />
          </button>
        </div>
      </li>
    );
  }

  return (
    <li className={`assistant-history-item ${active ? "is-active" : ""}`}>
      <button
        type="button"
        className="assistant-history-open"
        onClick={() => onOpen(item.id)}
        aria-current={active ? "true" : undefined}
      >
        <span className="assistant-history-title">{item.title || "Untitled"}</span>
        <span className="assistant-history-time">{relativeTime(item.lastMessageAt)}</span>
      </button>

      <div className="assistant-history-actions">
        <button
          type="button"
          className="assistant-icon-button"
          onClick={() => {
            setTitle(item.title || "");
            setMode("rename");
          }}
          aria-label="Rename"
          title="Rename"
        >
          <PencilSimple size={14} />
        </button>

        <button
          type="button"
          className="assistant-icon-button"
          onClick={() => setMode("delete")}
          aria-label="Delete"
          title="Delete"
        >
          <Trash size={14} />
        </button>
      </div>

      {error && <span className="assistant-history-error">{error}</span>}
    </li>
  );
}

/*
 * The person's past conversations, on the full page. Stored server-side, so
 * this is the same list on any device they sign in from.
 */
function AssistantHistory({ open, onNavigate }) {
  const {
    conversationId,
    conversations,
    nextCursor,
    historyLoaded,
    loadMoreHistory,
    openConversation,
    startNewConversation,
    busy,
  } = useAssistant();

  function openItem(id) {
    if (id !== conversationId) {
      openConversation(id);
    }

    onNavigate?.();
  }

  function startNew() {
    startNewConversation();
    onNavigate?.();
  }

  const [query, setQuery] = useState("");
  const { results, searching } = useConversationSearch(query);

  return (
    <aside
      className={`assistant-history ${open ? "is-open" : ""}`}
      aria-label="Conversation history"
    >
      <button
        type="button"
        className="assistant-history-new"
        onClick={startNew}
        disabled={busy}
      >
        <Plus size={14} weight="bold" />
        New chat
      </button>

      <label className="assistant-history-search">
        <MagnifyingGlass size={14} aria-hidden="true" />

        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => event.key === "Escape" && setQuery("")}
          placeholder="Search conversations"
          aria-label="Search conversations"
        />
      </label>

      {results !== null || searching ? (
        <>
          <p className="assistant-history-label">
            {searching ? "Searching…" : "Results"}
          </p>

          {!searching && results.length === 0 && (
            <p className="assistant-history-empty">No conversations match.</p>
          )}

          <ul className="assistant-history-list">
            {(results || []).map((result) => (
              <li
                key={result.id}
                className={`assistant-history-item ${
                  result.id === conversationId ? "is-active" : ""
                }`}
              >
                <button
                  type="button"
                  className="assistant-history-open"
                  onClick={() => openItem(result.id)}
                >
                  <span className="assistant-history-title">
                    {result.title || "Untitled"}
                  </span>

                  <span className="assistant-history-snippet">{result.snippet}</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <>
          <p className="assistant-history-label">Recent</p>

          {historyLoaded && conversations.length === 0 && (
            <p className="assistant-history-empty">
              Your conversations will appear here.
            </p>
          )}

          <ul className="assistant-history-list">
            {conversations.map((item) => (
              <HistoryItem
                key={item.id}
                item={item}
                active={item.id === conversationId}
                onOpen={openItem}
              />
            ))}
          </ul>

          {nextCursor && (
            <button type="button" className="assistant-older" onClick={loadMoreHistory}>
              Show more
            </button>
          )}
        </>
      )}
    </aside>
  );
}

export default AssistantHistory;
