import { describe, expect, test } from "vitest";

import { mergeMessages } from "./AssistantContext";

/*
 * How server replies are folded into the thread on screen. A replayed
 * response (the same message sent twice) must never show anything twice.
 */
describe("mergeMessages", () => {
  test("replaces the optimistic copy of a sent message with the stored one", () => {
    const current = [
      { id: "local-abc", clientMessageId: "abc", role: "user", content: "hi", status: "sending" },
    ];
    const incoming = [
      { id: "1", seq: 1, clientMessageId: "abc", role: "user", content: "hi", status: "ok" },
      { id: "2", seq: 2, role: "assistant", content: "hello" },
    ];

    const merged = mergeMessages(current, incoming);

    expect(merged.map((message) => message.id)).toEqual(["1", "2"]);
    expect(merged[0].status).toBe("ok");
  });

  test("ignores messages already on screen", () => {
    const current = [
      { id: "1", seq: 1, role: "user", content: "hi" },
      { id: "2", seq: 2, role: "assistant", content: "hello" },
    ];

    const merged = mergeMessages(current, [{ id: "2", seq: 2, role: "assistant", content: "hello" }]);

    expect(merged).toHaveLength(2);
  });

  test("keeps the thread in sequence order when an earlier page is added", () => {
    const current = [{ id: "5", seq: 5, role: "user", content: "later" }];
    const older = [
      { id: "3", seq: 3, role: "user", content: "earlier" },
      { id: "4", seq: 4, role: "assistant", content: "reply" },
    ];

    expect(mergeMessages(older, current).map((message) => message.seq)).toEqual([3, 4, 5]);
  });

  test("an unsent message stays at the end", () => {
    const current = [
      { id: "1", seq: 1, role: "user", content: "first" },
      { id: "local-x", clientMessageId: "x", role: "user", content: "pending" },
    ];

    const merged = mergeMessages(current, [{ id: "2", seq: 2, role: "assistant", content: "reply" }]);

    expect(merged.map((message) => message.id)).toEqual(["1", "2", "local-x"]);
  });
});
