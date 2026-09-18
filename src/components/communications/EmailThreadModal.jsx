import { counterpartyOf } from "./EmailThreadList";

function formatFull(value) {
  if (!value) {
    return "";
  }

  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

/*
 * The full conversation. Opened from the thread list; Reply hands back up to the
 * panel, which swaps in the composer.
 */
function EmailThreadModal({ thread, canSend, onReply, onClose }) {
  const latest = thread.messages[thread.messages.length - 1];

  return (
    <div className="modal modal-thread">
      <div className="thread-shell" role="dialog" aria-label={thread.subject}>
        <div className="thread-titlebar">
          <div>
            <h2>{thread.subject}</h2>

            <span>
              {thread.messages.length} message
              {thread.messages.length === 1 ? "" : "s"}
              {thread.account?.emailAccountAddress
                ? ` · ${thread.account.emailAccountAddress}`
                : ""}
            </span>
          </div>

          <button type="button" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="thread-messages">
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

                <span>{formatFull(message.createdAt)}</span>
              </header>

              {message.delivery?.toAddress && (
                <span className="email-message-to">
                  to {message.delivery.toAddress}
                </span>
              )}

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
        </div>

        {canSend && thread.id && (
          <div className="thread-footer">
            <button
              type="button"
              className="button button-primary"
              onClick={() => onReply(thread, counterpartyOf(latest))}
            >
              Reply
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default EmailThreadModal;
