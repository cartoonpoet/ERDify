import type { InputHTMLAttributes } from "react";
import { wrapper, label as labelStyle, inputBase, inputError, errorText } from "./input.css";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = ({ label, error, className, id, ...props }: InputProps) => (
  <div className={wrapper}>
    {label && <label htmlFor={id} className={labelStyle}>{label}</label>}
    <input
      id={id}
      className={[inputBase, error ? inputError : undefined, className].filter(Boolean).join(" ")}
      {...props}
    />
    {error && <span className={errorText} role="alert">{error}</span>}
  </div>
);
