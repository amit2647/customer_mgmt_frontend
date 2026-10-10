/*
 * The shimmer a screen shows while its data loads, shaped like what will
 * arrive so nothing jumps when it does (styles/components/skeleton.css).
 *
 *   Skeleton                 one bar: width, height (px or any CSS length),
 *                            radius
 *   SkeletonText             `lines` bars, the last one shorter
 *   SkeletonRegion           what wraps a loading area: role="status",
 *                            aria-busy, and a visually hidden "Loading…" for
 *                            screen readers (the bars are aria-hidden)
 *   SkeletonRows             a table body's worth of rows, for DataGrid
 *   GridSkeleton             a table on its own, where the grid has not
 *                            been built yet
 *   CardSkeleton             a card of text, for a tab or a section
 *   SettingRowsSkeleton      a SettingRows card, for a Settings section
 *
 * Whole pages are in PageSkeleton.jsx.
 */

// Varied so a column of bars reads as text, not as a striped block.
const CELL_WIDTHS = ["72%", "48%", "60%", "40%", "54%", "66%"];
const TEXT_WIDTHS = ["100%", "92%", "96%"];

export function Skeleton({ width = "100%", height = 12, radius, className = "" }) {
  return (
    <span
      className={`skeleton${className ? ` ${className}` : ""}`}
      style={{ width, height, borderRadius: radius }}
      aria-hidden="true"
    />
  );
}

export function SkeletonText({ lines = 3, height = 12, className = "" }) {
  return (
    <div className={`skeleton-text${className ? ` ${className}` : ""}`} aria-hidden="true">
      {Array.from({ length: lines }, (_, index) => (
        <Skeleton key={index} height={height} width={index === lines - 1 && lines > 1 ? "58%" : TEXT_WIDTHS[index % TEXT_WIDTHS.length]} />
      ))}
    </div>
  );
}

export function SkeletonRegion({ as: Tag = "div", label = "Loading…", className = "", children, ...rest }) {
  return (
    <Tag className={`skeleton-region${className ? ` ${className}` : ""}`} role="status" aria-busy="true" {...rest}>
      <span className="skeleton-sr">{label}</span>
      {children}
    </Tag>
  );
}

/*
 * `columns` is a count or the grid's own column list (an `align: "right"`
 * column gets a short bar, as figures are). The first column has a second,
 * shorter line, as most first columns do.
 */
export function SkeletonRows({ columns, rows = 6 }) {
  const list = typeof columns === "number" ? Array.from({ length: columns }, () => ({})) : columns;

  return Array.from({ length: rows }, (_, row) => (
    <tr key={row} className="grid-skeleton-row" aria-hidden="true">
      {list.map((column, index) => (
        <td key={column.key ?? index} className={column.align === "right" ? "numeric" : undefined}>
          {column.check ? (
            <Skeleton width={14} height={14} radius={4} />
          ) : column.align === "right" ? (
            <Skeleton width={56} />
          ) : index === 0 ? (
            <SkeletonCellPair width={CELL_WIDTHS[row % CELL_WIDTHS.length]} />
          ) : (
            <Skeleton width={CELL_WIDTHS[(row + index) % CELL_WIDTHS.length]} />
          )}
        </td>
      ))}
    </tr>
  ));
}

function SkeletonCellPair({ width }) {
  return (
    <div className="skeleton-text" style={{ gap: 7 }}>
      <Skeleton width={width} height={12} />
      <Skeleton width="38%" height={9} />
    </div>
  );
}

export function GridSkeleton({ label, columns = 4, rows = 6, toolbar = false, embedded = false }) {
  return (
    <SkeletonRegion as="section" className={`data-grid${embedded ? " embedded" : ""}`} aria-label={label}>
      {toolbar && (
        <div className="grid-toolbar skeleton-grid-toolbar" aria-hidden="true">
          <Skeleton width={240} height={36} radius={10} />
        </div>
      )}
      <div className="grid-frame">
        <div className="grid-scroll">
          <table className="grid-table" aria-hidden="true">
            <thead>
              <tr>
                {Array.from({ length: columns }, (_, index) => (
                  <th key={index}><Skeleton width={index === 0 ? 72 : 52} height={9} /></th>
                ))}
              </tr>
            </thead>
            <tbody>
              <SkeletonRows columns={columns} rows={rows} />
            </tbody>
          </table>
        </div>
      </div>
    </SkeletonRegion>
  );
}

// `region={false}` inside a page skeleton, which already announces itself.
export function CardSkeleton({ label, lines = 3, fields = 0, className = "", region = true }) {
  const classes = `card skeleton-card${className ? ` ${className}` : ""}`;
  const body = (
    <>
      <Skeleton width={180} height={16} />
      {fields > 0 ? (
        <div className="skeleton-fields" aria-hidden="true">
          {Array.from({ length: fields }, (_, index) => (
            <div key={index} className="skeleton-field">
              <Skeleton width={84} height={9} />
              <Skeleton width={CELL_WIDTHS[index % CELL_WIDTHS.length]} height={13} />
            </div>
          ))}
        </div>
      ) : (
        <SkeletonText lines={lines} />
      )}
    </>
  );

  if (!region) return <section className={classes} aria-hidden="true">{body}</section>;

  return (
    <SkeletonRegion as="section" className={classes} aria-label={label}>
      {body}
    </SkeletonRegion>
  );
}

export function SettingRowsSkeleton({ label, rows = 4 }) {
  return (
    <SkeletonRegion as="section" className="setting-rows" aria-label={label}>
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="setting-row" aria-hidden="true">
          <div className="setting-row-main">
            <div className="setting-row-text skeleton-text">
              <Skeleton width={140} height={13} />
              <Skeleton width={CELL_WIDTHS[index % CELL_WIDTHS.length]} height={10} />
            </div>
            <div className="setting-row-action">
              <Skeleton width={120} height={13} />
            </div>
          </div>
        </div>
      ))}
    </SkeletonRegion>
  );
}

export default Skeleton;
