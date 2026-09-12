import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return <main className="auth-shell"><div><div className="auth-brand"><span className="brand-mark">✳</span>beforebuild.</div><SignUp path="/sign-up" routing="path" forceRedirectUrl="/" /><p style={{ textAlign: "center", marginTop: 20, fontSize: 12 }}>Invite-only beta. Sign up with the email address your invitation was granted to.</p></div></main>;
}
