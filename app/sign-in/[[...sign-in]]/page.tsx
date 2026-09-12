import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return <main className="auth-shell"><div><div className="auth-brand"><span className="brand-mark">✳</span>beforebuild.</div><SignIn path="/sign-in" routing="path" forceRedirectUrl="/" /><p style={{ textAlign: "center", marginTop: 20, fontSize: 12 }}>Invite-only beta. Use the email address your invitation was granted to.</p></div></main>;
}
