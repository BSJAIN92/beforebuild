import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return <main className="auth-shell"><div><div className="auth-brand"><span className="brand-mark">✳</span>beforebuild.</div><SignIn path="/sign-in" routing="path" forceRedirectUrl="/" withSignUp /><p style={{ textAlign: "center", marginTop: 20, fontSize: 12 }}>Private beta. Verified accounts without access are added to the waitlist.</p></div></main>;
}
