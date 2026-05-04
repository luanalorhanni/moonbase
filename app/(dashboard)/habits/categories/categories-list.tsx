"use client";

import { ArrowLeft, MoreHorizontal, Plus, Tags } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { PageShell } from "@/components/dashboard/page-shell";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { CategoryIcon } from "@/components/ui/category-icon";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { deleteHabitCategory } from "@/lib/actions/habits";
import type { HabitCategoryRow } from "@/lib/queries/habits";

import { HabitCategoryForm } from "./category-form";

type CategoryWithCount = HabitCategoryRow & { habitCount: number };

type DialogState =
  | { kind: "closed" }
  | { kind: "create" }
  | { kind: "edit"; category: CategoryWithCount };

export function HabitCategoriesList({
  initialCategories,
}: {
  initialCategories: CategoryWithCount[];
}) {
  const router = useRouter();
  const [dialog, setDialog] = useState<DialogState>({ kind: "closed" });
  const [pendingDelete, setPendingDelete] = useState<CategoryWithCount | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();

  function handleDelete(category: CategoryWithCount) {
    startDeleteTransition(async () => {
      const result = await deleteHabitCategory(category.id);
      if (result.ok) {
        toast.success("category removed.");
        setPendingDelete(null);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <PageShell
      title="habit categories"
      subtitle="group routines under labels"
      toolbar={
        <div className="flex items-center gap-2">
          <Link
            href="/habits"
            className="border-border-strong text-muted-foreground hover:bg-card hover:text-foreground inline-flex h-8 items-center gap-1.5 rounded-md border px-3 text-[12.5px] transition-colors"
          >
            <ArrowLeft aria-hidden className="size-3.5" strokeWidth={1.6} />
            back to habits
          </Link>
          <Button onClick={() => setDialog({ kind: "create" })} size="sm">
            <Plus aria-hidden className="size-3.5" /> new category
          </Button>
        </div>
      }
    >
      {initialCategories.length === 0 ? (
        <div className="flex h-full flex-col items-center justify-center gap-3 px-6 py-16 text-center">
          <Tags className="text-muted-foreground/60 size-10" strokeWidth={1} aria-hidden />
          <div className="flex max-w-sm flex-col gap-1">
            <h2 className="text-foreground text-[14px] font-medium">no categories yet</h2>
            <p className="text-muted-foreground text-[13px]">
              create categories to group habits — e.g. health, study, work.
            </p>
          </div>
          <Button onClick={() => setDialog({ kind: "create" })} size="sm" className="mt-2">
            <Plus aria-hidden className="size-3.5" /> new category
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5 px-5 py-4">
          {initialCategories.map((category) => (
            <div
              key={category.id}
              className="border-border flex items-center gap-3 rounded-lg border px-4 py-3"
            >
              {category.icon ? (
                <span
                  aria-hidden
                  className="border-border bg-card flex size-6 shrink-0 items-center justify-center rounded-md border"
                  style={{
                    borderColor: `color-mix(in oklab, ${category.color} 35%, var(--border))`,
                  }}
                >
                  <CategoryIcon icon={category.icon} color={category.color} size={14} />
                </span>
              ) : (
                <span
                  aria-hidden
                  className="size-3 shrink-0 rounded-full ring-1 ring-black/10"
                  style={{ backgroundColor: category.color }}
                />
              )}
              <span className="flex-1 font-medium">{category.name}</span>
              <span className="text-muted-foreground font-mono text-[11.5px] tracking-wider tabular-nums">
                {category.habitCount === 0
                  ? "no habits"
                  : `${category.habitCount} habit${category.habitCount === 1 ? "" : "s"}`}
              </span>
              <DropdownMenu>
                <DropdownMenuTrigger
                  aria-label="actions"
                  className="hover:bg-muted aria-expanded:bg-muted focus-visible:ring-ring/50 inline-flex size-7 items-center justify-center rounded-md transition-colors focus-visible:ring-3 focus-visible:outline-none"
                >
                  <MoreHorizontal aria-hidden className="size-3.5" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setDialog({ kind: "edit", category })}>
                    edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => setPendingDelete(category)}
                  >
                    delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      )}

      <Dialog
        open={dialog.kind !== "closed"}
        onOpenChange={(open) => {
          if (!open) setDialog({ kind: "closed" });
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{dialog.kind === "edit" ? "edit category" : "new category"}</DialogTitle>
            <DialogDescription>
              {dialog.kind === "edit" ? "update category details." : "group habits under a label."}
            </DialogDescription>
          </DialogHeader>
          <HabitCategoryForm
            key={dialog.kind === "edit" ? dialog.category.id : "create"}
            category={dialog.kind === "edit" ? dialog.category : undefined}
            onSuccess={() => {
              setDialog({ kind: "closed" });
              router.refresh();
            }}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>delete category?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete
                ? pendingDelete.habitCount > 0
                  ? `"${pendingDelete.name}" is used by ${pendingDelete.habitCount} habit${pendingDelete.habitCount === 1 ? "" : "s"}. they'll lose their category but stay intact.`
                  : `"${pendingDelete.name}" will be removed.`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting}
              onClick={(e) => {
                e.preventDefault();
                if (pendingDelete) handleDelete(pendingDelete);
              }}
            >
              {isDeleting ? "deleting..." : "delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageShell>
  );
}
