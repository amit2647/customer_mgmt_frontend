/*
 * A list of threads only — an inbox. Opening one is the modal's job; nothing
 * expands in place.
 *
 * Threads are grouped client-side because email-service has no conversation-list
 * endpoint yet. Messages arrive newest-first; within a thread they are reversed
 * so a conversation reads top to bottom.
 */
export function groupIntoThreads(communications) {
  const threads = new Map();

  for (const item of communications) {
    const key = item.conversationId ?? `orphan-${item.id}`;

    if (!threads.has(key)) {
      threads.set(key, {
        id: item.conversationId,
        key,
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

export function formatWhen(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  const sameDay = new Date().toDateString() === date.toDateString();

  return sameDay
    ? date.toLocaleTimeString(undefined, { timeStyle: "short" })
    : date.toLocaleDateString(undefined, { dateStyle: "medium" });
}

export function counterpartyOf(message) {
  return message.direction === "inbound"
    ? (message.delivery?.fromAddress ?? "Them")
    : (message.delivery?.toAddress ?? "You");
}

function EmailThreadList({ communications, loading, onOpen }) {
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

  return (
    <ol className="email-thread-list">
      {threads.map((thread) => {
        const latest = thread.messages[thread.messages.length - 1];
        const unsent = thread.messages.some((m) => m.status === "failed");

        return (
          <li key={thread.key}>
            <button
              type="button"
              className="email-thread-row"
              onClick={() => onOpen(thread)}
            >
              <span className="email-thread-who">{counterpartyOf(latest)}</span>

              <span className="email-thread-text">
                <span className="email-thread-subject">{thread.subject}</span>

                <span className="email-thread-snippet">{latest.body}</span>
              </span>

              <span className="email-thread-side">
                {unsent && <span className="email-thread-flag">Failed</span>}

                {thread.messages.length > 1 && (
                  <span className="email-thread-count">
                    {thread.messages.length}
                  </span>
                )}

                <span className="email-thread-date">
                  {formatWhen(latest.createdAt)}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

export default EmailThreadList;
