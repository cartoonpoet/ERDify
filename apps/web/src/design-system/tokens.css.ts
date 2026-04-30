import { createGlobalTheme } from "@vanilla-extract/css";

export const vars = createGlobalTheme(":root", {
  color: {
    primary: "#0064E0",
    primaryHover: "#0143B5",
    primaryPressed: "#004BB9",
    surface: "#FFFFFF",
    surfaceSecondary: "#F1F4F7",
    surfaceTertiary: "#F8F9FB",
    textPrimary: "#1C2B33",
    textSecondary: "#5D6C7B",
    textDisabled: "#BCC0C4",
    border: "#DEE3E9",
    borderStrong: "#CBD2D9",
    success: "#31A24C",
    error: "#E41E3F",
    focusRing: "rgba(0, 100, 224, 0.12)",
    selectedBg: "#EEF4FF",
  },
  font: {
    family:
      "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  radius: {
    sm: "6px",
    md: "8px",
    lg: "14px",
    xl: "20px",
    pill: "100px",
    org: "10px",
  },
  shadow: {
    sm: "0 1px 3px rgba(0,0,0,0.08)",
    md: "0 4px 12px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.04)",
    lg: "0 16px 48px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)",
    xl: "0 24px 64px rgba(0,0,0,0.14), 0 4px 12px rgba(0,0,0,0.08)",
  },
  space: {
    "1": "4px",
    "2": "8px",
    "3": "12px",
    "4": "16px",
    "5": "20px",
    "6": "24px",
    "7": "32px",
    "8": "40px",
    "9": "48px",
  },
});
