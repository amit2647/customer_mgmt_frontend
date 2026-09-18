import request from "./client";

// leadId or customerId must always be supplied: send creates a fresh conversation
// and stamps the link onto it, and inbound replies inherit the link from the
// thread they match. A send without one is unlinked from the record permanently.
export function sendEmail(data) {
  return request("/emails/send", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function replyToConversation(conversationId, data) {
  return request(`/emails/conversations/${conversationId}/reply`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function getCommunications({ leadId, customerId, conversationId, limit } = {}) {
  const params = new URLSearchParams();

  if (leadId) {
    params.set("leadId", leadId);
  }

  if (customerId) {
    params.set("customerId", customerId);
  }

  if (conversationId) {
    params.set("conversationId", conversationId);
  }

  if (limit) {
    params.set("limit", limit);
  }

  const query = params.toString();

  return request(`/emails/communications${query ? `?${query}` : ""}`);
}

export function getCommunication(id) {
  return request(`/emails/communications/${id}`);
}
