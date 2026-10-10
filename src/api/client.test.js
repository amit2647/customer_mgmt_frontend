import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

/*
 * The session in memory (auth-hardening P1): one shared refresh at a time
 * (two rotations of the same refresh token would look like theft to Hydra),
 * a single retry after a 401, and nothing in localStorage.
 */

const json = (status, body) => ({ ok: status < 400, status, json: async () => body });

let client;

beforeEach(async () => {
  vi.resetModules();
  vi.useFakeTimers();
  localStorage.setItem("omnicore_access_token", "left-from-before-p1");
  client = await import("./client");
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  localStorage.clear();
});

describe("session", () => {
  test("a token from before P1 is removed, and none is ever written", async () => {
    expect(localStorage.getItem("omnicore_access_token")).toBeNull();

    const setItem = vi.spyOn(Storage.prototype, "setItem");
    global.fetch = vi.fn().mockResolvedValue(json(200, { accessToken: "a1", expiresIn: 300 }));
    await client.refreshSession();

    expect(client.getToken()).toBe("a1");
    expect(setItem).not.toHaveBeenCalled();
  });

  test("concurrent refreshes share one request (StrictMode starts twice)", async () => {
    let answer;
    global.fetch = vi.fn(() => new Promise((resolve) => (answer = resolve)));

    const first = client.refreshSession();
    const second = client.refreshSession();
    answer(json(200, { accessToken: "a1", expiresIn: 300 }));

    expect(await first).toBe("a1");
    expect(await second).toBe("a1");
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(expect.stringMatching(/\/auth\/refresh$/), expect.objectContaining({ method: "POST", credentials: "include" }));
  });

  test("refreshes again 30 seconds before the token expires", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce(json(200, { accessToken: "a1", expiresIn: 300 })).mockResolvedValueOnce(json(200, { accessToken: "a2", expiresIn: 300 }));
    await client.refreshSession();

    await vi.advanceTimersByTimeAsync(269 * 1000);
    expect(fetch).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(2 * 1000);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(client.getToken()).toBe("a2");
  });

  test("a 401 refreshes once and retries the call with the new token", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(json(200, { accessToken: "old", expiresIn: 300 }))
      .mockResolvedValueOnce(json(401, { error: "expired" }))
      .mockResolvedValueOnce(json(200, { accessToken: "new", expiresIn: 300 }))
      .mockResolvedValueOnce(json(200, { leads: [] }));
    await client.refreshSession();

    expect(await client.default("/leads")).toEqual({ leads: [] });
    expect(fetch.mock.calls[3][1].headers.Authorization).toBe("Bearer new");
  });

  test("a refused refresh ends the session and says so", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce(json(200, { accessToken: "a1", expiresIn: 300 })).mockResolvedValueOnce(json(401, {})).mockResolvedValueOnce(json(401, {}));
    await client.refreshSession();
    const ended = vi.fn();
    window.addEventListener(client.SESSION_ENDED, ended);

    await expect(client.default("/leads")).rejects.toMatchObject({ status: 401 });

    expect(client.getToken()).toBeNull();
    expect(ended).toHaveBeenCalledTimes(1);
    window.removeEventListener(client.SESSION_ENDED, ended);
  });

  test("signing out revokes on the server and forgets the token", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce(json(200, { accessToken: "a1", expiresIn: 300 })).mockResolvedValueOnce({ ok: true, status: 204 });
    await client.refreshSession();

    await client.endSession();

    expect(fetch).toHaveBeenLastCalledWith(expect.stringMatching(/\/auth\/logout$/), expect.objectContaining({ method: "POST", credentials: "include" }));
    expect(client.getToken()).toBeNull();
  });
});
