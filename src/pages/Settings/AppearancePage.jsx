import { Palette } from "@phosphor-icons/react";

import { useTheme } from "../../context/ThemeContext";
import { SettingRow, SettingRows } from "../../components/ui/SettingRow";

const themeOptions = [
  {
    id: "lemon",
    name: "Lemon",
    description: "The signature OmniCore yellow palette.",
    accent: "#FFFF66",
    accentStrong: "#FFE566",
    soft: "#FFFFE6",
    surface: "#FFFFFF",
    mode: "Light",
  },

  {
    id: "cobalt",
    name: "Sky",
    description: "A bright and futuristic cyan palette.",
    accent: "#75D7FF",
    accentStrong: "#43C5F5",
    soft: "#EFFBFF",
    surface: "#FFFFFF",
    mode: "Light",
  },

  {
    id: "mint",
    name: "Mint",
    description: "A fresh green accent on a deep neutral.",
    accent: "#72E6B5",
    accentStrong: "#42D99A",
    soft: "#17241F",
    surface: "#191F1B",
    mode: "Dark",
  },

  {
    id: "coral",
    name: "Coral",
    description: "A warm coral accent on a deep neutral.",
    accent: "#FF9B8A",
    accentStrong: "#FF735F",
    soft: "#2A1A17",
    surface: "#1E1917",
    mode: "Dark",
  },
];

function AppearancePage() {
  const { theme, setTheme } = useTheme();

  function handleThemeChange(themeId) {
    setTheme(themeId);
  }

  return (
    <div className="settings-panel settings-sub-page appearance-page">
      <div className="page-header settings-panel-header">
        <div>
          <h2>Appearance</h2>
          <p>How OmniCore looks for you. Saved in this browser as soon as you choose.</p>
        </div>
      </div>

      <SettingRows label="Appearance">
        <SettingRow
          icon={<Palette size={16} />}
          title="Colour palette"
          description="Two light and two dark palettes; the assistant and every screen follow it"
          action={
            <select className="setting-select" aria-label="Colour palette" value={theme} onChange={(event) => handleThemeChange(event.target.value)}>
              {themeOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name} · {option.mode}
                </option>
              ))}
            </select>
          }
        >
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

                  <div
                    className="theme-preview-main"
                    style={{
                      background: option.surface,
                    }}
                  >
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
        </SettingRow>
      </SettingRows>
    </div>
  );
}

export default AppearancePage;
