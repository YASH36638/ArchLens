import { Check } from 'lucide-react';
import { SignInWithGitHubButton } from '@/components/auth/sign-in-button';
import { HeroDashboardPreview } from '@/components/landing/hero-dashboard-preview';

const FEATURE_ROWS = [
  ['Architecture Analytics', 'Security & Compliance'],
  ['Repository Hygiene', 'AI-Powered Recommendations'],
] as const;

export default function LandingPage() {
  return (
    <main className="landing-page h-dvh overflow-hidden bg-white">
      <div className="grid h-full min-h-0 lg:grid-cols-[minmax(0,44%)_minmax(0,56%)]">
        {/* Left panel */}
        <div className="flex h-full min-h-0 flex-col px-6 py-6 sm:px-10 lg:px-14 xl:px-[4.5rem] xl:py-8">
          <div className="flex min-h-0 flex-1 flex-col justify-center">
            <div className="w-full max-w-[400px]">
              <div className="mb-[clamp(1.25rem,3vh,2.5rem)] flex items-center gap-3">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--landing-blue))] text-[15px] font-bold text-white"
                  aria-hidden="true"
                >
                  A
                </div>
                <div>
                  <p className="text-[17px] font-bold leading-tight text-[hsl(var(--landing-navy))]">
                    Archlens
                  </p>
                  <p className="text-[13px] font-medium text-[hsl(var(--landing-body))]">
                    Engineering Intelligence Platform
                  </p>
                </div>
              </div>

              <h1 className="text-[clamp(1.65rem,2.4vw,2.5rem)] font-extrabold leading-[1.12] tracking-[-0.025em] text-[hsl(var(--landing-navy))]">
                Architecture. Security.
                <br />
                Repository Health. <span className="text-[hsl(var(--landing-blue))]">Unified.</span>
              </h1>

              <p className="mt-[clamp(0.75rem,1.8vh,1.25rem)] max-w-[390px] text-[clamp(0.8125rem,1.1vw,0.9375rem)] font-medium leading-[1.55] text-[hsl(var(--landing-body))]">
                Analyze repository health, architecture quality, security posture, documentation
                coverage, dependency risks, and technical debt using AI.
              </p>

              <div className="mt-[clamp(1rem,2.5vh,2rem)]">
                <SignInWithGitHubButton
                  size="lg"
                  className="h-11 w-full max-w-[400px] rounded-xl border-0 bg-[hsl(var(--landing-blue))] text-sm font-semibold text-white shadow-none hover:translate-y-0 hover:bg-[#2563EB] hover:text-white active:scale-100 xl:h-12 xl:text-[15px]"
                  label="Continue with GitHub"
                />
              </div>

              <div className="mt-[clamp(1rem,2.2vh,1.75rem)] max-w-[400px] space-y-2">
                {FEATURE_ROWS.map((row) => (
                  <div key={row[0]} className="grid grid-cols-2 gap-x-4 gap-y-2 xl:gap-x-6">
                    {row.map((item) => (
                      <div
                        key={item}
                        className="flex items-center gap-2 text-[clamp(0.75rem,0.95vw,0.8125rem)] font-medium text-[hsl(var(--landing-body))]"
                      >
                        <Check
                          className="h-3.5 w-3.5 shrink-0 text-[hsl(var(--landing-success))]"
                          strokeWidth={2.5}
                          aria-hidden="true"
                        />
                        {item}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <p className="shrink-0 pt-4 text-xs font-medium text-[hsl(var(--landing-subtle))]">
            Built for Engineering Teams
          </p>
        </div>

        {/* Right panel */}
        <div className="relative hidden min-h-0 overflow-hidden lg:block">
          <HeroDashboardPreview />
        </div>
      </div>
    </main>
  );
}
