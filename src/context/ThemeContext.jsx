import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext(null);

const STORAGE_KEY = "omnicore-theme";
const DEFAULT_THEME = "lemon";

const VALID_THEMES = ["lemon", "ocean", "emerald", "violet"];

function getStoredTheme() {
  const storedTheme = localStorage.getItem(STORAGE_KEY);

  if (VALID_THEMES.includes(storedTheme)) {
    return storedTheme;
  }

  return DEFAULT_THEME;
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(getStoredTheme);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  function changeTheme(nextTheme) {
    if (!VALID_THEMES.includes(nextTheme)) {
      console.warn(`Invalid OmniCore theme: ${nextTheme}`);
      return;
    }

    setTheme(nextTheme);
  }

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme: changeTheme,
        themes: VALID_THEMES,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used inside ThemeProvider");
  }

  return context;
}
