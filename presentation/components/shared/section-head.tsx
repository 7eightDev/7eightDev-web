import { cn } from "@/presentation/lib/utils";
import { Container } from "@/presentation/components/shared/container";
import { Eyebrow } from "@/presentation/components/shared/eyebrow";
import { Reveal } from "@/presentation/components/shared/reveal";
import { Chip } from "@/presentation/components/shared/chip";

interface SectionHeadProps {
  eyebrow: string;
  title: string;
  sub?: string;
  center?: boolean;
}

export function SectionHead({ eyebrow, title, sub, center }: SectionHeadProps) {
  return (
    <div className={cn("max-w-[720px]", center ? "mx-auto text-center" : "text-left")}>
      <Reveal>
        <Eyebrow className={center ? "justify-center" : ""}>{eyebrow}</Eyebrow>
      </Reveal>
      <Reveal delay={60}>
        <h2 className="font-space font-semibold text-[clamp(28px,3.4vw,42px)] tracking-[-0.03em] leading-[1.06] mt-[18px] text-foreground text-balance">
          {title}
        </h2>
      </Reveal>
      {sub && (
        <Reveal delay={120}>
          <p className="font-sans text-[17px] leading-[1.58] text-soft mt-[18px]">{sub}</p>
        </Reveal>
      )}
    </div>
  );
}
