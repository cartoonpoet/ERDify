import { useRef, useEffect } from "react";
import type { InputHTMLAttributes } from "react";

interface IMEInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "value" | "defaultValue"> {
  value: string;
  onChange: (value: string) => void;
}

export const IMEInput = ({ value, onChange, ...props }: IMEInputProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Native DOM events bypass React's synthetic event system entirely.
  // React's onChange normalization can interfere with IME composition by
  // re-setting the DOM value mid-composition.
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;

    let composing = false;
    // Chrome fires one extra `input` event synchronously after `compositionend`.
    // `skipNextInput` absorbs it so we don't call onChange twice.
    let skipNextInput = false;

    const onCompositionStart = () => { composing = true; };
    const onCompositionEnd = () => {
      composing = false;
      skipNextInput = true;
      onChangeRef.current(el.value);
    };
    const onInput = () => {
      if (composing) return;
      if (skipNextInput) { skipNextInput = false; return; }
      onChangeRef.current(el.value);
    };

    el.addEventListener("compositionstart", onCompositionStart);
    el.addEventListener("compositionend", onCompositionEnd);
    el.addEventListener("input", onInput);
    return () => {
      el.removeEventListener("compositionstart", onCompositionStart);
      el.removeEventListener("compositionend", onCompositionEnd);
      el.removeEventListener("input", onInput);
    };
  }, []);

  // Sync externally-changed value (e.g. collaborator edit) only when
  // this input doesn't have focus — never interrupt an active edit session.
  useEffect(() => {
    const el = inputRef.current;
    if (!el || el === document.activeElement) return;
    if (el.value !== value) el.value = value;
  }, [value]);

  return <input {...props} ref={inputRef} defaultValue={value} />;
};
