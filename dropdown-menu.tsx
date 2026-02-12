import React, { createContext, useContext, useState } from "react";

type CtxType = { open: boolean; setOpen: (v: boolean) => void };
const Ctx = createContext<CtxType | null>(null);

export function DropdownMenu({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return <Ctx.Provider value={{ open, setOpen }}><div className="relative inline-block">{children}</div></Ctx.Provider>;
}

export function DropdownMenuTrigger({ asChild, children }: { asChild?: boolean; children: React.ReactElement }) {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("DropdownMenuTrigger must be used within DropdownMenu");
  const child = React.Children.only(children);
  const props = {
    onClick: (e: any) => {
      child.props.onClick?.(e);
      ctx.setOpen(!ctx.open);
    },
  };
  return asChild ? React.cloneElement(child, props) : <button {...props}>{children}</button>;
}

export function DropdownMenuContent({ align, className = "", children }: { align?: "start" | "end"; className?: string; children: React.ReactNode }) {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("DropdownMenuContent must be used within DropdownMenu");
  if (!ctx.open) return null;
  const side = align === "end" ? "right-0" : "left-0";
  return (
    <div className={["absolute z-50 mt-2 min-w-[180px] rounded-xl border border-border bg-background p-1 shadow", side, className].join(" ")}>
      {children}
    </div>
  );
}

export function DropdownMenuItem({ onClick, children }: { onClick?: () => void; children: React.ReactNode }) {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("DropdownMenuItem must be used within DropdownMenu");
  return (
    <button
      type="button"
      className="flex w-full items-center rounded-lg px-3 py-2 text-sm hover:bg-muted"
      onClick={() => {
        onClick?.();
        ctx.setOpen(false);
      }}
    >
      {children}
    </button>
  );
}
