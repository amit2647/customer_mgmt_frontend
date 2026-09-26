import { useEffect, useRef, useState } from "react";
import { ArrowUp } from "@phosphor-icons/react";

import AssistantMessage from "./AssistantMessage";
import { useAssistant } from "../../context/AssistantContext";

/*
 * The conversation itself: empty state, messages, confirmation gate, composer.
 *
 * Shared verbatim by the docked panel and the full-page view so the two cannot
 * drift apart — only the chrome around it differs. The conversation lives in
 * AssistantContext, so switching between the two continues the same thread.
 */
function AssistantThread({ autoFocus = false, placeholder }) {
  const {
    messages,
    pending,
    busy,
    error,
    capabilities,
    loadCapabilities,
    send,
    confirmAction,
    cancelAction,
    setComposerActive,
  } = useAssistant();

  const [input, setInput] = useState("");

  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    loadCapabilities();
  }, [loadCapabilities]);

  useEffect(() => {
    if (autoFocus) {
      inputRef.current?.focus();
    }
  }, [autoFocus]);

  // Both surfaces share one orb, so a composer that unmounts while focused
  // would otherwise leave it stuck on "listening".
  useEffect(() => () => setComposerActive(false), [setComposerActive]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, pending, busy]);

  function handleSubmit(event) {
    event.preventDefault();

    send(input);
    setInput("");
  }

  const suggestions = (capabilities?.tools || []).slice(0, 3);

  return (
    <>
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
          <AssistantMessage
            key={`${message.role}-${index}`}
            role={message.role}
            content={message.content}
          />
        ))}

        {busy && (
          <div className="assistant-typing" role="status" aria-label="Thinking">
            <span />
            <span />
            <span />
          </div>
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
          onFocus={() => setComposerActive(true)}
          onBlur={() => setComposerActive(false)}
          placeholder={placeholder || "Ask about leads, customers, figures…"}
          disabled={busy || Boolean(pending)}
        />

        <button
          type="submit"
          className="assistant-send"
          disabled={busy || !input.trim() || Boolean(pending)}
          title="Send"
          aria-label="Send"
        >
          <ArrowUp size={16} weight="bold" />
        </button>
      </form>
    </>
  );
}

export default AssistantThread;
