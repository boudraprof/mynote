"use client";

import * as React from "react";
import { createContext, useEffect, useState } from "react";
import * as z from "zod";
import { THEME_COLORS } from "@/utils/bgs-colors";

const themeModeSchema = z.enum(["light", "dark", "auto"]);
const resolvedThemeSchema = z.enum(["light", "dark"]);
const themeKey = "theme";

type ThemeMode = z.infer<typeof themeModeSchema>;
type ResolvedTheme = z.infer<typeof resolvedThemeSchema>;

const getStoredThemeMode = (): ThemeMode => {
  if (typeof window === "undefined") return "auto";
  try {
    return z.parse(themeModeSchema, localStorage.getItem(themeKey));
  } catch {
    return "auto";
  }
};

const setStoredThemeMode = (theme: ThemeMode) => {
  try {
    localStorage.setItem(themeKey, z.parse(themeModeSchema, theme));
  } catch {}
};

const getSystemTheme = (): ResolvedTheme => {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches? "dark" : "light";
};

const updateThemeClass = (themeMode: ThemeMode) => {
  const root = document.documentElement;
  root.classList.remove("light", "dark", "auto");
  const newTheme = themeMode === "auto"? getSystemTheme() : themeMode;
  root.classList.add(newTheme);
  if (themeMode === "auto") root.classList.add("auto");
  document.querySelector('meta[name="theme-color"]')?.setAttribute(
    "content", newTheme === "dark"? THEME_COLORS.dark : THEME_COLORS.light
  );
  root.style.colorScheme = newTheme;
  window.dispatchEvent(new CustomEvent("themechange", { detail: { theme: newTheme } }));
};

const getNextTheme = (current: ThemeMode): ThemeMode => {
  const themes: ThemeMode[] = getSystemTheme() === "dark"? ["auto", "light", "dark"] : ["auto", "dark", "light"];
  return themes[(themes.indexOf(current) + 1) % themes.length]!;
};

type ThemeContextProps = {
  themeMode: ThemeMode;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: ThemeMode) => void;
  toggleMode: () => void;
};

const ThemeContext = createContext<ThemeContextProps | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => getStoredThemeMode());
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() =>
    typeof window!== "undefined" && document.documentElement.classList.contains("dark")? "dark" : "light"
  );

  useEffect(() => {
    if (themeMode!== "auto") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => { updateThemeClass("auto"); setResolvedTheme(getSystemTheme()); };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [themeMode]);

  const setTheme = (newTheme: ThemeMode) => {
    setThemeMode(newTheme);
    setStoredThemeMode(newTheme);
    updateThemeClass(newTheme);
    setResolvedTheme(newTheme === "auto"? getSystemTheme() : newTheme);
  };

  return (
    <ThemeContext.Provider value={{ themeMode, resolvedTheme, setTheme, toggleMode: () => setTheme(getNextTheme(themeMode)) }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const ctx = React.useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
};

export function useHtmlClass(): string {
  if (typeof window === "undefined") return "";
  return document.documentElement.className;
}
