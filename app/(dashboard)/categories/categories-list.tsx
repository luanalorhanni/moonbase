"use client";

import { ChevronDown, ChevronRight, MoreHorizontal, Plus, Tags } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { PageShell } from "@/components/dashboard/page-shell";
import { CategoryIcon } from "@/components/ui/category-icon";
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
import { deleteCategory, deleteSubcategory } from "@/lib/actions/categories";
import type { CategoryWithSubs, SubcategoryRow } from "@/lib/queries/categories";

import { CategoryForm } from "./category-form";
import { SubcategoryForm } from "./subcategory-form";

type DialogState =
  | { kind: "closed" }
  | { kind: "new-category" }
  | { kind: "edit-category"; category: CategoryWithSubs }
  | { kind: "new-subcategory"; categoryId: string; categoryName: string }
  | { kind: "edit-subcategory"; subcategory: SubcategoryRow; categoryId: string };

type DeleteState =
  | null
  | { kind: "category"; item: CategoryWithSubs }
  | { kind: "subcategory"; item: SubcategoryRow };


export function CategoriesList({ initialCategories }: { initialCategories: CategoryWithSubs[] }) {
  const [dialog, setDialog] = useState<DialogState>({ kind: "closed" });
  const [pendingDelete, setPendingDelete] = useState<DeleteState>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [isDeleting, startDeleteTransition] = useTransition();

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleDelete() {
    if (!pendingDelete) return;
    startDeleteTransition(async () => {
      const result =
        pendingDelete.kind === "category"
          ? await deleteCategory(pendingDelete.item.id)
          : await deleteSubcategory(pendingDelete.item.id);

      if (result.ok) {
        toast.success(
          pendingDelete.kind === "category" ? "category deleted." : "subcategory deleted.",
        );
        setPendingDelete(null);
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <PageShell
      title="categories"
      subtitle="classification for expenses"
      toolbar={
        <Button onClick={() => setDialog({ kind: "new-category" })} size="sm">
          <Plus aria-hidden className="size-3.5" /> new category
        </Button>
      }
    >
      {initialCategories.length === 0 ? (
        <EmptyState onAdd={() => setDialog({ kind: "new-category" })} />
      ) : (
        <div className="flex flex-col px-5 py-4 gap-1.5">
          {initialCategories.map((category) => {
            const isOpen = expanded.has(category.id);
            return (
              <div key={category.id} className="border-border overflow-hidden rounded-lg border">
                <div className="flex items-center gap-3 px-4 py-3">
                  <button
                    type="button"
                    onClick={() => toggleExpand(category.id)}
                    aria-expanded={isOpen}
                    aria-label={isOpen ? "collapse subcategories" : "expand subcategories"}
                    className="text-muted-foreground hover:text-foreground shrink-0 transition-colors"
                  >
                    {isOpen ? (
                      <ChevronDown className="size-4" aria-hidden />
                    ) : (
                      <ChevronRight className="size-4" aria-hidden />
                    )}
                  </button>

                  {category.icon ? (
                    <span
                      className="border-border bg-card flex size-6 shrink-0 items-center justify-center rounded-md border"
                      aria-hidden
                      style={{
                        borderColor: `color-mix(in oklab, ${category.color} 35%, var(--border))`,
                      }}
                    >
                      <CategoryIcon
                        icon={category.icon}
                        color={category.color}
                        size={14}
                      />
                    </span>
                  ) : (
                    <span
                      className="size-3 shrink-0 rounded-full ring-1 ring-black/10"
                      style={{ backgroundColor: category.color }}
                      aria-hidden
                    />
                  )}

                  <span className="flex-1 font-medium">{category.name}</span>

                  <span className="text-muted-foreground shrink-0 font-mono text-[11.5px] tracking-wider tabular-nums">
                    {category.subcategories.length === 0
                      ? "no subcategories"
                      : `${category.subcategories.length} sub${category.subcategories.length !== 1 ? "s" : ""}`}
                  </span>

                  <DropdownMenu>
                    <DropdownMenuTrigger
                      aria-label="category actions"
                      className="hover:bg-muted aria-expanded:bg-muted focus-visible:ring-ring/50 inline-flex size-7 shrink-0 items-center justify-center rounded-md transition-colors focus-visible:ring-3 focus-visible:outline-none"
                    >
                      <MoreHorizontal aria-hidden className="size-3.5" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => setDialog({ kind: "edit-category", category })}
                      >
                        edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => setPendingDelete({ kind: "category", item: category })}
                      >
                        delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {isOpen && (
                  <div className="border-t">
                    {category.subcategories.map((sub) => (
                      <div
                        key={sub.id}
                        className="border-border flex items-center gap-3 border-b px-4 py-3 last:border-b-0"
                      >
                        <span className="w-4 shrink-0" aria-hidden />
                        <ChevronRight
                          className="text-muted-foreground/40 size-3 shrink-0"
                          aria-hidden
                        />
                        <span className="flex-1 text-sm">{sub.name}</span>
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            aria-label="subcategory actions"
                            className="hover:bg-muted aria-expanded:bg-muted focus-visible:ring-ring/50 inline-flex size-7 shrink-0 items-center justify-center rounded-md transition-colors focus-visible:ring-3 focus-visible:outline-none"
                          >
                            <MoreHorizontal aria-hidden className="size-3.5" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() =>
                                setDialog({
                                  kind: "edit-subcategory",
                                  subcategory: sub,
                                  categoryId: category.id,
                                })
                              }
                            >
                              edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => setPendingDelete({ kind: "subcategory", item: sub })}
                            >
                              delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    ))}

                    <div className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() =>
                          setDialog({
                            kind: "new-subcategory",
                            categoryId: category.id,
                            categoryName: category.name,
                          })
                        }
                        className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-[12px] transition-colors"
                      >
                        <Plus className="size-3" aria-hidden />
                        add subcategory
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Dialog
        open={dialog.kind === "new-category" || dialog.kind === "edit-category"}
        onOpenChange={(open) => {
          if (!open) setDialog({ kind: "closed" });
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {dialog.kind === "edit-category" ? "edit category" : "new category"}
            </DialogTitle>
            <DialogDescription>
              {dialog.kind === "edit-category"
                ? "update category details."
                : "create a category to classify expenses."}
            </DialogDescription>
          </DialogHeader>
          <CategoryForm
            key={dialog.kind === "edit-category" ? dialog.category.id : "new"}
            category={dialog.kind === "edit-category" ? dialog.category : undefined}
            onSuccess={() => setDialog({ kind: "closed" })}
          />
        </DialogContent>
      </Dialog>

      <Dialog
        open={dialog.kind === "new-subcategory" || dialog.kind === "edit-subcategory"}
        onOpenChange={(open) => {
          if (!open) setDialog({ kind: "closed" });
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {dialog.kind === "edit-subcategory" ? "edit subcategory" : "new subcategory"}
            </DialogTitle>
            <DialogDescription>
              {dialog.kind === "new-subcategory"
                ? `under: ${dialog.categoryName}`
                : "rename the subcategory."}
            </DialogDescription>
          </DialogHeader>
          {(dialog.kind === "new-subcategory" || dialog.kind === "edit-subcategory") && (
            <SubcategoryForm
              key={
                dialog.kind === "edit-subcategory"
                  ? dialog.subcategory.id
                  : `new-${dialog.categoryId}`
              }
              subcategory={dialog.kind === "edit-subcategory" ? dialog.subcategory : undefined}
              categoryId={
                dialog.kind === "new-subcategory"
                  ? dialog.categoryId
                  : dialog.subcategory.categoryId
              }
              onSuccess={() => setDialog({ kind: "closed" })}
            />
          )}
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
            <AlertDialogTitle>
              {pendingDelete?.kind === "category" ? "delete category?" : "delete subcategory?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete?.kind === "category"
                ? `"${pendingDelete.item.name}" will be removed.`
                : pendingDelete?.kind === "subcategory"
                  ? `"${pendingDelete.item.name}" will be removed.`
                  : null}{" "}
              this can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting}
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
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

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <Tags className="text-muted-foreground/60 size-10" strokeWidth={1} aria-hidden />
      <div className="flex max-w-sm flex-col gap-1">
        <h2 className="text-foreground text-[14px] font-medium">no categories yet</h2>
        <p className="text-muted-foreground text-[13px]">
          create categories to classify expenses.
        </p>
      </div>
      <Button onClick={onAdd} size="sm" className="mt-2">
        <Plus aria-hidden className="size-3.5" /> new category
      </Button>
    </div>
  );
}
