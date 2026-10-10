import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import DataGrid from "./DataGrid";
import Pill, { toneFor } from "./Pill";

/*
 * The product's one table: search, sort, filters, columns, paging and
 * selection, each switched on by the table that needs it.
 */

const STORES = Array.from({ length: 23 }, (_, index) => ({
  id: index + 1,
  name: `Store ${String(index + 1).padStart(2, "0")}`,
  city: ["Lyon", "Paris", "Toulouse"][index % 3],
  state: index % 4 === 0 ? "CLOSED" : "OPEN",
  basket: 100 - index,
}));

const COLUMNS = [
  { key: "name", header: "Name" },
  { key: "city", header: "City", filter: true },
  { key: "state", header: "State", filter: { tone: (value) => (value === "OPEN" ? "success" : "danger") }, render: (row) => <Pill dot tone={row.state === "OPEN" ? "success" : "danger"}>{row.state}</Pill> },
  { key: "basket", header: "Basket", align: "right" },
];

const names = () => screen.getAllByRole("row").slice(1).map((row) => within(row).getAllByRole("cell")[0].textContent);

beforeEach(() => {
  try {
    localStorage.clear();
  } catch {
    // ignore
  }
});

describe("DataGrid", () => {
  test("a short list is a plain table: no toolbar, no paging", () => {
    render(<DataGrid label="Steps" rows={STORES.slice(0, 3)} columns={COLUMNS} />);

    expect(screen.getByRole("region", { name: "Steps" })).toBeInTheDocument();
    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "Pages" })).not.toBeInTheDocument();
    expect(names()).toEqual(["Store 01", "Store 02", "Store 03"]);
  });

  test("pages a long list, with the total and lines per page", () => {
    render(<DataGrid label="Stores" rows={STORES} columns={COLUMNS} pageSize={10} />);

    expect(names()).toHaveLength(10);
    expect(screen.getByText("Total").parentElement).toHaveTextContent("Total 23");

    fireEvent.click(screen.getByRole("button", { name: "Page 3" }));
    expect(names()).toEqual(["Store 21", "Store 22", "Store 23"]);

    fireEvent.change(screen.getByLabelText("Lines per page"), { target: { value: "25" } });
    expect(names()).toHaveLength(23);
  });

  test("sorts by a column: ascending, descending, then off", () => {
    render(<DataGrid label="Stores" rows={STORES.slice(0, 4)} columns={COLUMNS} />);
    const basket = screen.getByRole("button", { name: /Basket/ });

    fireEvent.click(basket);
    expect(names()).toEqual(["Store 04", "Store 03", "Store 02", "Store 01"]);
    expect(basket.closest("th")).toHaveAttribute("aria-sort", "ascending");

    fireEvent.click(basket);
    expect(names()).toEqual(["Store 01", "Store 02", "Store 03", "Store 04"]);

    fireEvent.click(basket);
    expect(basket.closest("th")).not.toHaveAttribute("aria-sort");
  });

  test("searches every column's text", () => {
    render(<DataGrid label="Stores" rows={STORES} columns={COLUMNS} search={{ placeholder: "Search stores" }} />);

    fireEvent.change(screen.getByLabelText("Search stores"), { target: { value: "store 2" } });

    expect(names()).toEqual(["Store 20", "Store 21", "Store 22", "Store 23"]);
  });

  test("filters through a chip of values, with select all and clear", () => {
    render(<DataGrid label="Stores" rows={STORES} columns={COLUMNS} pageSize={50} />);

    fireEvent.click(screen.getByRole("button", { name: "Filters" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "City" }));

    const chip = screen.getByRole("group", { name: "City filter" });
    fireEvent.click(within(chip).getByRole("button", { name: /^City/ }));
    fireEvent.click(within(chip).getByRole("checkbox", { name: "Lyon" }));
    expect(names().every((name) => STORES.find((store) => store.name === name).city === "Lyon")).toBe(true);
    expect(chip).toHaveTextContent("Lyon");

    fireEvent.click(within(chip).getByRole("checkbox", { name: "Paris" }));
    expect(chip).toHaveTextContent("2 selected");

    fireEvent.click(within(chip).getByRole("checkbox", { name: "Select all" }));
    expect(names()).toHaveLength(23);

    fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    expect(screen.queryByRole("group", { name: "City filter" })).not.toBeInTheDocument();
  });

  test("hides and shows columns, remembered per grid", () => {
    const columns = [...COLUMNS, { key: "id", header: "Code" }];
    const { unmount } = render(<DataGrid id="stores" label="Stores" rows={STORES.slice(0, 3)} columns={columns} />);

    fireEvent.click(screen.getByRole("button", { name: "Columns" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "City" }));
    expect(screen.queryByRole("columnheader", { name: /City/ })).not.toBeInTheDocument();
    unmount();

    render(<DataGrid id="stores" label="Stores" rows={STORES.slice(0, 3)} columns={columns} />);
    expect(screen.queryByRole("columnheader", { name: /City/ })).not.toBeInTheDocument();
  });

  test("selects rows; select all covers what the filters leave, on every page", () => {
    const onChange = vi.fn();
    render(
      <DataGrid label="Stores" rows={STORES} columns={COLUMNS} pageSize={10}
        selection={{ selected: new Set([2]), onChange, isDisabled: (row) => row.id === 1 }} />,
    );

    expect(screen.getByRole("checkbox", { name: "Select Store 02" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Select Store 01" })).toBeDisabled();
    expect(screen.getByText(/1 selected/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("checkbox", { name: "Select all" }));
    expect(onChange.mock.calls[0][0].size).toBe(22);
  });

  test("an expanded row spans the table, and the empty states differ", () => {
    render(<DataGrid label="Stores" rows={STORES.slice(0, 2)} columns={COLUMNS} expandedRow={(row) => (row.id === 1 ? <p>Editing Store 01</p> : null)} />);
    expect(screen.getByText("Editing Store 01").closest("td")).toHaveAttribute("colspan", "4");

    render(<DataGrid label="Nothing" rows={[]} columns={COLUMNS} empty="No stores yet." />);
    expect(screen.getByText("No stores yet.")).toBeInTheDocument();
  });

  test("a category always gets the same hue", () => {
    expect(toneFor("GST")).toBe(toneFor("GST"));
    render(<Pill tone="success" dot>Open</Pill>);
    expect(screen.getByText("Open")).toHaveClass("grid-pill", "tone-success", "with-dot");
  });

  test("while loading: the real toolbar and headers over shimmer rows, no empty message", () => {
    const { container, rerender } = render(<DataGrid label="Stores" rows={[]} columns={COLUMNS} search loading empty="No stores yet." />);

    const grid = screen.getByRole("region", { name: "Stores" });
    expect(grid).toHaveAttribute("aria-busy", "true");
    expect(within(grid).getByRole("status")).toHaveTextContent("Loading…");
    expect(screen.getByRole("searchbox")).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /City/ })).toBeInTheDocument();
    expect(screen.queryByText("No stores yet.")).not.toBeInTheDocument();

    const shimmer = container.querySelectorAll("tbody tr.grid-skeleton-row");
    expect(shimmer).toHaveLength(6);
    expect(shimmer[0].querySelectorAll("td")).toHaveLength(COLUMNS.length);

    rerender(<DataGrid label="Stores" rows={STORES.slice(0, 2)} columns={COLUMNS} search empty="No stores yet." />);
    expect(grid).not.toHaveAttribute("aria-busy");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(names()).toEqual(["Store 01", "Store 02"]);
  });

  test("while loading, a selectable grid keeps its checkbox column", () => {
    const { container } = render(
      <DataGrid label="Stores" rows={[]} columns={COLUMNS} loading selection={{ selected: new Set(), onChange: () => {} }} />,
    );

    expect(container.querySelector("tbody tr.grid-skeleton-row").querySelectorAll("td")).toHaveLength(COLUMNS.length + 1);
    expect(screen.queryByText("Total")).not.toBeInTheDocument();
  });
});
