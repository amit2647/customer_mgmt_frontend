import request from "./client";

/*
 * The assistant keeps no server-side session: the whole conversation is sent
 * with each turn, so nothing persists between users or page loads.
 */
export function sendAssistantMessage({ messages, confirm }) {
  return request("/assistant/chat", {
    method: "POST",
    body: JSON.stringify({ messages, confirm }),
  });
}

export function getAssistantCapabilities() {
  return request("/assistant/capabilities");
}
