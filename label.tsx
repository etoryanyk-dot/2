import React from "react";

export function Label({ className = "", ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label {...props} className={["text-sm font-medium", className].join(" ")} />;
}
