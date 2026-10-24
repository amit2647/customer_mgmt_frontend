import "@testing-library/jest-dom/vitest";
import { act, cleanup, configure } from "@testing-library/react";
import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach } from "vitest";

import FeedbackHost from "../components/ui/FeedbackHost";
import { resetFeedback } from "../components/ui/feedback";

// findBy*/waitFor default to 1 s; a file's first render in a busy worker
// pool (CI, or all files at once) can take longer than that.
configure({ asyncUtilTimeout: 4000 });

/*
 * Toasts and the confirm dialog are drawn by one host the app mounts beside
 * itself; every test gets one too, so it finds them through `screen` like
 * anything else on the page.
 */
let host;

beforeEach(() => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  host = { container, root: createRoot(container) };
  act(() => host.root.render(createElement(FeedbackHost)));
});

afterEach(() => {
  cleanup();
  act(() => {
    resetFeedback();
    host.root.unmount();
  });
  host.container.remove();
});
