import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import AssistantHistory from "../../components/assistant/AssistantHistory";
import AssistantOrb from "../../components/assistant/AssistantOrb";
import AssistantThread from "../../components/assistant/AssistantThread";
import { useAssistant } from "../../context/AssistantContext";

/*
 * The assistant as a full page, for longer sessions where the docked panel is
 * too cramped — comparing several records, or reading a wide table.
 *
 * It shares the conversation with the panel through AssistantContext, so this
 * is a change of surface, not a new session. It adds what the panel has no room
 * for: the history of past conversations.
 */
function AssistantPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const { messages, loadingThread, conversationId, startNewConversation, busy, state } =
    useAssistant();

  // Only matters on narrow screens, where the rail is folded away by default.
  const [historyOpen, setHistoryOpen] = useState(false);

  // The orb is the hero of an empty page and a status light once the thread
  // needs the room. Same element either way, so the move is a transition
  // rather than a mount.
  const started = messages.length > 0 || loadingThread;

  /*
   * Going back only makes sense if this page was opened from somewhere in the
   * app. Arriving directly — a bookmark, a reload — has no history to return
   * to, and navigate(-1) would leave the product entirely.
   */
  function collapse() {
    if (location.key === "default") {
      navigate("/");
      return;
    }

    navigate(-1);
  }

  return (
    <main className={`page assistant-page is-${state}`}>
      <div className="page-header">
        <div className="assistant-page-heading">
          {started && <AssistantOrb state={state} size="sm" caption={false} />}

          <div>
            <h1>Assistant</h1>

            <p>
              Ask about your leads, customers, services and figures. The
              assistant only sees what your access allows, and shows you any
              change before it makes it.
            </p>
          </div>
        </div>

        <div className="page-header-actions">
          <button
            type="button"
            className="secondary-button assistant-history-toggle"
            onClick={() => setHistoryOpen((open) => !open)}
            aria-expanded={historyOpen}
          >
            History
          </button>

          {conversationId && (
            <button
              type="button"
              className="secondary-button"
              onClick={startNewConversation}
              disabled={busy}
            >
              New chat
            </button>
          )}

          <button
            type="button"
            className="secondary-button"
            onClick={collapse}
            title="Return to the docked panel"
          >
            ⤡ Collapse
          </button>
        </div>
      </div>

      <section
        className={`card assistant-page-card ${started ? "" : "is-empty"}`}
      >
        <AssistantHistory
          open={historyOpen}
          onNavigate={() => setHistoryOpen(false)}
        />

        <div className="assistant-main">
          {!started && (
            <div className="assistant-stage">
              <AssistantOrb state={state} size="lg" />
            </div>
          )}

          <AssistantThread
            autoFocus
            placeholder="Ask anything about your leads, customers or figures…"
          />
        </div>
      </section>
    </main>
  );
}

export default AssistantPage;
