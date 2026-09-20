import { useNavigate } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";

function SettingsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];

  function hasPermission(permission) {
    return permissions.includes(permission);
  }

  const settingsItems = [
    {
      id: "email-accounts",
      title: "Email Accounts",
      description:
        "Configure SMTP and IMAP accounts used for sending and receiving email.",
      icon: "@",
      path: "/settings/email-accounts",
      permission: "system.integrations",
    },
    {
      id: "appearance",
      title: "Appearance",
      description:
        "Customize the color palette and visual appearance of the OmniCore platform.",
      icon: "◐",
      path: "/settings/appearance",
    },
    {
      id: "email-templates",
      title: "Email Templates",
      description:
        "Create and manage reusable email templates for customer communication.",
      icon: "T",
      path: "/settings/email-templates",
      permission: "email.templates.read",
    },
    {
      id: "email-automations",
      title: "Email Automations",
      description:
        "Configure automated email workflows based on events and conditions.",
      icon: "A",
      path: "/settings/email-automations",
      permission: "email.automations.read",
    },
    {
      id: "users-roles",
      title: "Users & Roles",
      description:
        "Manage users, roles, permissions, and access to the platform.",
      icon: "U",
      path: "/settings/users",
      permission: "users.read",
    },
    {
      id: "organization",
      title: "Organization",
      description:
        "Manage organization information and organization-level configuration.",
      icon: "O",
      path: "/settings/organization",
      permission: "organization.read",
    },
  ];

  const visibleItems = settingsItems.filter((item) => {
    if (!item.permission) {
      return true;
    }

    return hasPermission(item.permission);
  });

  function handleSettingClick(item) {
    if (item.disabled || !item.path) {
      return;
    }

    navigate(item.path);
  }

  return (
    <main className="page settings-page">
      <div className="page-header">
        <div>
          <h1>Settings</h1>

          <p>Manage your OmniCore platform configuration and integrations.</p>
        </div>
      </div>

      <section className="page-section">
        <div className="settings-grid">
          {visibleItems.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`settings-card ${item.disabled ? "disabled" : ""}`}
              onClick={() => handleSettingClick(item)}
              disabled={item.disabled}
            >
              <div className="settings-card-icon">{item.icon}</div>

              <div className="settings-card-content">
                <div className="settings-card-title-row">
                  <h3>{item.title}</h3>

                  {item.disabled && (
                    <span className="settings-card-badge">Coming soon</span>
                  )}
                </div>

                <p>{item.description}</p>
              </div>

              {!item.disabled && (
                <span className="settings-card-arrow" aria-hidden="true">
                  →
                </span>
              )}
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}

export default SettingsPage;
