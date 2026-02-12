import React from "react";

export function Card({ className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={["border border-border bg-background shadow-sm", className].join(" ")} />;
}

export function CardHeader({ className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={["p-4", className].join(" ")} />;
}

export function CardTitle({ className = "", ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 {...props} className={["font-semibold", className].join(" ")} />;
}

export function CardContent({ className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={["p-4 pt-0", className].join(" ")} />;
}
