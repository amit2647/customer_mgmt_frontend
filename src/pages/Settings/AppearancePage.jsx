import { useNavigate } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";

const themeOptions = [
  {
    id: "lemon",
    name: "Lemon",
    description: "The default OmniCore light palette.",
    accent: "#FFFF66",
    accentStrong: "#FFE566",
    soft: "#FFFFE6",
    mode: "Light",
  },
  {
    id: "ocean",
    name: "Ocean",
    description: "A clean blue light palette.",
    accent: "#71b1ff",
    accentStrong: "#93C5FD",
    soft: "#EFF6FF",
    mode: "Light",
  },
  {
    id: "emerald",
    name: "Emerald",
    description: "A fresh green operational palette.",
    accent: "#6EE7B7",
    accentStrong: "#A7F3D0",
    soft: "#ECFDF5",
    mode: "Light",
  },
  {
    id: "violet",
    name: "Violet",
    description: "A refined purple creative palette.",
    accent: "#C4B5FD",
    accentStrong: "#DDD6FE",
    soft: "#F5F3FF",
    mode: "Light",
  },
];

function AppearancePage() {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();

  const currentTheme =
    themeOptions.find((option) => option.id === theme) || themeOptions[0];

  function handleBackToSettings() {
    navigate("/settings");
  }

  function handleThemeChange(themeId) {
    setTheme(themeId);
  }

  return (
    <main className="page appearance-page">
      <div className="workflow-breadcrumb">
        <button type="button" onClick={handleBackToSettings}>
          ← Back to Settings
        </button>

        <div className="workflow-context">
          <span>SETTINGS</span>
          <strong>Appearance</strong>
        </div>
      </div>

      <header className="page-header">
        <div>
          <h1>Appearance</h1>
          <p>Customize the color palette used across the OmniCore platform.</p>
        </div>
      </header>

      <section className="appearance-section">
        <div className="appearance-section-header">
          <div>
            <span className="appearance-eyebrow">COLOR PALETTE</span>

            <h2>Choose a palette</h2>

            <p>
              Your selection is saved automatically and remains active after
              refreshing the application.
            </p>
          </div>

          <div className="appearance-current">
            <span>Current</span>
            <strong>{currentTheme.name}</strong>
          </div>
        </div>

        <div className="theme-grid">
          {themeOptions.map((option) => {
            const selected = theme === option.id;

            return (
              <button
                key={option.id}
                type="button"
                className={`theme-card${selected ? " selected" : ""}`}
                onClick={() => handleThemeChange(option.id)}
                aria-pressed={selected}
                aria-label={`Select ${option.name} theme`}
              >
                <div className="theme-preview">
                  <div
                    className="theme-preview-sidebar"
                    style={{
                      background: option.accent,
                    }}
                  >
                    <span />
                    <span />
                    <span />
                    <span />
                  </div>

                  <div className="theme-preview-main">
                    <div className="theme-preview-header">
                      <span />
                      <span />
                    </div>

                    <div className="theme-preview-cards">
                      <span
                        style={{
                          background: option.accentStrong,
                        }}
                      />

                      <span
                        style={{
                          background: option.soft,
                        }}
                      />

                      <span
                        style={{
                          background: option.soft,
                        }}
                      />
                    </div>

                    <div className="theme-preview-lines">
                      <span />
                      <span />
                      <span />
                    </div>
                  </div>
                </div>

                <div className="theme-card-content">
                  <div className="theme-card-title">
                    <span>{option.name}</span>

                    <div className="theme-card-meta">
                      <small>{option.mode}</small>

                      {option.id === "lemon" && (
                        <small className="theme-default-badge">Default</small>
                      )}
                    </div>
                  </div>

                  <p>{option.description}</p>
                </div>

                <span className="theme-selection" aria-hidden="true">
                  {selected ? "✓" : ""}
                </span>
              </button>
            );
          })}
        </div>
      </section>
    </main>
  );
}

export default AppearancePage;
