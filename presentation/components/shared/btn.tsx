import Link from "next/link";
import { cn } from "@/presentation/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

const btnVariants = cva(
  "inline-flex items-center gap-[9px] font-mono text-[14px] font-semibold tracking-[-0.01em] px-5 py-[13px] rounded-[9px] cursor-pointer transition-all duration-150 border border-transparent whitespace-nowrap active:scale-[0.98]",
  {
    variants: {
      variant: {
        primary: "bg-accent text-[#0a0b0d] hover:brightness-105 hover:-translate-y-[1px]",
        ghost: "bg-transparent text-foreground border-border hover:border-accent hover:text-accent",
        soft: "bg-raised text-foreground border-border hover:border-accent hover:text-accent",
      },
    },
    defaultVariants: {
      variant: "primary",
    },
  }
);

interface BtnProps
  extends React.AnchorHTMLAttributes<HTMLAnchorElement>,
    VariantProps<typeof btnVariants> {
  href?: string;
  children: React.ReactNode;
}

export function Btn({ children, variant, href, className, ...props }: BtnProps) {
  if (href && !href.startsWith("#")) {
    return (
      <Link href={href} className={cn(btnVariants({ variant, className }))}>
        {children}
      </Link>
    );
  }

  return (
    <a href={href} className={cn(btnVariants({ variant, className }))} {...props}>
      {children}
    </a>
  );
}
