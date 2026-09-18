import { useState } from "react";

import { replyToConversation, sendEmail } from "../../api/emails";

/*
 * Compose and in-thread reply, laid out like a mail client: a title bar, compact
 * underlined address rows, an unbounded body, and the send action on a footer bar.
 *
 * There is no Cc/Bcc: email-service's send endpoint accepts to/subject/text/html
 * and replyTo only, and offering fields that are silently dropped would be worse
 * than not offering them.
 */
function EmailComposer({
  conversation = null,
  recipient = "",
  record,
  stacked = false,
  onSent,
  onClose,
}) {
  const isReply = Boolean(conversation);

  const [to, setTo] = useState(recipient);
  const [subject, setSubject] = useState(
    isReply && conversation.subject ? `Re: ${conversation.subject}` : "",
  );
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();

    if (!to.trim()) {
      setError("A recipient is required.");
      return;
    }

    if (!isReply && !subject.trim()) {
      setError("A subject is required.");
      return;
    }

    if (!body.trim()) {
      setError("The message cannot be empty.");
      return;
    }

    try {
      setSending(true);
      setError("");

      if (isReply) {
        await replyToConversation(conversation.id, {
          to: to.trim(),
          subject: subject.trim() || undefined,
          text: body,
        });
      } else {
        await sendEmail({
          to: to.trim(),
          subject: subject.trim(),
          text: body,
          // Always sent: this is what links the new conversation to the record.
          ...(record.type === "lead"
            ? { leadId: record.id }
            : { customerId: record.id }),
        });
      }

      await onSent();
    } catch (requestError) {
      console.error("Failed to send email:", requestError);

      setError(requestError.message || "Failed to send the email.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className={`modal modal-compose${stacked ? " modal-stacked" : ""}`}>
      <form className="composer-shell" onSubmit={handleSubmit}>
        {/* Header */}
        <div className="composer-titlebar">
          <span>{isReply ? "Reply" : "New Message"}</span>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="composer-close"
          >
            ×
          </button>
        </div>

        {/* Error */}
        {error && <div className="composer-error">{error}</div>}

        {/* Recipient */}
        <div className="composer-field composer-recipient">
          <label htmlFor="composer-to">To</label>

          <input
            id="composer-to"
            type="email"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="name@example.com"
            disabled={sending}
            autoFocus={!to}
          />
        </div>

        {/* Subject */}
        <div className="composer-field composer-subject">
          <input
            id="composer-subject"
            type="text"
            aria-label="Subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder={isReply ? "Keeps the thread subject" : "Subject"}
            disabled={sending}
          />
        </div>

        {/* Message body */}
        <div className="composer-body-wrap">
          <textarea
            className="composer-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write your message..."
            disabled={sending}
            autoFocus={Boolean(to)}
          />
        </div>

        {/* Footer */}
        <div className="composer-footer">
          <button type="submit" className="composer-send" disabled={sending}>
            {sending ? "Sending..." : "Send"}
          </button>

          <button
            type="button"
            className="composer-discard"
            onClick={onClose}
            disabled={sending}
            title="Discard"
          >
            Discard
          </button>
        </div>
      </form>
    </div>
  );
}

export default EmailComposer;
