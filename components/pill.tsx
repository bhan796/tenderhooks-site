import { cn } from "@/lib/utils";

export const Pill = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn("pill", className)}>
    <span className="dot" />
    <span>{children}</span>
  </div>
);
