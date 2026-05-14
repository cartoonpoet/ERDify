import type { HTMLAttributes } from "react";
import { card, cardHoverable } from "./card.css";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
}

export const Card = ({ hoverable = false, className, children, ...props }: CardProps) => (
  <div
    className={[card, hoverable ? cardHoverable : undefined, className].filter(Boolean).join(" ")}
    {...props}
  >
    {children}
  </div>
);
