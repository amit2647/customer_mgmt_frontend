import { useState } from "react";

/*
 * Threads are grouped client-side because email-service has no conversation-list
 * endpoint yet. Messages arrive newest-first from the API; within a thread they
 * are reversed so a conversation reads top to bottom.
 */
function groupIntoThreads(communications) {
  const threads = new Map();

  for (const item of communications) {
    const key = item.conversationId ?? `orphan-${item.id}`;

    if (!threads.has(key)) {
      threads.set(key, {
        id: item.conversationId,
        subject: item.subject || "(no subject)",
        account: item.conversation ?? null,
        messages: [],
      });
    }

    threads.get(key).messages.push(item);
  }

  return [...threads.values()].map((thread) => ({
    ...thread,
    messages: [...thread.messages].reverse(),
  }));
}

function formatWhen(value) {
  if (!value) {
    return "";
  }

  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function EmailThreadList({ communications, loading, canSend, onReply }) {
  const [expanded, setExpanded] = useState(() => new Set());

  if (loading) {
    return <div className="communication-empty">Loading conversations...</div>;
  }

  if (communications.length === 0) {
    return (
      <div className="communication-empty">
        No email yet. Start a conversation with New Email.
      </div>
    );
  }

  const threads = groupIntoThreads(communications);

  function toggle(key) {
    setExpanded((current) => {
      const next = new Set(current);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  return (
    <ol className="email-thread-list">
      {threads.map((thread, index) => {
        const key = thread.id ?? `orphan-${index}`;
        const isOpen = expanded.has(key);
        const latest = thread.messages[thread.messages.length - 1];

        // Reply to whoever is on the other side of the thread.
        const replyTo =
          latest.direction === "inbound"
            ? (latest.delivery?.fromAddress ?? "")
            : (latest.delivery?.toAddress ?? "");

        return (
          <li key={key} className="email-thread">
            <button
              type="button"
              className="email-thread-head"
              onClick={() => toggle(key)}
              aria-expanded={isOpen}
            >
              <span className="email-thread-subject">{thread.subject}</span>

              <span className="email-thread-meta">
                <span>{thread.messages.length} message{thread.messages.length === 1 ? "" : "s"}</span>
                <span>{formatWhen(latest.createdAt)}</span>
              </span>
            </button>

            {isOpen && (
              <div className="email-thread-body">
                {thread.messages.map((message) => (
                  <article
                    key={message.id}
                    className={`email-message email-message-${message.direction}`}
                  >
                    <header>
                      <strong>
                        {message.direction === "inbound"
                          ? (message.delivery?.fromAddress ?? "Them")
                          : (message.delivery?.fromAddress ?? "You")}
                      </strong>

                      <span>{formatWhen(message.createdAt)}</span>
                    </header>

                    <p>{message.body}</p>

                    {message.status === "failed" && (
                      <span className="email-message-failed">
                        Delivery failed
                        {message.delivery?.errorMessage
                          ? `: ${message.delivery.errorMessage}`
                          : ""}
                      </span>
                    )}
                  </article>
                ))}

                {canSend && thread.id && (
                  <div className="email-thread-actions">
                    <button
                      type="button"
                      className="button button-primary"
                      onClick={() => onReply(thread, replyTo)}
                    >
                      Reply
                    </button>
                  </div>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}

export default EmailThreadList;
