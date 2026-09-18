import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { MarginNote, NotebookPanel, Tag } from "@/components/NotebookKit";

import { useAuth } from "@/hooks/use-auth";
import { ArrowRight, FlaskConical, Loader2, Mail, UserX } from "lucide-react";
import { Suspense, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";

interface AuthProps {
  redirectAfterAuth?: string;
}

function resolveRedirectAfterAuth(
  returnTo: string | null,
  fallback = "/dashboard",
) {
  if (returnTo?.startsWith("/") && !returnTo.startsWith("//")) {
    return returnTo;
  }
  return fallback;
}

function Auth({ redirectAfterAuth }: AuthProps = {}) {
  const { isLoading: authLoading, isAuthenticated, signIn } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = resolveRedirectAfterAuth(
    searchParams.get("returnTo"),
    redirectAfterAuth,
  );
  const [step, setStep] = useState<"signIn" | { email: string }>("signIn");
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate(redirect);
    }
  }, [authLoading, isAuthenticated, navigate, redirect]);

  const handleEmailSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const formData = new FormData(event.currentTarget);
      await signIn("email-otp", formData);
      setStep({ email: formData.get("email") as string });
      setIsLoading(false);
    } catch (error) {
      console.error("Email sign-in error:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to send verification code. Please try again.",
      );
      setIsLoading(false);
    }
  };

  const handleOtpSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const formData = new FormData(event.currentTarget);
      await signIn("email-otp", formData);
      navigate(redirect);
    } catch (error) {
      console.error("OTP verification error:", error);
      setError("The verification code you entered is incorrect.");
      setIsLoading(false);
      setOtp("");
    }
  };

  const handleGuestLogin = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await signIn("anonymous");
      navigate(redirect);
    } catch (error) {
      console.error("Guest login error:", error);
      setError(
        `Failed to sign in as guest: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      setIsLoading(false);
    }
  };

  return (
    <main className="notebook-page paper-grain relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(90%_60%_at_50%_-10%,rgba(139,92,246,0.22),transparent_60%),radial-gradient(70%_50%_at_100%_100%,rgba(163,230,53,0.09),transparent_60%)]" />

      <div className="relative w-full max-w-md">
        <div className="mb-5 flex items-center justify-center gap-2.5">
          <span className="neu-raise flex size-10 items-center justify-center rounded-2xl border border-lime-neon/25">
            <FlaskConical className="size-5 text-lime-neon" />
          </span>
          <button
            type="button"
            onClick={() => navigate("/")}
            className="font-display text-lg tracking-tight text-ink"
          >
            Marginalia
          </button>
        </div>

        <NotebookPanel tone="violet" className="px-6 py-7 sm:px-7">
          {step === "signIn" ? (
            <>
              <span className="hand text-base text-violet-300">open your notebook</span>
              <h1 className="font-display mt-2 text-2xl leading-tight tracking-tight text-ink">
                Sign in to keep your experiments
              </h1>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                One email code is all it takes. Your simulations, slider positions and glowing
                concept tree are filed under your name.
              </p>

              <form onSubmit={handleEmailSubmit} className="mt-6">
                <label
                  htmlFor="email"
                  className="text-[10px] tracking-[0.16em] text-muted-foreground uppercase"
                >
                  Email
                </label>
                <div className="mt-2 flex items-center gap-2">
                  <div className="relative flex-1">
                    <Mail className="absolute top-3 left-3 size-4 text-muted-foreground" />
                    <Input
                      id="email"
                      name="email"
                      placeholder="name@example.com"
                      type="email"
                      className="neu-sink rounded-2xl border-white/[0.08] bg-[#141b28] pl-9 text-ink placeholder:text-muted-foreground/60"
                      disabled={isLoading}
                      required
                    />
                  </div>
                  <Button
                    type="submit"
                    size="icon"
                    disabled={isLoading}
                    className="size-10 rounded-2xl bg-lime-neon text-[#131a08] shadow-[0_0_26px_-8px_rgba(163,230,53,0.9)] hover:bg-lime-300"
                    aria-label="Send code"
                  >
                    {isLoading ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <ArrowRight className="size-4" />
                    )}
                  </Button>
                </div>

                {error && <p className="mt-3 text-xs text-destructive">{error}</p>}

                <div className="mt-6 flex items-center gap-3">
                  <span className="h-px flex-1 bg-white/[0.08]" />
                  <span className="text-[10px] tracking-[0.18em] text-muted-foreground uppercase">
                    or
                  </span>
                  <span className="h-px flex-1 bg-white/[0.08]" />
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="mt-4 w-full rounded-2xl border-white/12 bg-white/[0.03] text-ink hover:border-violet-neon/45 hover:bg-violet-neon/10"
                  onClick={handleGuestLogin}
                  disabled={isLoading}
                >
                  <UserX className="mr-2 size-4 text-violet-300" />
                  Continue as guest
                </Button>
              </form>

              <div className="mt-6 border-t border-white/[0.06] pt-4">
                <MarginNote tone="lime">
                  no card, no onboarding tour — the sandbox is one click away.
                </MarginNote>
              </div>
            </>
          ) : (
            <>
              <span className="hand text-base text-lime-neon">check your inbox</span>
              <h1 className="font-display mt-2 text-2xl leading-tight tracking-tight text-ink">
                Enter your six-digit code
              </h1>
              <p className="mt-2 text-xs text-muted-foreground">
                We sent it to <span className="text-ink/90">{step.email}</span>
              </p>

              <form onSubmit={handleOtpSubmit} className="mt-6">
                <input type="hidden" name="email" value={step.email} />
                <input type="hidden" name="code" value={otp} />

                <div className="flex justify-center">
                  <InputOTP
                    value={otp}
                    onChange={setOtp}
                    maxLength={6}
                    disabled={isLoading}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && otp.length === 6 && !isLoading) {
                        const form = (event.target as HTMLElement).closest("form");
                        if (form) form.requestSubmit();
                      }
                    }}
                  >
                    <InputOTPGroup>
                      {Array.from({ length: 6 }).map((_, index) => (
                        <InputOTPSlot
                          key={index}
                          index={index}
                          className="border-white/10 bg-[#141b28] text-ink"
                        />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                </div>

                {error && (
                  <p className="mt-3 text-center text-xs text-destructive">{error}</p>
                )}

                <Button
                  type="submit"
                  className="mt-6 w-full rounded-2xl bg-lime-neon text-[#131a08] shadow-[0_0_30px_-10px_rgba(163,230,53,0.9)] hover:bg-lime-300"
                  disabled={isLoading || otp.length !== 6}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Verifying…
                    </>
                  ) : (
                    <>
                      Open my notebook
                      <ArrowRight className="ml-2 size-4" />
                    </>
                  )}
                </Button>

                <div className="mt-3 flex items-center justify-between">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-ink"
                    onClick={() => setStep("signIn")}
                    disabled={isLoading}
                  >
                    Use a different email
                  </Button>
                  <Tag tone="violet">code expires in 15 min</Tag>
                </div>
              </form>
            </>
          )}
        </NotebookPanel>

        <p className="mt-5 text-center text-[11px] text-muted-foreground">
          Marginalia keeps every experiment in your notebook · secured by{" "}
          <a
            href="https://freebuff.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-lime-neon/90 underline decoration-lime-neon/40 hover:text-lime-neon"
          >
            freebuff.com
          </a>
        </p>
      </div>
    </main>
  );
}

export default function AuthPage(props: AuthProps) {
  return (
    <Suspense>
      <Auth {...props} />
    </Suspense>
  );
}
