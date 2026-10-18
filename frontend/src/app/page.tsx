import Navbar from "@/components/layout/Navbar";
import Hero from "@/components/sections/Hero";
import ProofSection from "@/components/sections/ProofSection";
import CTASection from "@/components/sections/CTASection";
import Footer from "@/components/layout/Footer"

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <ProofSection />
        <CTASection />
        <Footer />


        {/* <section
          id="architecture"
          className="min-h-screen px-6 py-32"
        >
          <div className="mx-auto max-w-5xl">
            <p className="font-mono text-xs uppercase tracking-widest text-neutral-500">
              Under the hood
            </p>
            <h2 className="mt-4 text-4xl font-semibold tracking-tight">
              A direct connection. An isolated environment.
            </h2>
          </div>
        </section>

        <section
          id="roadmap"
          className="min-h-screen px-6 py-32"
        >
          <div className="mx-auto max-w-5xl">
            <p className="font-mono text-xs uppercase tracking-widest text-neutral-500">
              What comes next
            </p>
            <h2 className="mt-4 text-4xl font-semibold tracking-tight">
              Built in phases. Verified at every step.
            </h2>
          </div>
        </section> */}
      </main>
    </>
  );
}