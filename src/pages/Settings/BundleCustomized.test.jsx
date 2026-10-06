import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import BundleCustomized from "./BundleCustomized";

const api = vi.hoisted(() => ({ getCustomizedItems: vi.fn(), chooseCustomizedItem: vi.fn() }));
vi.mock("../../api/bundles", () => api);

const ROLE = {
  step: "roles",
  kind: "role",
  key: "partner",
  name: "Senior Partner",
  mine: { name: "Senior Partner", description: null, permissions: ["customers.read"] },
  theirs: { name: "Partner", description: null, permissions: ["customers.read"] },
  version: "0.8.0",
};

beforeEach(() => {
  Object.values(api).forEach((mock) => mock.mockReset());
});

/*
 * Settings → Profession Bundle: items the firm edited that the installed
 * version ships differently, with only the differing fields, and a choice.
 */
describe("BundleCustomized", () => {
  test("shows what differs, and accepting takes the bundle's version", async () => {
    api.getCustomizedItems.mockResolvedValueOnce({ items: [ROLE] }).mockResolvedValueOnce({ items: [] });
    api.chooseCustomizedItem.mockResolvedValue({});
    render(<BundleCustomized version="0.8.0" />);

    expect(await screen.findByText("Senior Partner")).toBeInTheDocument();
    expect(screen.getByText("Role")).toBeInTheDocument();
    // Only the field that differs.
    expect(screen.getByText("name:")).toBeInTheDocument();
    expect(screen.queryByText("permissions:")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Accept the bundle's Senior Partner" }));

    expect(await screen.findByText("Senior Partner now has the bundle's version.")).toBeInTheDocument();
    expect(api.chooseCustomizedItem).toHaveBeenCalledWith(ROLE, "accept");
    expect(screen.getByText(/Nothing customized/)).toBeInTheDocument();
  });

  test("keep mine dismisses the item", async () => {
    api.getCustomizedItems.mockResolvedValue({ items: [ROLE] });
    api.chooseCustomizedItem.mockResolvedValue({});
    render(<BundleCustomized version="0.8.0" />);

    fireEvent.click(await screen.findByRole("button", { name: "Keep my Senior Partner" }));

    expect(await screen.findByText("Your version of Senior Partner is kept.")).toBeInTheDocument();
    expect(api.chooseCustomizedItem).toHaveBeenCalledWith(ROLE, "dismiss");
  });

  test("says when nothing is customized", async () => {
    api.getCustomizedItems.mockResolvedValue({ items: [] });
    render(<BundleCustomized version="0.8.0" />);

    expect(await screen.findByText(/Nothing customized/)).toBeInTheDocument();
  });
});
