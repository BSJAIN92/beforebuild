import Link from "next/link";

export default function TermsPage() {
  return <main className="terms-shell"><article className="terms-card">
    <Link className="terms-brand" href="/"><span className="brand-mark">✳</span>beforebuild.</Link>
    <h1>Terms and Conditions</h1>
    <p className="terms-date">Last updated: 15 September 2026</p>
    <p>BeforeBuild is a private beta operated by <strong>[LEGAL BUSINESS NAME — ADD AFTER REGISTRATION]</strong>. By using it, you agree to these terms.</p>

    <h2>1. What BeforeBuild does</h2>
    <p>BeforeBuild helps you explore a business idea through guided questions and a business model canvas. Its output may be incomplete or wrong. It is not legal, financial, tax, or professional advice.</p>

    <h2>2. AI processing</h2>
    <p>Your idea and relevant answers are sent to Google’s Gemini API to generate responses. Google states that content sent through its unpaid API service may be used to improve its products and may be reviewed by people. Do not submit secrets, confidential information, or personal data. See <a href="https://ai.google.dev/gemini-api/terms" target="_blank" rel="noopener noreferrer">Google’s Gemini API Terms</a>.</p>

    <h2>3. Your responsibilities</h2>
    <p>Only submit content you have the right to use. Do not use BeforeBuild for illegal, harmful, abusive, or deceptive activity. You are responsible for decisions you make using its output.</p>

    <h2>4. Stored information</h2>
    <p>BeforeBuild stores your verified email, display name, ideas, answers, generated output, and basic usage records. Deleting an idea removes the saved idea, but security and error records may be retained. Other providers may retain information under their own terms.</p>

    <h2>5. Private beta</h2>
    <p>The service may change, stop, lose data, or be unavailable. Features and limits may change during testing. Access may be suspended if the service is misused.</p>

    <h2>6. Liability</h2>
    <p>Use BeforeBuild at your own risk. To the fullest extent allowed by applicable law, the operator is not responsible for losses caused by relying on generated output, service interruptions, or data loss. Rights that cannot legally be excluded remain unaffected.</p>

    <h2>7. Changes</h2>
    <p>These terms may be updated as the product develops. Continued use after an update means you accept the updated terms.</p>

    <p>Questions can be submitted through the <Link href="/support">BeforeBuild Support page</Link>.</p>
  </article></main>;
}
