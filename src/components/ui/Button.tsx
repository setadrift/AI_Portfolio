import { type ButtonHTMLAttributes } from "react";
import Link from "next/link";

type Variant = "primary" | "secondary";

type BaseProps = {
  variant?: Variant;
  children: React.ReactNode;
};

type AsLink = BaseProps & {
  href: string;
  onClick?: () => void;
};

type AsButton = BaseProps &
  ButtonHTMLAttributes<HTMLButtonElement> & { href?: never };

type ButtonProps = AsLink | AsButton;

const styles: Record<Variant, string> = {
  primary:
    "bg-amber-600 text-white hover:bg-amber-700 shadow-sm",
  secondary:
    "border border-slate-800 text-slate-800 hover:bg-slate-800 hover:text-white",
};

const base =
  "inline-flex items-center justify-center rounded-lg px-6 py-3 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";

export default function Button({
  variant = "primary",
  children,
  ...props
}: ButtonProps) {
  const cls = `${base} ${styles[variant]}`;

  if ("href" in props && props.href) {
    return (
      <Link
        href={props.href}
        onClick={props.onClick}
        className={cls}
      >
        {children}
      </Link>
    );
  }

  const buttonProps = props as AsButton;
  return (
    <button {...buttonProps} className={cls}>
      {children}
    </button>
  );
}
