import { useEffect, useMemo, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";

import Sidebar from "./Sidebar";
import AssistantPanel from "../assistant/AssistantPanel";
import { useAuth } from "../../context/AuthContext";

function AppLayout() {
  const navigate = useNavigate();

  const { user, logout } = useAuth();

  const [assistantOpen, setAssistantOpen] = useState(false);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem("omnicore-sidebar-collapsed");

    return saved ? saved === "true" : false;
  });

  useEffect(() => {
    localStorage.setItem(
      "omnicore-sidebar-collapsed",
      String(sidebarCollapsed),
    );
  }, [sidebarCollapsed]);

  function toggleSidebar() {
    setSidebarCollapsed((current) => !current);
  }

  function handleLogout() {
    logout();

    navigate("/login", {
      replace: true,
    });
  }

  const displayName =
    user?.username || user?.full_name || user?.name || user?.email || "User";

  const role = user?.role || user?.role_name || "User";

  const initials = useMemo(() => {
    const source =
      user?.username || user?.full_name || user?.name || user?.email || "U";

    const parts = source.trim().split(/\s+/).filter(Boolean);

    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }

    return source.slice(0, 2).toUpperCase();
  }, [user]);

  return (
    <div
      className={`app-shell ${sidebarCollapsed ? "sidebar-is-collapsed" : ""}`}
    >
      <Sidebar collapsed={sidebarCollapsed} onToggle={toggleSidebar} />

      <div className="app-main">
        <header className="global-header">
          <div className="global-header-left">
            {/* =====================================================
                MOBILE BRAND
                ===================================================== */}

            <div className="mobile-brand">
              <div className="brand-mark">OC</div>

              <div className="mobile-brand-copy">
                <strong>OmniCore</strong>

                <span>Customer Platform</span>
              </div>
            </div>

            {/* =====================================================
                GLOBAL SEARCH
                ===================================================== */}

            <div className="global-search">
              <span className="global-search-icon" aria-hidden="true">
                ⌕
              </span>

              <input
                type="search"
                placeholder="Search leads, customers..."
                aria-label="Search"
              />

              <span className="search-shortcut">
                <kbd>⌘</kbd>
                <span>K</span>
              </span>
            </div>
          </div>

          {/* =======================================================
              HEADER RIGHT
              ======================================================= */}

          <div className="global-header-right">
            {/* What it can do is decided server-side from the caller's
                permissions, so the button itself needs no gate. */}
            <button
              type="button"
              className={`assistant-button ${assistantOpen ? "active" : ""}`}
              onClick={() => setAssistantOpen((current) => !current)}
              title="Ask the assistant"
              aria-expanded={assistantOpen}
            >
              <span className="assistant-button-spark" aria-hidden="true">
                ✦
              </span>

              <span className="assistant-button-label">Assistant</span>
            </button>

            <div className="header-divider" />

            <div className="user-menu" title="Account">
              <div className="user-avatar">{initials}</div>

              <div className="user-info">
                <strong>{displayName}</strong>

                <span>{role}</span>
              </div>

              <button
                type="button"
                className="user-logout-button"
                onClick={handleLogout}
                title="Sign out"
              >
                Sign out
              </button>
            </div>
          </div>
        </header>

        <main className="app-content">
          <Outlet />
        </main>

        <AssistantPanel
          open={assistantOpen}
          onClose={() => setAssistantOpen(false)}
        />
      </div>
    </div>
  );
}

export default AppLayout;
