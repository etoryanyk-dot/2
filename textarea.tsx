import React from "react";

export function Textarea({ className = "", ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={[
        "min-h-[96px] w-full rounded-md border border-border bg-background px-3 py-2 text-sm",
        "focus:outline-none focus:ring-2 focus:ring-black/10",
        className,
      ].join(" ")}
    />
  );
}
