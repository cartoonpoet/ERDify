import { useState, useRef, useEffect } from "react";
import type { InputHTMLAttributes, ChangeEvent, CompositionEvent } from "react";

interface IMEInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  value: string;
  onChange: (value: string) => void;
}

export const IMEInput = ({ value, onChange, ...props }: IMEInputProps) => {
  const [local, setLocal] = useState(value);
  const composing = useRef(false);

  useEffect(() => {
    if (!composing.current) setLocal(value);
  }, [value]);

  return (
    <input
      {...props}
      value={local}
      onChange={(e: ChangeEvent<HTMLInputElement>) => {
        setLocal(e.target.value);
        if (!composing.current) onChange(e.target.value);
      }}
      onCompositionStart={() => {
        composing.current = true;
      }}
      onCompositionEnd={(e: CompositionEvent<HTMLInputElement>) => {
        composing.current = false;
        onChange(e.currentTarget.value);
      }}
    />
  );
};
