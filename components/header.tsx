import Link from "next/link";
import { Logo } from "./logo";

export const Header = () => {
  return (
    <div className="fixed z-50 pt-8 md:pt-14 top-0 left-0 w-full">
      <header className="flex items-center justify-between container">
        <Link href="/"><Logo className="w-[100px] md:w-[120px]" /></Link>
        <Link className="uppercase transition-colors ease-out duration-150 font-mono text-primary hover:text-primary/80" href="/onboarding">
          Start Trial
        </Link>
      </header>
    </div>
  );
};
