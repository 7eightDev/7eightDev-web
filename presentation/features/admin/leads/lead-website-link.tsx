import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowUpRight01Icon } from "@hugeicons/core-free-icons";

/** Quick-access link to the lead's website, opened in a new tab. */
export function WebsiteLink({ url }: { url: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      aria-label={`Apri il sito ${url} in una nuova scheda`}
      className="inline-flex items-center gap-1 text-accent hover:text-accent/80 underline underline-offset-2 break-all"
    >
      {url}
      <HugeiconsIcon icon={ArrowUpRight01Icon} size={14} aria-hidden />
    </a>
  );
}