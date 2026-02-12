import React, { createContext, useContext } from "react";

type TabsCtx = { value: string; setValue: (v: string) => void };
const Ctx = createContext<TabsCtx | null>(null);

export function Tabs({
  value,
  onValueChange,
  className = "",
  children,
}: {
  value: string;
  onValueChange: (v: string) => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Ctx.Provider value={{ value, setValue: onValueChange }}>
      <div className={className}>{children}</div>
    </Ctx.Provider>
  );
}

export function TabsList({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return <div className={["rounded-2xl border border-border bg-background p-1", className].join(" ")}>{children}</div>;
}

export function TabsTrigger({ value, className = "", children }: { value: string; className?: string; children: React.ReactNode }) {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("TabsTrigger must be used within Tabs");
  const active = ctx.value === value;
  return (
    <button
      type="button"
      onClick={() => ctx.setValue(value)}
      className={[
        "w-full rounded-xl px-3 py-2 text-sm",
        active ? "bg-black text-white" : "text-muted-foreground hover:bg-muted",
        className,
      ].join(" ")}
    >
      {children}
    </button>
  );
}

export function TabsContent({ value, className = "", children }: { value: string; className?: string; children: React.ReactNode }) {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("TabsContent must be used within Tabs");
  if (ctx.value !== value) return null;
  return <div className={className}>{children}</div>;
}
