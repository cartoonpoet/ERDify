import type { ButtonHTMLAttributes } from "react";
import { buttonRecipe } from "./button.css";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
}

export const Button = ({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: ButtonProps) => (
  <button
    className={[buttonRecipe({ variant, size }), className].filter(Boolean).join(" ")}
    {...props}
  >
    {children}
  </button>
);
