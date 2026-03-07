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
    "bg-accent text-background hover:bg-accent-hover",
  secondary:
    "border border-cream-muted/30 text-cream hover:border-accent hover:text-accent",
};

const base =
  "inline-flex items-center justify-center rounded-none px-7 py-3.5 text-sm font-medium tracking-wide uppercase transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-accent/40 focus:ring-offset-2 focus:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed";

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
