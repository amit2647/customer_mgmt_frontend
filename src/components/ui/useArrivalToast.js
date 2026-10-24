import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { toast } from "./feedback";

/*
 * A page reached with a message in the navigation's state — `saved` or
 * `notice` (went well) or `warning` (went partly wrong), as wizards send on
 * their way back — shows it as a toast once, then drops it from the history
 * entry so a reload does not show it again. Other state (a tab to open) stays.
 */
export default function useArrivalToast() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const { saved, notice, warning, ...rest } = location.state || {};
    if (!saved && !notice && !warning) return;

    if (saved) toast.success(saved);
    if (notice) toast.success(notice);
    if (warning) toast.error(warning);

    navigate(`${location.pathname}${location.search}`, { replace: true, state: Object.keys(rest).length ? rest : null });
    // Once per arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key]);
}
