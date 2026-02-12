import React from "react";

type Variant = "default" | "secondary" | "destructive" | "outline";
type Props = React.HTMLAttributes<HTMLSpanElement> & { variant?: Variant };

const styles: Record<Variant, string> = {
  default: "bg-black text-white",
  secondary: "bg-muted text-foreground",
  destructive: "bg-red-600 text-white",
  outline: "border border-border text-foreground",
};

export function Badge({ className = "", variant = "secondary", ...props }: Props) {
  return (
    <span
      {...props}
      className={[
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs",
        styles[variant],
        className,
      ].join(" ")}
    />
  );
}
