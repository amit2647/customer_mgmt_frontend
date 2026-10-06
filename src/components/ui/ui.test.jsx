import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, test, vi } from "vitest";

import Breadcrumb from "./Breadcrumb";
import PageState from "./PageState";
import ServicePicker from "./ServicePicker";
import StatCard from "./StatCard";
import WizardSteps from "./WizardSteps";

/*
 * The shared building blocks render the classes the pages always had, so
 * adopting one changes nothing visible; these pin their behaviour.
 */

describe("Breadcrumb", () => {
  test("goes back, and says where you are", () => {
    const onBack = vi.fn();
    render(<Breadcrumb onBack={onBack} backLabel="Settings" section="SETTINGS" title="Firm" />);

    fireEvent.click(screen.getByRole("button", { name: "← Back to Settings" }));
    expect(onBack).toHaveBeenCalled();
    expect(screen.getByText("SETTINGS")).toBeInTheDocument();
    expect(screen.getByText("Firm")).toBeInTheDocument();
  });
});

describe("WizardSteps", () => {
  test("ticks done steps and marks the current one", () => {
    const { container } = render(
      <WizardSteps steps={[{ id: 1, title: "Contact" }, { id: 2, title: "Services" }, { id: 3, title: "Review" }]} current={2} className="customer-workflow-steps" />,
    );

    const steps = container.querySelectorAll(".workflow-step");
    expect(container.firstChild).toHaveClass("workflow-steps", "customer-workflow-steps");
    expect(steps[0]).toHaveClass("completed");
    expect(steps[0]).toHaveTextContent("✓");
    expect(steps[1]).toHaveClass("active");
    expect(steps[2]).toHaveTextContent("3");
  });
});

describe("ServicePicker", () => {
  const services = [
    { id: 1, name: "GST Returns", category: "GST" },
    { id: 2, name: "TDS Returns", category: "Compliance" },
  ];

  test("toggles services and counts only the ones offered", () => {
    const onChange = vi.fn();
    render(<ServicePicker services={services} selected={[2, 99]} onChange={onChange} />);

    expect(screen.getByRole("heading", { name: "GST" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /TDS Returns/ })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("service selected")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /GST Returns/ }));
    expect(onChange).toHaveBeenCalledWith([2, 99, 1]);

    fireEvent.click(screen.getByRole("button", { name: /TDS Returns/ }));
    expect(onChange).toHaveBeenLastCalledWith([99]);
  });

  test("flat, it puts the category on each card instead of headings", () => {
    render(<ServicePicker grouped={false} services={services} selected={[]} onChange={vi.fn()} />);

    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /GST Returns\s*GST/ })).toBeInTheDocument();
  });
});

describe("StatCard", () => {
  test("is a link, a filter button or a plain figure", () => {
    const onClick = vi.fn();
    render(
      <MemoryRouter>
        <StatCard to="/leads" label="Total Leads" value={2} hint="All lead records" linkLabel="View leads" />
        <StatCard onClick={onClick} active label="Overdue" value={3} hint="Past the due date" linkLabel="Show" />
        <StatCard label="Quoted value" value="₹45,000" hint="Across open prospects" />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: /Total Leads/ })).toHaveAttribute("href", "/leads");

    const filter = screen.getByRole("button", { name: /^Overdue/ });
    expect(filter).toHaveClass("dashboard-stat-card", "stat-button", "active");
    expect(filter).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(filter);
    expect(onClick).toHaveBeenCalled();

    expect(screen.getByText("₹45,000").closest(".dashboard-stat-card").tagName).toBe("DIV");
  });
});

describe("PageState", () => {
  test("shows a heading, a sentence and one way on", () => {
    render(<PageState icon="!" tone="error" title="Unable to load lead" action={<button type="button">Back to Leads</button>}>Not found</PageState>);

    expect(screen.getByRole("heading", { name: "Unable to load lead" })).toBeInTheDocument();
    expect(screen.getByText("!")).toHaveClass("workflow-page-state-icon", "error");
    expect(screen.getByText("Not found")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Back to Leads" })).toBeInTheDocument();
  });
});
