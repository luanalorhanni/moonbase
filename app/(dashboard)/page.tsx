import { Moon } from "lucide-react";

export default function HomePage() {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="flex max-w-md flex-col items-center gap-6 text-center">
        <Moon className="text-muted-foreground size-12" strokeWidth={1.25} aria-hidden />
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight">moonbase</h1>
          <p className="text-muted-foreground text-sm">Comando central de finanças pessoais.</p>
        </div>
        <p className="text-muted-foreground text-xs">Sistema em construção.</p>
      </div>
    </main>
  );
}
