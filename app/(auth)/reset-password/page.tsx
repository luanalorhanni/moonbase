import { KeyRound } from "lucide-react";

import { ResetPasswordForm } from "./reset-password-form";

export const metadata = {
  title: "new password · moonbase",
};

export default function ResetPasswordPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center px-6 py-16">
      <div className="border-border/60 bg-card/40 flex w-full max-w-sm flex-col gap-6 rounded-2xl border px-7 py-9 shadow-xl backdrop-blur-sm">
        <div className="flex flex-col items-center gap-3">
          <div className="bg-primary/10 text-primary flex size-12 items-center justify-center rounded-full">
            <KeyRound aria-hidden className="size-5" strokeWidth={1.4} />
          </div>
          <div className="flex flex-col items-center gap-1.5 text-center">
            <h1 className="font-display text-[20px] leading-none font-light italic tracking-tight">
              new password
            </h1>
            <p className="text-muted-foreground/85 max-w-[280px] text-[12.5px] leading-relaxed">
              pick a strong password — you'll only use it here.
            </p>
          </div>
        </div>
        <ResetPasswordForm />
      </div>
    </main>
  );
}
