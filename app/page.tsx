import { Moon } from "lucide-react";

export default function Home() {
  return (
    <main className="flex flex-1 items-center justify-center px-6">
      <div className="flex max-w-md flex-col items-center gap-6 text-center">
        <Moon
          className="size-12 text-muted-foreground"
          strokeWidth={1.25}
          aria-hidden
        />
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight">moonbase</h1>
          <p className="text-sm text-muted-foreground">
            Comando central de finanças pessoais.
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          Sistema em construção.
        </p>
      </div>
    </main>
  );
}
