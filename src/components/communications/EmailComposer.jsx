import { useState } from "react";

import { replyToConversation, sendEmail } from "../../api/emails";

/*
 * Handles both a new email and an in-thread reply.
 *
 * When `conversation` is supplied the reply endpoint is used, which resolves the
 * sending account and the In-Reply-To / References headers from the thread's
 * latest delivery. Subject is optional there — the server falls back to the
 * conversation's own subject.
 */
function EmailComposer({ conversation = null, recipient = "", record, onSent, onClose }) {
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
    <div className="modal">
      <form onSubmit={handleSubmit}>
        <div className="modal-head">
          <h2>{isReply ? "Reply" : "New Email"}</h2>

          <button type="button" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        {error && <div className="composer-error">{error}</div>}

        <label>
          To
          <input
            type="email"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="name@example.com"
            disabled={sending}
            autoFocus={!to}
          />
        </label>

        <label>
          Subject
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder={isReply ? "Keeps the thread subject" : "Subject"}
            disabled={sending}
          />
        </label>

        <label>
          Message
          <textarea
            className="composer-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={10}
            disabled={sending}
            autoFocus={Boolean(to)}
          />
        </label>

        <div className="modal-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={onClose}
            disabled={sending}
          >
            Cancel
          </button>

          <button type="submit" className="button button-primary" disabled={sending}>
            {sending ? "Sending..." : "Send"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default EmailComposer;
