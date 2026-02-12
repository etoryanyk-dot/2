import React from "react";

export function Input({ className = "", ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={[
        "h-10 w-full rounded-md border border-border bg-background px-3 text-sm",
        "focus:outline-none focus:ring-2 focus:ring-black/10",
        className,
      ].join(" ")}
    />
  );
}
