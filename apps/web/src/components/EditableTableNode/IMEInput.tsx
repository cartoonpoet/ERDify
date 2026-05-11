import { useRef, useEffect } from "react";
import type { InputHTMLAttributes } from "react";

interface IMEInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "value" | "defaultValue"> {
  value: string;
  onChange: (value: string) => void;
}

export const IMEInput = ({ value, onChange, ...props }: IMEInputProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const composingRef = useRef(false);

  useEffect(() => {
    if (!composingRef.current && inputRef.current && inputRef.current.value !== value) {
      inputRef.current.value = value;
    }
  }, [value]);

  return (
    <input
      {...props}
      ref={inputRef}
      defaultValue={value}
      onChange={(e) => {
        if (!composingRef.current) onChange(e.target.value);
      }}
      onCompositionStart={() => {
        composingRef.current = true;
      }}
      onCompositionEnd={(e) => {
        composingRef.current = false;
        onChange(e.currentTarget.value);
      }}
    />
  );
};
