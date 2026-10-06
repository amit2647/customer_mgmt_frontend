// Shared words and order for deadline states (COMP-02/05).
export const STATES = [
  { key: "overdue", label: "Overdue" },
  { key: "due_soon", label: "Due soon" },
  { key: "in_progress", label: "In progress" },
  { key: "upcoming", label: "Upcoming" },
  { key: "completed", label: "Completed" },
];

export const STATE_LABEL = Object.fromEntries(STATES.map((state) => [state.key, state.label]));

export const STATUSES = [
  { key: "pending", label: "Pending" },
  { key: "in_progress", label: "In progress" },
  { key: "filed", label: "Filed" },
  { key: "not_applicable", label: "N/A" },
];
