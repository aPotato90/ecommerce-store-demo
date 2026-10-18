import { FlaskConicalIcon } from "lucide-react";

export function DemoBanner() {
  return (
    <div className="bg-foreground px-4 py-2 text-center text-xs text-background sm:text-sm">
      <p className="flex items-center justify-center gap-2">
        <FlaskConicalIcon aria-hidden="true" className="size-4 shrink-0" />
        <span>
          <strong className="font-semibold">Demo store.</strong> Kestrel &amp; Co. is
          fictional: nothing ships and no real payments are taken.
        </span>
      </p>
    </div>
  );
}
