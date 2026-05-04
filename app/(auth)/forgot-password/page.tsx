import { KeyRound } from "lucide-react";
import Link from "next/link";

import { ForgotPasswordForm } from "./forgot-password-form";

export const metadata = {
  title: "recover password · moonbase",
};

export default function ForgotPasswordPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center px-6 py-16">
      <div className="border-border/60 bg-card/40 flex w-full max-w-sm flex-col gap-6 rounded-2xl border px-7 py-9 shadow-xl backdrop-blur-sm">
        <div className="flex flex-col items-center gap-3">
          <div className="bg-primary/10 text-primary flex size-12 items-center justify-center rounded-full">
            <KeyRound aria-hidden className="size-5" strokeWidth={1.4} />
          </div>
          <div className="flex flex-col items-center gap-1.5 text-center">
            <h1 className="font-display text-[20px] leading-none font-light tracking-tight italic">
              recover password
            </h1>
            <p className="text-muted-foreground/85 max-w-[280px] text-[12.5px] leading-relaxed">
              enter your email — we&apos;ll send you a link to set a new password.
            </p>
          </div>
        </div>
        <ForgotPasswordForm />
        <Link
          href="/login"
          className="text-muted-foreground/70 hover:text-foreground text-center text-[11.5px] transition-colors"
        >
          ← back to login
        </Link>
      </div>
    </main>
  );
}
