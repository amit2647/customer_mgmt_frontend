import { render } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import AssistantMessage from "./AssistantMessage";

/*
 * Model output is untrusted. It is rendered as Markdown, but raw HTML in it
 * must never become live elements.
 */
describe("AssistantMessage", () => {
  test("renders the assistant's Markdown", () => {
    const { container } = render(
      <AssistantMessage role="assistant" content={"**Two** leads:\n\n- Priya\n- Thiago"} />,
    );

    expect(container.querySelector("strong")).toHaveTextContent("Two");
    expect(container.querySelectorAll("li")).toHaveLength(2);
  });

  test("does not turn raw HTML from the model into elements", () => {
    const { container } = render(
      <AssistantMessage
        role="assistant"
        content={'Hi <img src="x" onerror="alert(1)"> <script>alert(2)</script>'}
      />,
    );

    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("script")).toBeNull();
  });

  test("drops javascript: links", () => {
    const { container } = render(
      <AssistantMessage role="assistant" content="[click](javascript:alert(1))" />,
    );

    const link = container.querySelector("a");

    expect(link?.getAttribute("href") || "").not.toMatch(/^javascript:/i);
  });

  test("opens links in a new tab without handing over the opener", () => {
    const { container } = render(
      <AssistantMessage role="assistant" content="[docs](https://example.com)" />,
    );

    const link = container.querySelector("a");

    expect(link).toHaveAttribute("target", "_blank");
    expect(link.getAttribute("rel")).toMatch(/noopener/);
  });

  test("shows what the user typed verbatim, not as Markdown", () => {
    const { container } = render(<AssistantMessage role="user" content="**not bold** a_b_c" />);

    expect(container.querySelector("strong")).toBeNull();
    expect(container).toHaveTextContent("**not bold** a_b_c");
  });

  test("marks a failed message and offers a retry", () => {
    const { getByRole } = render(
      <AssistantMessage role="user" content="hello" failed onRetry={() => {}} />,
    );

    expect(getByRole("button", { name: /retry/i })).toBeInTheDocument();
  });
});
