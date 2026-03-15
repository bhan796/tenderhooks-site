import Link from "next/link";
import { Logo } from "./logo";
import { MobileMenu } from "./mobile-menu";

export const Header = () => (
  <div className="header-wrap">
    <header className="header container">
      <Link href="/"><Logo style={{ width: 145 }} /></Link>
      <nav className="nav">
        <Link href="/#how">How</Link>
        <Link href="/#pricing">Pricing</Link>
        <Link href="/onboarding">Start trial</Link>
        <Link href="/terms">Terms</Link>
      </nav>
      <Link className="signin" href="/onboarding">Get Started</Link>
      <MobileMenu />
    </header>
  </div>
);
