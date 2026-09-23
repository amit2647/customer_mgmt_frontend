import { useLocation, useNavigate } from "react-router-dom";

import AssistantThread from "../../components/assistant/AssistantThread";
import { useAssistant } from "../../context/AssistantContext";

/*
 * The assistant as a full page, for longer sessions where the docked panel is
 * too cramped — comparing several records, or reading a wide table.
 *
 * It shares the conversation with the panel through AssistantContext, so this
 * is a change of surface, not a new session.
 */
function AssistantPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const { messages, clear } = useAssistant();

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
    <main className="page assistant-page">
      <div className="page-header">
        <div>
          <h1>Assistant</h1>

          <p>
            Ask about your leads, customers, services and figures. The assistant
            only sees what your access allows, and shows you any change before
            it makes it.
          </p>
        </div>

        <div className="page-header-actions">
          {messages.length > 0 && (
            <button type="button" className="secondary-button" onClick={clear}>
              Clear conversation
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

      <section className="card assistant-page-card">
        <AssistantThread
          autoFocus
          placeholder="Ask anything about your leads, customers or figures…"
        />
      </section>
    </main>
  );
}

export default AssistantPage;
