/*
 * Settings is one page with tabs. Each tab is a group of sections; each
 * section is its own route (so links and the back button keep working) and
 * carries the same permission as that route in App.jsx. The tabs only hide
 * what someone cannot open — the routes and the API are the authority.
 */

export const SETTINGS_TABS = [
  {
    id: "profile",
    label: "Profile",
    sections: [{ id: "profile", label: "My profile", path: "/settings/profile" }],
  },
  {
    id: "appearance",
    label: "Appearance",
    sections: [{ id: "appearance", label: "Appearance", path: "/settings/appearance" }],
  },
  {
    id: "organization",
    label: "Organization",
    sections: [
      { id: "organization", label: "Organization", path: "/settings/organization", permission: "organization.read" },
      { id: "firm", label: "Firm", path: "/settings/firm", permission: "organization.read", needsBundle: true },
    ],
  },
  {
    id: "team",
    label: "Team",
    sections: [
      { id: "users", label: "Users & roles", path: "/settings/users", permission: "users.read" },
      { id: "access", label: "Just-in-time access", path: "/settings/access", permission: "users.read" },
    ],
  },
  {
    id: "email",
    label: "Email",
    sections: [
      { id: "email-accounts", label: "Accounts", path: "/settings/email-accounts", permission: "system.integrations" },
      { id: "email-templates", label: "Templates", path: "/settings/email-templates", permission: "email.templates.read" },
      { id: "email-automations", label: "Automations", path: "/settings/email-automations", permission: "email.automations.read" },
    ],
  },
  // The profession bundle: install it, take its updates, keep or accept the
  // firm's customized items. Deadline rules live with their services now,
  // and letters under Documents.
  {
    id: "update",
    label: "Update",
    sections: [{ id: "bundle", label: "Profession bundle", path: "/settings/bundle", permission: "bundles.manage" }],
  },
];

function canSee(section, permissions, bundle) {
  if (section.needsBundle && !bundle) return false;
  if (section.needsCapability && !(bundle?.capabilities || []).includes(section.needsCapability)) return false;
  return !section.permission || permissions.includes(section.permission);
}

// The tabs this person can open, each with only the sections they can open.
export function visibleTabs(permissions, bundle) {
  return SETTINGS_TABS.map((tab) => ({ ...tab, sections: tab.sections.filter((section) => canSee(section, permissions, bundle)) })).filter(
    (tab) => tab.sections.length > 0,
  );
}
