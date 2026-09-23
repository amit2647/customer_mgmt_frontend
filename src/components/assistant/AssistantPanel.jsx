import { useEffect, useRef, useState } from "react";

import {
  getAssistantCapabilities,
  sendAssistantMessage,
} from "../../api/assistant";

/*
 * The assistant, docked bottom-right like the email composer.
 *
 * Conversation state lives here and is posted whole on each turn — the backend
 * is stateless. What the assistant can actually do is decided server-side from
 * the caller's permissions, so this component never gates anything itself; the
 * suggestions below come from that same filtered list, which is why they never
 * offer something the assistant would refuse.
 */
function AssistantPanel({ open, onClose }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [capabilities, setCapabilities] = useState(null);

  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!open || capabilities) {
      return;
    }

    getAssistantCapabilities()
      .then(setCapabilities)
      .catch(() => setCapabilities({ tools: [], configured: false }));
  }, [open, capabilities]);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, pending, busy]);

  async function turn(nextMessages, confirm) {
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
  }

  function handleSubmit(event) {
    event.preventDefault();

    const text = input.trim();

    if (!text || busy) {
      return;
    }

    const next = [...messages, { role: "user", content: text }];

    setMessages(next);
    setInput("");

    turn(next);
  }

  function confirmAction() {
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
  }

  function cancelAction() {
    setPending(null);

    setMessages((current) => [
      ...current,
      { role: "assistant", content: "Cancelled — nothing was changed." },
    ]);
  }

  if (!open) {
    return null;
  }

  const suggestions = (capabilities?.tools || []).slice(0, 3);

  return (
    <aside className="assistant-panel" aria-label="OmniCore assistant">
      <header className="assistant-head">
        <div>
          <strong>Assistant</strong>

          <span>Answers from your data, within your access</span>
        </div>

        <div className="assistant-head-actions">
          {messages.length > 0 && (
            <button
              type="button"
              className="link"
              onClick={() => {
                setMessages([]);
                setPending(null);
                setError("");
              }}
            >
              Clear
            </button>
          )}

          <button
            type="button"
            className="assistant-close"
            onClick={onClose}
            aria-label="Close assistant"
          >
            ✕
          </button>
        </div>
      </header>

      <div className="assistant-thread" ref={scrollRef}>
        {messages.length === 0 && (
          <div className="assistant-empty">
            {capabilities && !capabilities.configured ? (
              <p>
                The assistant is not configured yet — an administrator needs to
                add an OpenRouter API key.
              </p>
            ) : (
              <>
                <p>
                  Ask about your leads, customers, services or figures. I can
                  also make changes, and I will show you what I am about to do
                  before I do it.
                </p>

                {suggestions.length > 0 && (
                  <ul className="assistant-suggestions">
                    {suggestions.map((tool) => (
                      <li key={tool.name}>{tool.description}</li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>
        )}

        {messages.map((message, index) => (
          <div
            key={`${message.role}-${index}`}
            className={`assistant-message ${message.role}`}
          >
            {message.content}
          </div>
        ))}

        {busy && (
          <div className="assistant-message assistant-typing">Thinking…</div>
        )}

        {pending && (
          <div
            className={`assistant-confirm ${pending.destructive ? "destructive" : ""}`}
          >
            <strong>Confirm this change</strong>

            <p>{pending.summary}</p>

            <div className="assistant-confirm-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={cancelAction}
                disabled={busy}
              >
                Cancel
              </button>

              <button
                type="button"
                className="button button-primary"
                onClick={confirmAction}
                disabled={busy}
              >
                Confirm
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="assistant-error" role="alert">
            {error}
          </div>
        )}
      </div>

      <form className="assistant-composer" onSubmit={handleSubmit}>
        <input
          ref={inputRef}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Ask about leads, customers, figures…"
          disabled={busy || Boolean(pending)}
        />

        <button
          type="submit"
          className="button button-primary"
          disabled={busy || !input.trim() || Boolean(pending)}
        >
          Send
        </button>
      </form>
    </aside>
  );
}

export default AssistantPanel;
