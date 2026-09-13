import Link from "next/link";
import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return <main className="auth-shell"><div><div className="auth-brand"><span className="brand-mark">✳</span>beforebuild.</div><SignIn path="/sign-in" routing="path" forceRedirectUrl="/" withSignUp /><p className="auth-note">Private beta. Verified accounts without access are added to the waitlist.</p><Link className="text-button auth-back" href="/support">Contact Support without joining the waitlist</Link></div></main>;
}
