import { cn } from "@/presentation/lib/utils";

interface RevealProps {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  as?: React.ElementType;
}

export function Reveal({ children, delay = 0, className, as: Tag = "div" }: RevealProps) {
  return (
    <Tag
      className={cn("animate-slide-up", className)}
      style={{ animationDelay: `${delay}ms` }}
    >
      {children}
    </Tag>
  );
}
