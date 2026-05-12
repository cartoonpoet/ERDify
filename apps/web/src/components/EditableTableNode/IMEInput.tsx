import { useRef, useEffect } from "react";
import type { InputHTMLAttributes } from "react";

interface IMEInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "value" | "defaultValue"> {
  value: string;
  onChange: (value: string) => void;
}

export const IMEInput = ({ value, onChange, ...props }: IMEInputProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const composingRef = useRef(false);
  // Chrome fires an `input` event immediately after `compositionend` with the
  // same committed value — we track it here to skip that redundant call so
  // `applyCommand` isn't invoked twice for one composition.
  const pendingCompositionValueRef = useRef<string | null>(null);

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
      onCompositionStart={() => {
        composingRef.current = true;
      }}
      onCompositionEnd={(e) => {
        composingRef.current = false;
        pendingCompositionValueRef.current = e.currentTarget.value;
        onChange(e.currentTarget.value);
      }}
      onChange={(e) => {
        if (composingRef.current) return;

        const pending = pendingCompositionValueRef.current;
        if (pending !== null) {
          pendingCompositionValueRef.current = null;
          // If the value matches what compositionEnd already reported,
          // skip — this is Chrome's echo `input` event after compositionend.
          // If it differs (e.g. space was appended), fall through to sync.
          if (e.target.value === pending) return;
        }

        onChange(e.target.value);
      }}
    />
  );
};
