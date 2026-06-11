import { cn } from "@/presentation/lib/utils";

interface ContainerProps {
  children: React.ReactNode;
  className?: string;
}

export function Container({ children, className }: ContainerProps) {
  return (
    <div className={cn("w-full max-w-[1180px] mx-auto px-8", className)}>
      {children}
    </div>
  );
}
