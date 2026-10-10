import { CardSkeleton, Skeleton, SkeletonRegion, SkeletonText } from "./Skeleton";

/*
 * A whole page while it loads, built from Skeleton's parts. Each takes the
 * page's own wrapper (`as`, `className`) so the breadcrumb, header and cards
 * pick up that page's spacing, and the real page lands where the shimmer was.
 *
 *   DetailPageSkeleton       one record: breadcrumb, title card, tabs, cards
 *   FormPageSkeleton         an add/edit page: breadcrumb, header, optional
 *                            step bar, a card of fields
 */

function BreadcrumbSkeleton() {
  return (
    <div className="workflow-breadcrumb skeleton-breadcrumb" aria-hidden="true">
      <Skeleton width={132} height={12} />
      <Skeleton width={150} height={12} />
    </div>
  );
}

function HeaderSkeleton({ actions = 0 }) {
  return (
    <header className="page-header skeleton-page-header" aria-hidden="true">
      <div className="skeleton-page-copy">
        <Skeleton width={220} height={30} radius={8} />
        <Skeleton width={360} height={12} />
      </div>
      {actions > 0 && (
        <div className="skeleton-page-actions">
          {Array.from({ length: actions }, (_, index) => <Skeleton key={index} width={104} height={38} radius={9} />)}
        </div>
      )}
    </header>
  );
}

export function DetailPageSkeleton({ as = "main", className = "page record-detail-page", label, tabs = 4, cards = 2 }) {
  return (
    <SkeletonRegion as={as} className={className} label={label}>
      <BreadcrumbSkeleton />

      <section className="card skeleton-hero" aria-hidden="true">
        <Skeleton width={260} height={28} radius={8} />
        <div className="skeleton-page-actions">
          <Skeleton width={120} height={11} />
          <Skeleton width={140} height={11} />
          <Skeleton width={110} height={11} />
        </div>
        <SkeletonText lines={1} height={22} />
      </section>

      {tabs > 0 && (
        <div className="skeleton-tabs" aria-hidden="true">
          {Array.from({ length: tabs }, (_, index) => <Skeleton key={index} width={index === 0 ? 92 : 104} height={34} radius={999} />)}
        </div>
      )}

      {Array.from({ length: cards }, (_, index) => (
        <CardSkeleton key={index} fields={index === 0 ? 6 : 0} lines={3} region={false} />
      ))}
    </SkeletonRegion>
  );
}

export function FormPageSkeleton({ as = "main", className = "page", label, steps = 0, fields = 6, actions = 0 }) {
  return (
    <SkeletonRegion as={as} className={className} label={label}>
      <BreadcrumbSkeleton />
      <HeaderSkeleton actions={actions} />

      {steps > 0 && (
        <div className="skeleton-tabs" aria-hidden="true">
          {Array.from({ length: steps }, (_, index) => <Skeleton key={index} width={`${100 / steps}%`} height={40} radius={10} />)}
        </div>
      )}

      <CardSkeleton fields={fields} region={false} />
    </SkeletonRegion>
  );
}
