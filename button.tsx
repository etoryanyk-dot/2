import React from "react";

type Variant = "default" | "outline" | "destructive" | "secondary";
type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
};

const styles: Record<Variant, string> = {
  default:
    "bg-black text-white hover:opacity-90",
  outline:
    "border border-border bg-background hover:bg-muted",
  destructive:
    "bg-red-600 text-white hover:bg-red-700",
  secondary:
    "bg-muted text-foreground hover:bg-muted/80",
};

export function Button({ className = "", variant = "default", ...props }: Props) {
  return (
    <button
      {...props}
      className={[
        "inline-flex items-center justify-center gap-1 rounded-xl px-3 py-2 text-sm font-medium transition",
        "disabled:opacity-50 disabled:pointer-events-none",
        styles[variant],
        className,
      ].join(" ")}
    />
  );
}
