import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import { CardSkeleton, GridSkeleton, SettingRowsSkeleton, Skeleton, SkeletonRegion, SkeletonText } from "./Skeleton";
import { DetailPageSkeleton, FormPageSkeleton } from "./PageSkeleton";
import StatCard from "./StatCard";

/*
 * Skeletons are what a screen shows while it loads: shimmer bars hidden from
 * screen readers, inside one busy region that says "Loading…".
 */

describe("Skeleton", () => {
  test("a bar takes its size and is hidden from screen readers", () => {
    const { container } = render(<Skeleton width={120} height={14} radius={4} />);
    const bar = container.querySelector(".skeleton");

    expect(bar).toHaveAttribute("aria-hidden", "true");
    expect(bar).toHaveStyle({ width: "120px", height: "14px", borderRadius: "4px" });
  });

  test("text is a bar per line, the last one shorter", () => {
    const { container } = render(<SkeletonText lines={3} />);
    const bars = container.querySelectorAll(".skeleton");

    expect(bars).toHaveLength(3);
    expect(bars[2]).toHaveStyle({ width: "58%" });
  });

  test("a region is busy and announces Loading… once", () => {
    render(
      <SkeletonRegion aria-label="Clients">
        <Skeleton />
      </SkeletonRegion>,
    );

    const region = screen.getByRole("status");
    expect(region).toHaveAttribute("aria-busy", "true");
    expect(region).toHaveTextContent("Loading…");
    expect(screen.getAllByText("Loading…")).toHaveLength(1);
  });

  test("a grid skeleton has the asked-for columns and rows", () => {
    const { container } = render(<GridSkeleton label="Files" columns={3} rows={4} />);

    expect(screen.getByRole("status", { name: "Files" })).toBeInTheDocument();
    expect(container.querySelectorAll("thead th")).toHaveLength(3);
    expect(container.querySelectorAll("tbody tr.grid-skeleton-row")).toHaveLength(4);
  });

  test("a card is fields or lines; inside a page it does not announce itself again", () => {
    const { container, rerender } = render(<CardSkeleton label="Engagement" fields={4} />);
    expect(container.querySelectorAll(".skeleton-field")).toHaveLength(4);
    expect(screen.getByRole("status", { name: "Engagement" })).toBeInTheDocument();

    rerender(<CardSkeleton region={false} />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  test("setting rows take the real rows' classes", () => {
    const { container } = render(<SettingRowsSkeleton label="Firm details" rows={5} />);

    expect(screen.getByRole("status", { name: "Firm details" })).toBeInTheDocument();
    expect(container.querySelectorAll(".setting-row")).toHaveLength(5);
  });

  test("a page skeleton keeps the page's wrapper and is one busy region", () => {
    const { container, rerender } = render(<DetailPageSkeleton className="page record-detail-page client-detail" tabs={6} />);

    expect(container.firstChild.tagName).toBe("MAIN");
    expect(container.firstChild).toHaveClass("record-detail-page", "client-detail");
    expect(screen.getAllByRole("status")).toHaveLength(1);
    expect(container.querySelectorAll(".skeleton-tabs .skeleton")).toHaveLength(6);

    rerender(<FormPageSkeleton as="div" className="customer-workflow-page client-wizard" steps={4} />);
    expect(container.firstChild.tagName).toBe("DIV");
    expect(screen.getAllByRole("status")).toHaveLength(1);
    expect(container.querySelectorAll(".skeleton-tabs .skeleton")).toHaveLength(4);
  });

  test("a loading stat card shimmers its value instead of a dash", () => {
    const { container, rerender } = render(<StatCard label="Open prospects" value="—" hint="Not yet clients" loading />);

    expect(container.querySelector(".dashboard-stat-value .skeleton")).toBeInTheDocument();
    expect(screen.queryByText("—")).not.toBeInTheDocument();
    expect(screen.queryByText("Not yet clients")).not.toBeInTheDocument();

    rerender(<StatCard label="Open prospects" value={7} hint="Not yet clients" />);
    expect(screen.getByText("7")).toBeInTheDocument();
    expect(screen.getByText("Not yet clients")).toBeInTheDocument();
  });
});
