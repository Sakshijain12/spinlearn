import Link from "next/link";
import { publicMetadata } from "@/lib/site";

export const metadata = publicMetadata("Declaration and terms", "Spinlearn's educational purpose, AI-assisted content disclosure, acceptable-use terms, and limitations.", "/declaration");

export default function DeclarationPage() {
  return (
    <main id="main-content" className="page-container max-w-[860px]">
      <header className="mb-8">
        <p className="section-label">Last updated: 2 November 2026</p>
        <h1 className="text-title font-medium">Declaration and terms</h1>
        <p className="mt-3 text-body text-text-secondary">Spinlearn is an independent educational project operated by Sakshi. Contact: <a className="text-link" href="mailto:spinlearn025@gmail.com">spinlearn025@gmail.com</a>.</p>
      </header>
      <div className="space-y-7 text-body leading-7 text-text-secondary [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-medium [&_h2]:text-text-primary">
        <section><h2>Educational purpose</h2><p>The website helps learners understand AI and machine-learning concepts through explanations, examples, code, and quizzes. It is not professional, legal, financial, medical, or security advice. A completed lesson or quiz score is not a certification, professional qualification, or guarantee of competence.</p></section>
        <section><h2>AI-assisted content and accuracy</h2><p>AI tools assisted with developing the application and drafting learning materials. Examples are simplified teaching programs, not complete production systems. Content may contain mistakes, omissions, or outdated information despite automated checks. Consult the cited sources and verify important conclusions before relying on them. We do not claim independent expert review of every lesson.</p></section>
        <section><h2>Using the service</h2><p>You may browse and learn without an account. An account is required to save and view personal progress across devices. Keep credentials private and provide a login ID you are entitled to use. Do not impersonate others, attempt unauthorized access, upload malicious data, disrupt the service, or use automated traffic to evade rate limits.</p><p className="mt-2">Use the service only where you can lawfully agree to these terms, with appropriate permission or supervision where required. Do not use exercises to harm people or access systems without authorization.</p></section>
        <section><h2>Saved learning data</h2><p>Signed-in progress is stored on the server for your account. Guest activity is temporary and is not automatically transferred when you sign in. Browser-progress migration and backup restoration require an explicit choice. Keep a backup before replacing or resetting data; imports replace learning records and do not change your password. See the <Link className="text-link" href="/privacy">privacy policy</Link> for data handling and deletion requests.</p></section>
        <section><h2>References and ownership</h2><p>Research papers, libraries, trademarks, and other third-party materials belong to their respective owners. Links and product names identify sources or technologies, not sponsorship or endorsement. Respect third-party licenses and do not misrepresent authorship of material you reuse. Spinlearn is not affiliated with the authors or organizations cited in its lessons merely because they are referenced.</p></section>
        <section><h2>Availability and limitations</h2><p>Features and content may change, and the service can be unavailable during maintenance, errors, or hosting limits. There is no promise of uninterrupted operation, complete accuracy, or fitness for a particular purpose. To the extent allowed by applicable law, use is at your own discretion. Nothing in these terms excludes rights or responsibilities that cannot lawfully be excluded.</p><p className="mt-2">There is currently no paid subscription or payment collection in the application. This statement does not promise that all future features will have the same terms.</p></section>
        <section><h2>Reporting problems and changes</h2><p>Report incorrect lessons, rights concerns, account problems, or privacy requests to <a className="text-link" href="mailto:spinlearn025@gmail.com">spinlearn025@gmail.com</a>. Include the relevant page and a description, but not your password or sensitive information. Updated terms will be published here with a revised date.</p></section>
      </div>
      <Link href="/library" className="text-link mt-8">Explore the learning library</Link>
    </main>
  );
}
