import Link from "next/link";
import { SignIn } from "@clerk/nextjs";
export default function SupportSignInPage() { return <main className="auth-shell"><div><div className="auth-brand"><span className="brand-mark">✳</span>beforebuild.</div><SignIn path="/support/sign-in" routing="path" forceRedirectUrl="/support" withSignUp /><p className="auth-note">Verify your email to contact Support. This will not add you to the beta waitlist.</p><Link className="text-button auth-back" href="/sign-in">Beta sign in</Link></div></main>; }
