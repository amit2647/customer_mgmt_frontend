import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  CaretDown,
  CaretLeft,
  CaretRight,
  CaretUpDown,
  Columns,
  FunnelSimple,
  MagnifyingGlass,
  X,
} from "@phosphor-icons/react";

import Pill from "./Pill";

/*
 * The product's one table: an interactive data grid. Every list in the app
 * renders through it, so they all look and behave alike.
 *
 * Toolbar parts switch on only when a table asks for them — a three-row list
 * stays a plain table; a growing list gets search, filters and paging:
 *
 *   rows, rowKey(row)        the data, and a stable key per row
 *   columns                  [{ key, header, render(row), value(row), align,
 *                              sortable = true, hideable = true, hidden,
 *                              filter: true | { label(value), tone(value),
 *                              values(row) }, className }]
 *   search                   true | { placeholder, label, text(row) }
 *   initialSort              { key, dir: "asc" | "desc" }
 *   pageSize, pageSizes      paging appears once there is more than one page
 *   controls / actions       nodes at the toolbar's left / right
 *   selection                { selected: Set, onChange(Set), isDisabled(row) }
 *   expandedRow(row)         a full-width row after it (inline forms)
 *   rowClassName(row)        extra classes per row
 *   id                       remembers hidden columns and page size per viewer
 *   embedded                 no frame of its own, for a table inside a card
 *   filters, onFiltersChange the chosen filter values ({ key: Set }) held by
 *                            the page, so controls outside the grid (stat
 *                            cards) and the chips are one filter; omit both
 *                            and the grid keeps its own
 *
 * All of it is client-side: the lists it shows are loaded whole.
 */

const PAGE_SIZES = [10, 15, 25, 50];

function readStored(id) {
  if (!id) return null;
  try {
    return JSON.parse(localStorage.getItem(`omnicore-grid:${id}`) || "null");
  } catch {
    return null;
  }
}

function writeStored(id, value) {
  if (!id) return;
  try {
    localStorage.setItem(`omnicore-grid:${id}`, JSON.stringify(value));
  } catch {
    // Private mode: settings simply last this visit.
  }
}

const valueOf = (column, row) => (column.value ? column.value(row) : row[column.key]);

function filterValues(column, row) {
  const values = column.filter?.values ? column.filter.values(row) : valueOf(column, row);
  return (Array.isArray(values) ? values : [values]).filter((value) => value !== null && value !== undefined && value !== "");
}

function compare(a, b) {
  const blankA = a === null || a === undefined || a === "";
  const blankB = b === null || b === undefined || b === "";
  if (blankA || blankB) return blankA === blankB ? 0 : blankA ? 1 : -1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: "base" });
}

// 1 … 4 5 6 … 12
function pageList(page, pages) {
  if (pages <= 7) return Array.from({ length: pages }, (_, index) => index + 1);
  const list = [1];
  const from = Math.max(2, page - 1);
  const to = Math.min(pages - 1, page + 1);
  if (from > 2) list.push("…");
  for (let number = from; number <= to; number += 1) list.push(number);
  if (to < pages - 1) list.push("…");
  list.push(pages);
  return list;
}

// A button that opens a small panel; closes on outside click or Escape.
function Popover({ label, icon, open, onToggle, children, className = "", buttonClass = "grid-tool" }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => {
      if (event.type === "keydown" ? event.key === "Escape" : !ref.current?.contains(event.target)) onToggle(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open, onToggle]);

  return (
    <div className={`grid-popover ${className}`} ref={ref}>
      <button type="button" className={buttonClass} aria-expanded={open} onClick={() => onToggle(!open)}>
        {icon}
        {label}
      </button>
      {open && <div className="grid-popover-panel">{children}</div>}
    </div>
  );
}

function FilterChip({ column, options, chosen, onChange, onRemove }) {
  const [open, setOpen] = useState(false);
  const header = typeof column.header === "string" ? column.header : column.key;
  const label = (value) => (column.filter?.label ? column.filter.label(value) : String(value));
  const tone = (value) => (column.filter?.tone ? column.filter.tone(value) : "neutral");
  const allChosen = options.length > 0 && options.every((value) => chosen.has(value));

  const toggle = (value) => {
    const next = new Set(chosen);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    onChange(next);
  };

  const summary =
    chosen.size === 0 ? (
      <span className="grid-chip-any">Any</span>
    ) : chosen.size === 1 ? (
      <Pill tone={tone([...chosen][0])}>{label([...chosen][0])}</Pill>
    ) : (
      <>
        <span className="grid-chip-count">{chosen.size}</span> selected
      </>
    );

  return (
    <div className="grid-chip" role="group" aria-label={`${header} filter`}>
      <Popover
        open={open}
        onToggle={setOpen}
        buttonClass="grid-chip-button"
        label={
          <>
            <span className="grid-chip-name">{header}</span>
            {summary}
            <CaretDown size={12} weight="bold" aria-hidden="true" />
          </>
        }
      >
        <div className="grid-options" role="listbox" aria-multiselectable="true" aria-label={header}>
          {options.length === 0 && <div className="grid-options-empty">No values</div>}
          {options.map((value) => (
            <label key={String(value)} className="grid-option">
              <input type="checkbox" checked={chosen.has(value)} onChange={() => toggle(value)} />
              <Pill tone={tone(value)}>{label(value)}</Pill>
            </label>
          ))}
        </div>
        {options.length > 1 && (
          <label className="grid-option grid-option-all">
            <span>Select all</span>
            <input type="checkbox" checked={allChosen} onChange={() => onChange(allChosen ? new Set() : new Set(options))} />
          </label>
        )}
      </Popover>
      <button type="button" className="grid-chip-remove" onClick={onRemove} aria-label={`Remove ${header} filter`}>
        <X size={12} weight="bold" aria-hidden="true" />
      </button>
    </div>
  );
}

function DataGrid({
  id,
  label,
  rows = [],
  rowKey = (row) => row.id,
  columns,
  search,
  initialSort = null,
  pageSize: initialPageSize = 15,
  pageSizes = PAGE_SIZES,
  controls,
  actions,
  selection,
  expandedRow,
  rowClassName,
  embedded = false,
  empty = "Nothing here yet.",
  emptyFiltered = "Nothing matches the search and filters.",
  filters: chosenFilters,
  onFiltersChange,
}) {
  const stored = useMemo(() => readStored(id), [id]);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState(initialSort);
  const [hidden, setHidden] = useState(() => new Set(stored?.hidden ?? columns.filter((column) => column.hidden).map((column) => column.key)));
  const [ownFilters, setOwnFilters] = useState({}); // key -> Set of chosen values
  const filters = chosenFilters ?? ownFilters;

  function setFilters(next) {
    const value = typeof next === "function" ? next(filters) : next;
    if (chosenFilters === undefined) setOwnFilters(value);
    onFiltersChange?.(value);
  }
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(stored?.pageSize && pageSizes.includes(stored.pageSize) ? stored.pageSize : initialPageSize);
  const [menu, setMenu] = useState(null); // "columns" | "filters" | null

  useEffect(() => writeStored(id, { hidden: [...hidden], pageSize }), [id, hidden, pageSize]);

  const filterable = columns.filter((column) => column.filter);
  const hideable = columns.filter((column) => column.hideable !== false && column.header);
  const shown = columns.filter((column) => !hidden.has(column.key));
  const searchText = search && typeof search === "object" && search.text;

  // Search, then each filter (a row passes when any of its values is chosen).
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (needle) {
        const haystack = searchText
          ? searchText(row)
          : columns.map((column) => filterValues(column, row).join(" ")).join(" ");
        if (!String(haystack).toLowerCase().includes(needle)) return false;
      }
      return Object.entries(filters).every(([key, chosen]) => {
        if (!chosen || chosen.size === 0) return true;
        const column = columns.find((candidate) => candidate.key === key);
        return column ? filterValues(column, row).some((value) => chosen.has(value)) : true;
      });
    });
  }, [rows, query, filters, columns, searchText]);

  const sorted = useMemo(() => {
    if (!sort) return filtered;
    const column = columns.find((candidate) => candidate.key === sort.key);
    if (!column) return filtered;
    const direction = sort.dir === "desc" ? -1 : 1;
    return [...filtered].sort((a, b) => direction * compare(valueOf(column, a), valueOf(column, b)));
  }, [filtered, sort, columns]);

  const paginated = sorted.length > Math.min(...pageSizes);
  const pages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const currentPage = Math.min(page, pages);
  const visible = paginated ? sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize) : sorted;

  useEffect(() => setPage(1), [query, filters, pageSize]);

  const optionsFor = (column) => {
    const seen = new Map();
    rows.forEach((row) => filterValues(column, row).forEach((value) => seen.set(String(value), value)));
    return [...seen.values()].sort((a, b) => compare(column.filter?.label ? column.filter.label(a) : a, column.filter?.label ? column.filter.label(b) : b));
  };

  const cycleSort = (column) =>
    setSort((current) =>
      current?.key !== column.key ? { key: column.key, dir: "asc" } : current.dir === "asc" ? { key: column.key, dir: "desc" } : null,
    );

  const activeFilters = Object.keys(filters);
  const narrowed = query.trim() !== "" || activeFilters.some((key) => filters[key]?.size > 0);
  const hasToolbar = Boolean(search || filterable.length > 0 || controls || actions);

  // Selection covers every row the search and filters leave, on all pages.
  const selectable = selection ? sorted.filter((row) => !selection.isDisabled?.(row)) : [];
  const selectedCount = selection ? selectable.filter((row) => selection.selected.has(rowKey(row))).length : 0;
  const allSelected = selectable.length > 0 && selectedCount === selectable.length;

  const toggleAll = () => {
    const next = new Set(selection.selected);
    selectable.forEach((row) => (allSelected ? next.delete(rowKey(row)) : next.add(rowKey(row))));
    selection.onChange(next);
  };

  const toggleRow = (row) => {
    const next = new Set(selection.selected);
    const key = rowKey(row);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    selection.onChange(next);
  };

  const columnCount = shown.length + (selection ? 1 : 0);

  return (
    <section className={`data-grid${embedded ? " embedded" : ""}`} aria-label={label}>
      {hasToolbar && (
        <div className="grid-toolbar">
          <div className="grid-toolbar-start">{controls}</div>

          <div className="grid-toolbar-end">
            {search && (
              <div className="grid-search">
                <MagnifyingGlass size={16} weight="regular" aria-hidden="true" />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={(typeof search === "object" && search.placeholder) || "Search"}
                  aria-label={(typeof search === "object" && (search.label || search.placeholder)) || "Search"}
                />
              </div>
            )}

            {hideable.length > 3 && (
              <Popover
                label="Columns"
                icon={<Columns size={16} weight="regular" aria-hidden="true" />}
                open={menu === "columns"}
                onToggle={(open) => setMenu(open ? "columns" : null)}
              >
                <div className="grid-options" aria-label="Columns">
                  {hideable.map((column) => (
                    <label key={column.key} className="grid-option">
                      <input
                        type="checkbox"
                        checked={!hidden.has(column.key)}
                        disabled={!hidden.has(column.key) && shown.length === 1}
                        onChange={() => {
                          const next = new Set(hidden);
                          if (next.has(column.key)) next.delete(column.key);
                          else next.add(column.key);
                          setHidden(next);
                        }}
                      />
                      <span>{column.header}</span>
                    </label>
                  ))}
                </div>
              </Popover>
            )}

            {filterable.length > 0 && (
              <Popover
                label="Filters"
                icon={<FunnelSimple size={16} weight="regular" aria-hidden="true" />}
                open={menu === "filters"}
                onToggle={(open) => setMenu(open ? "filters" : null)}
              >
                <div className="grid-options" aria-label="Filters">
                  {filterable.map((column) => (
                    <label key={column.key} className="grid-option">
                      <input
                        type="checkbox"
                        checked={column.key in filters}
                        onChange={() => {
                          const next = { ...filters };
                          if (column.key in next) delete next[column.key];
                          else next[column.key] = new Set();
                          setFilters(next);
                        }}
                      />
                      <span>{column.header}</span>
                    </label>
                  ))}
                </div>
              </Popover>
            )}

            {actions && <div className="grid-actions">{actions}</div>}
          </div>
        </div>
      )}

      {activeFilters.length > 0 && (
        <div className="grid-chips">
          {activeFilters.map((key) => {
            const column = columns.find((candidate) => candidate.key === key);
            return (
              <FilterChip
                key={key}
                column={column}
                options={optionsFor(column)}
                chosen={filters[key]}
                onChange={(chosen) => setFilters((current) => ({ ...current, [key]: chosen }))}
                onRemove={() =>
                  setFilters((current) => {
                    const next = { ...current };
                    delete next[key];
                    return next;
                  })
                }
              />
            );
          })}
          <button type="button" className="grid-clear" onClick={() => setFilters({})}>
            Clear
          </button>
        </div>
      )}

      <div className="grid-frame">
        <div className="grid-scroll">
          <table className="grid-table">
            <thead>
              <tr>
                {selection && (
                  <th className="grid-check">
                    <input
                      type="checkbox"
                      aria-label="Select all"
                      checked={allSelected}
                      ref={(input) => input && (input.indeterminate = selectedCount > 0 && !allSelected)}
                      onChange={toggleAll}
                      disabled={selectable.length === 0}
                    />
                  </th>
                )}
                {shown.map((column) => {
                  const sortable = column.sortable !== false && column.header;
                  const active = sort?.key === column.key;
                  return (
                    <th
                      key={column.key}
                      className={`${column.align === "right" ? "numeric" : ""} ${column.className || ""}`.trim() || undefined}
                      aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : undefined}
                    >
                      {sortable ? (
                        <button type="button" className={`grid-sort${active ? " active" : ""}`} onClick={() => cycleSort(column)}>
                          {column.header}
                          {active ? (
                            sort.dir === "asc" ? <ArrowUp size={12} weight="bold" aria-hidden="true" /> : <ArrowDown size={12} weight="bold" aria-hidden="true" />
                          ) : (
                            <CaretUpDown size={12} weight="bold" aria-hidden="true" />
                          )}
                        </button>
                      ) : (
                        column.header
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody>
              {visible.length === 0 && (
                <tr className="grid-empty-row">
                  <td colSpan={columnCount}>{narrowed ? emptyFiltered : empty}</td>
                </tr>
              )}
              {visible.map((row) => {
                const key = rowKey(row);
                const extra = expandedRow?.(row);
                const isSelected = selection?.selected.has(key);
                return (
                  <Fragment key={key}>
                    <tr className={`${isSelected ? "selected " : ""}${rowClassName?.(row) || ""}`.trim() || undefined}>
                      {selection && (
                        <td className="grid-check">
                          <input
                            type="checkbox"
                            aria-label={`Select ${typeof row.name === "string" ? row.name : key}`}
                            checked={Boolean(isSelected)}
                            disabled={selection.isDisabled?.(row)}
                            onChange={() => toggleRow(row)}
                          />
                        </td>
                      )}
                      {shown.map((column) => (
                        <td key={column.key} className={`${column.align === "right" ? "numeric" : ""} ${column.className || ""}`.trim() || undefined}>
                          {column.render ? column.render(row) : valueOf(column, row) ?? "—"}
                        </td>
                      ))}
                    </tr>
                    {extra && (
                      <tr className="grid-expanded-row">
                        <td colSpan={columnCount}>{extra}</td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {(paginated || selection) && (
          <div className="grid-footer">
            <span className="grid-total">
              Total <strong>{sorted.length}</strong>
              {selection && selectedCount > 0 && <span className="grid-selected"> · {selectedCount} selected</span>}
            </span>

            {paginated && (
              <div className="grid-paging">
                <label className="grid-page-size">
                  Lines per page
                  <select value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))}>
                    {pageSizes.map((size) => (
                      <option key={size} value={size}>{size}</option>
                    ))}
                  </select>
                </label>
                <nav className="grid-pages" aria-label="Pages">
                  <button type="button" className="grid-page" aria-label="Previous page" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>
                    <CaretLeft size={14} weight="bold" aria-hidden="true" />
                  </button>
                  {pageList(currentPage, pages).map((item, index) =>
                    item === "…" ? (
                      <span key={`gap-${index}`} className="grid-page-gap">…</span>
                    ) : (
                      <button
                        key={item}
                        type="button"
                        className={`grid-page${item === currentPage ? " current" : ""}`}
                        aria-current={item === currentPage ? "page" : undefined}
                        aria-label={`Page ${item}`}
                        onClick={() => setPage(item)}
                      >
                        {item}
                      </button>
                    ),
                  )}
                  <button type="button" className="grid-page" aria-label="Next page" disabled={currentPage === pages} onClick={() => setPage(currentPage + 1)}>
                    <CaretRight size={14} weight="bold" aria-hidden="true" />
                  </button>
                </nav>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

export default DataGrid;
