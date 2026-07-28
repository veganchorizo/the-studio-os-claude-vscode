import { forwardRef } from "react";
import type { ButtonHTMLAttributes, HTMLAttributes, InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

/** Minimal shadcn/ui-style primitives, styled for the dark console theme. */

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
const buttonVariants: Record<ButtonVariant, string> = {
  primary: "bg-accent text-base-950 hover:bg-accent-soft font-medium",
  secondary: "bg-base-700 text-slate-100 hover:bg-base-600",
  ghost: "bg-transparent text-slate-300 hover:bg-base-800",
  danger: "bg-signal-red/90 text-white hover:bg-signal-red",
};

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }
>(({ className, variant = "secondary", ...props }, ref) => (
  <button
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50 disabled:cursor-not-allowed",
      buttonVariants[variant],
      className,
    )}
    {...props}
  />
));
Button.displayName = "Button";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "w-full rounded-md border border-base-600 bg-base-900 px-3 py-1.5 text-sm text-slate-100",
        "placeholder:text-slate-500 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "w-full rounded-md border border-base-600 bg-base-900 px-3 py-1.5 text-sm text-slate-100",
        "placeholder:text-slate-500 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent",
        className,
      )}
      {...props}
    />
  ),
);
Textarea.displayName = "Textarea";

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        "rounded-md border border-base-600 bg-base-900 px-2 py-1.5 text-sm text-slate-100 focus:border-accent focus:outline-none",
        className,
      )}
      {...props}
    />
  ),
);
Select.displayName = "Select";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-lg border border-base-700 bg-base-900 p-4 shadow-sm", className)} {...props} />;
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400", className)} {...props} />;
}

const badgeTones: Record<string, string> = {
  green: "bg-signal-green/15 text-signal-green border-signal-green/30",
  red: "bg-signal-red/15 text-signal-red border-signal-red/30",
  blue: "bg-signal-blue/15 text-signal-blue border-signal-blue/30",
  amber: "bg-accent/15 text-accent border-accent/30",
  gray: "bg-base-700 text-slate-300 border-base-600",
};

export function Badge({ tone = "gray", children }: { tone?: keyof typeof badgeTones; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium", badgeTones[tone])}>
      {children}
    </span>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <div
      className={cn("h-4 w-4 animate-spin rounded-full border-2 border-base-600 border-t-accent", className)}
      role="status"
      aria-label="loading"
    />
  );
}
