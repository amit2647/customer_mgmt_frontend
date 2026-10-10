import { ArrowRight } from "@phosphor-icons/react";
import { Link } from "react-router-dom";

import { Skeleton } from "./Skeleton";

/*
 * The Dashboard's figure card: label and icon, a big value, a hint and a
 * link label. It is a link (`to`), a filter button (`onClick`, with
 * `active` outlining the applied one), or a plain figure. Lay cards out in a
 * <section className="dashboard-stats …">; the first one is the lemon one.
 * `loading` shimmers the value (and the hint) until the figure arrives.
 */
function StatCard({ label, icon, value, hint, linkLabel, to, onClick, active, loading = false, className = "" }) {
  const body = (
    <>
      <div className="dashboard-stat-top">
        <span className="dashboard-stat-label">{label}</span>
        {icon && <span className="dashboard-stat-icon" aria-hidden="true">{icon}</span>}
      </div>
      <div className="dashboard-stat-value">
        {loading ? <><Skeleton width={64} height="0.9em" radius={8} /><span className="skeleton-sr">Loading…</span></> : value}
      </div>
      <div className="dashboard-stat-footer">
        <span>{loading && hint ? <Skeleton width={96} height={10} /> : hint}</span>
        {linkLabel && (
          <span className="dashboard-stat-link">
            {linkLabel}
            <ArrowRight size={13} weight="bold" />
          </span>
        )}
      </div>
    </>
  );

  const classes = `dashboard-stat-card${className ? ` ${className}` : ""}`;

  if (to) return <Link to={to} className={classes}>{body}</Link>;

  if (onClick) {
    return (
      <button type="button" className={`${classes} stat-button${active ? " active" : ""}`} aria-pressed={Boolean(active)} onClick={onClick}>
        {body}
      </button>
    );
  }

  return <div className={classes}>{body}</div>;
}

export default StatCard;
