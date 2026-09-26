import { useNavigate } from "react-router-dom";

import AssistantOrb from "./AssistantOrb";
import AssistantThread from "./AssistantThread";
import { useAssistant } from "../../context/AssistantContext";

/*
 * The assistant docked bottom-right, like the email composer.
 *
 * Chrome only: the conversation and its state live in AssistantContext, so
 * expanding to the full page carries the thread across rather than restarting
 * it.
 */
function AssistantPanel({ open, onClose }) {
  const navigate = useNavigate();

  const { conversationId, startNewConversation, state } = useAssistant();

  if (!open) {
    return null;
  }

  function expand() {
    onClose();
    navigate("/assistant");
  }

  return (
    <aside className="assistant-panel" aria-label="OmniCore assistant">
      <header className="assistant-head">
        {/* Same orb as the page, so expanding does not feel like a different
            product. */}
        <AssistantOrb state={state} size="sm" caption={false} />

        <div className="assistant-head-copy">
          <strong>Assistant</strong>

          <span>Answers from your data, within your access</span>
        </div>

        <div className="assistant-head-actions">
          {/* The previous thread is kept; the full page lists it. */}
          {conversationId && (
            <button type="button" className="link" onClick={startNewConversation}>
              New chat
            </button>
          )}

          <button
            type="button"
            className="assistant-icon-button"
            onClick={expand}
            title="Open as full page"
            aria-label="Open as full page"
          >
            ⤢
          </button>

          <button
            type="button"
            className="assistant-icon-button"
            onClick={onClose}
            title="Close assistant"
            aria-label="Close assistant"
          >
            ✕
          </button>
        </div>
      </header>

      <AssistantThread autoFocus />
    </aside>
  );
}

export default AssistantPanel;
