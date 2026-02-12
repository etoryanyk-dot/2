import React, { createContext, useContext } from "react";

type CtxType = { open: boolean; setOpen: (v: boolean) => void };
const Ctx = createContext<CtxType | null>(null);

export function Dialog({ open, onOpenChange, children }: { open: boolean; onOpenChange: (v: boolean) => void; children: React.ReactNode }) {
  return <Ctx.Provider value={{ open, setOpen: onOpenChange }}>{children}</Ctx.Provider>;
}

export function DialogTrigger({ asChild, children }: { asChild?: boolean; children: React.ReactElement }) {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("DialogTrigger must be used within Dialog");
  const child = React.Children.only(children);
  const props = {
    onClick: (e: any) => {
      child.props.onClick?.(e);
      ctx.setOpen(true);
    },
  };
  return asChild ? React.cloneElement(child, props) : <button {...props}>{children}</button>;
}

export function DialogContent({ className = "", children }: { className?: string; children: React.ReactNode }) {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("DialogContent must be used within Dialog");
  if (!ctx.open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button className="absolute inset-0 bg-black/40" onClick={() => ctx.setOpen(false)} aria-label="Close dialog overlay" />
      <div className={["relative z-10 w-full max-w-xl rounded-2xl border border-border bg-background p-4 shadow-lg", className].join(" ")}>
        {children}
      </div>
    </div>
  );
}

export function DialogHeader({ children }: { children: React.ReactNode }) {
  return <div className="mb-3">{children}</div>;
}

export function DialogTitle({ children }: { children: React.ReactNode }) {
  return <div className="text-lg font-semibold">{children}</div>;
}
