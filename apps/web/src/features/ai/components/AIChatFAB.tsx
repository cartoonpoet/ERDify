interface AIChatFABProps {
  onClick: () => void;
}

export const AIChatFAB = ({ onClick }: AIChatFABProps) => (
  <button
    type="button"
    onClick={onClick}
    title="AI 어시스턴트"
    style={{
      position: "fixed",
      bottom: 24,
      right: 24,
      width: 52,
      height: 52,
      borderRadius: "50%",
      background: "#2563eb",
      color: "#fff",
      border: "none",
      cursor: "pointer",
      fontSize: 22,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      boxShadow: "0 4px 16px rgba(37,99,235,0.4)",
      zIndex: 1000,
    }}
  >
    ✦
  </button>
);
