export const theme = {
  colors: {
    background: "#0F1115",
    surface: "#171A21",
    elevated: "#1C212B",

    primary: "#4ADE80",
    primaryPressed: "#22C55E",

    textPrimary: "#FFFFFF",
    textSecondary: "#9CA3AF",
    textTertiary: "#6B7280",

    danger: "#F87171",
    divider: "#20242E",
    outline: "#2A2E38",
  },

  spacing: {
    xs: 8,
    sm: 16,
    md: 24,
    lg: 32,
    xl: 48,
  },

  radius: {
    sm: 12,
    md: 16,
    lg: 20,
    xl: 28,
  },

  typography: {
    h1: { fontSize: 56, fontWeight: "700" as const },
    h2: { fontSize: 28, fontWeight: "600" as const },
    h3: { fontSize: 20, fontWeight: "600" as const },
    body: { fontSize: 16, fontWeight: "400" as const },
    small: { fontSize: 13, fontWeight: "400" as const },
  },
};
