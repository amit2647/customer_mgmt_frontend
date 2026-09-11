import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";

function AppLayout() {
  return (
    <div className="app-shell">
      <Sidebar />

      <div className="app-main">
        <header className="global-header">
          <div className="global-header-left">
            <div className="mobile-brand">
              <div className="brand-mark">OC</div>

              <div className="mobile-brand-copy">
                <strong>OmniCore</strong>
                <span>Customer Platform</span>
              </div>
            </div>

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
