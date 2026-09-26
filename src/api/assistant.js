import request from "./client";

/*
 * Conversations are stored server-side. The client sends only the new message;
 * the server holds the thread and decides what the model sees.
 *
 * Both ids in a send are generated here, so a retried request lands on the
 * same rows and gets the stored answer instead of a second one.
 */

const BASE = "/assistant/conversations";

export function listConversations({ cursor } = {}) {
  const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";

  return request(`${BASE}${query}`);
}

// The caller's own conversations, matched by meaning and by words.
export function searchConversations(query) {
  return request(`${BASE}/search?q=${encodeURIComponent(query)}`);
}

export function getConversationMessages(conversationId, { before } = {}) {
  const query = before ? `?before=${before}` : "";

  return request(`${BASE}/${conversationId}/messages${query}`);
}

export function sendConversationMessage(conversationId, { clientMessageId, content }) {
  return request(`${BASE}/${conversationId}/messages`, {
    method: "POST",
    body: JSON.stringify({ clientMessageId, content }),
  });
}

// No body: the server runs the change it stored, not anything sent from here.
export function confirmAssistantAction(conversationId, actionId) {
  return request(`${BASE}/${conversationId}/actions/${actionId}/confirm`, {
    method: "POST",
  });
}

export function cancelAssistantAction(conversationId, actionId) {
  return request(`${BASE}/${conversationId}/actions/${actionId}/cancel`, {
    method: "POST",
  });
}

export function renameConversation(conversationId, title) {
  return request(`${BASE}/${conversationId}`, {
    method: "PATCH",
    body: JSON.stringify({ title }),
  });
}

export function deleteConversation(conversationId) {
  return request(`${BASE}/${conversationId}`, { method: "DELETE" });
}

export function getAssistantCapabilities() {
  return request("/assistant/capabilities");
}

/*
 * crypto.randomUUID exists only in secure contexts — fine on localhost, absent
 * when the app is opened over plain http on a LAN address. getRandomValues is
 * available in both.
 */
export function newId() {
  if (typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  const bytes = crypto.getRandomValues(new Uint8Array(16));

  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, "0"));

  return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex
    .slice(6, 8)
    .join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10).join("")}`;
}
