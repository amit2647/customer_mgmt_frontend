import { useState } from "react";

/*
 * What happened to a member's verification link (auth-hardening P4): mailed,
 * or — when this server has no system mail account — the link itself, for
 * the admin to pass on. Shown once; the server keeps only a hash.
 */
function VerificationNotice({ verification, email, onClose }) {
  const [copied, setCopied] = useState(false);

  if (!verification) return null;

  if (verification.sent) {
    return (
      <div className="alert alert-success" role="status">
        We emailed {email} a link to confirm their address. They can sign in once they open it.
        {onClose && (
          <button type="button" className="link" onClick={onClose}>
            Dismiss
          </button>
        )}
      </div>
    );
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(verification.link);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="alert verification-notice" role="status">
      <p>
        {verification.reason || "The email could not be sent"}. {email} cannot sign in until they open this link. Send it
        to them yourself — it works once, for 24 hours, and is shown only now.
      </p>

      {verification.link && (
        <div className="invite-link-row">
          <code className="invite-link">{verification.link}</code>
          <button type="button" className="button button-secondary" onClick={copy}>
            {copied ? "Copied" : "Copy link"}
          </button>
        </div>
      )}

      {onClose && (
        <button type="button" className="link" onClick={onClose}>
          Dismiss
        </button>
      )}
    </div>
  );
}

export default VerificationNotice;
