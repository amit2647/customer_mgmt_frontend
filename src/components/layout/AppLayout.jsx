import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";

function AppLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem("omnicore-sidebar-collapsed");
    return saved === "true";
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
            <button
              type="button"
              className="header-icon-button"
              aria-label="Notifications"
              title="Notifications"
            >
              ♢
            </button>

            <div className="header-divider" />

            <div className="user-menu">
              <div className="user-avatar">AM</div>

              <div className="user-info">
                <strong>Amit</strong>

                <span>Administrator</span>
              </div>

              <span className="user-chevron" aria-hidden="true">
                ⌄
              </span>
            </div>
          </div>
        </header>

        <main className="app-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AppLayout;
