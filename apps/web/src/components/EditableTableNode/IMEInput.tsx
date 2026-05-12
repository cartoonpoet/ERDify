import { useRef, useEffect } from "react";
import type { InputHTMLAttributes } from "react";

interface IMEInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "value" | "defaultValue"> {
  value: string;
  onChange: (value: string) => void;
}

export const IMEInput = ({ value, onChange, ...props }: IMEInputProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const onChangeRef = useRef(onChange);
  const composingRef = useRef(false);
  const focusedRef = useRef(false);
  // Freeze defaultValue at mount — React's reconciler writes node.defaultValue
  // whenever this prop changes, and any DOM attribute write during Korean IME
  // composition on macOS cancels the in-progress syllable.
  const initialValue = useRef(value);

  onChangeRef.current = onChange;

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;

    const onCompositionStart = () => { composingRef.current = true; };
    // Don't emit onChange here: macOS Korean IME fires compositionend between
    // every syllable, so calling onChange mid-word triggers a React re-render
    // that can disturb the IME composition range and eat the next character.
    // Instead we flush on the echo `input` event (if it fires before the next
    // compositionstart) and always on blur.
    const onCompositionEnd = () => { composingRef.current = false; };
    const onInput = () => {
      if (composingRef.current) return;
      onChangeRef.current(el.value);
    };
    const onFocus = () => { focusedRef.current = true; };
    const onBlur = () => {
      focusedRef.current = false;
      composingRef.current = false;
      onChangeRef.current(el.value);
    };

    el.addEventListener("compositionstart", onCompositionStart);
    el.addEventListener("compositionend", onCompositionEnd);
    el.addEventListener("input", onInput);
    el.addEventListener("focus", onFocus);
    el.addEventListener("blur", onBlur);
    return () => {
      el.removeEventListener("compositionstart", onCompositionStart);
      el.removeEventListener("compositionend", onCompositionEnd);
      el.removeEventListener("input", onInput);
      el.removeEventListener("focus", onFocus);
      el.removeEventListener("blur", onBlur);
    };
  }, []);

  // Sync collaborator edits to DOM only when this input is neither focused
  // nor composing — never overwrite what the user is actively typing.
  useEffect(() => {
    const el = inputRef.current;
    if (!el || composingRef.current || focusedRef.current) return;
    if (el.value !== value) el.value = value;
  }, [value]);

  return <input {...props} ref={inputRef} defaultValue={initialValue.current} />;
};
