import { useCallback, useEffect, useState } from "react";

import { useAuth } from "../../context/AuthContext";
import { getCommunications } from "../../api/emails";

import EmailThreadList from "./EmailThreadList";
import EmailComposer from "./EmailComposer";

/*
 * Each channel is its own section rather than one merged timeline. Only email is
 * populated today; phone, WhatsApp and internal notes are already valid values of
 * communications.channel, so adding one is a new entry here plus its own list
 * component, not a rewrite of a combined feed.
 */
const CHANNELS = [{ id: "email", label: "Email" }];

// The list endpoint has no pagination, so this caps how much of a thread is visible.
const FETCH_LIMIT = 100;

function CommunicationPanel({ record }) {
  const { user } = useAuth();

  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
  const canRead = permissions.includes("communications.read");
  const canSend = permissions.includes("email.send");

  const [channel, setChannel] = useState("email");
  const [communications, setCommunications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [composer, setComposer] = useState(null);

  const load = useCallback(async () => {
    if (!canRead) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const data = await getCommunications({
        ...(record.type === "lead"
          ? { leadId: record.id }
          : { customerId: record.id }),
        limit: FETCH_LIMIT,
      });

      setCommunications(
        Array.isArray(data) ? data : (data?.communications ?? []),
      );
    } catch (requestError) {
      console.error("Failed to load communications:", requestError);

      setError(requestError.message || "Failed to load communications.");
    } finally {
      setLoading(false);
    }
  }, [canRead, record.id, record.type]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSent() {
    setComposer(null);
    await load();
  }

  if (!canRead) {
    return null;
  }

  const emailCommunications = communications.filter(
    (item) => item.channel === "email",
  );

  return (
    <section className="communication-panel">
      <div className="communication-header">
        <div>
          <span className="communication-eyebrow">COMMUNICATION</span>
          <h2>Conversations</h2>
        </div>

        {canSend && channel === "email" && (
          <button
            type="button"
            className="button button-primary"
            onClick={() =>
              setComposer({ conversation: null, recipient: record.email || "" })
            }
          >
            + New Email
          </button>
        )}
      </div>

      <nav className="communication-channels" aria-label="Communication channels">
        {CHANNELS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`communication-channel${channel === item.id ? " active" : ""}`}
            onClick={() => setChannel(item.id)}
            aria-pressed={channel === item.id}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {error && (
        <div className="alert alert-error" role="alert">
          <span>{error}</span>
        </div>
      )}

      {channel === "email" && (
        <EmailThreadList
          communications={emailCommunications}
          loading={loading}
          canSend={canSend}
          onReply={(conversation, recipient) =>
            setComposer({ conversation, recipient })
          }
        />
      )}

      {composer && (
        <EmailComposer
          conversation={composer.conversation}
          recipient={composer.recipient}
          record={record}
          onSent={handleSent}
          onClose={() => setComposer(null)}
        />
      )}
    </section>
  );
}

export default CommunicationPanel;
