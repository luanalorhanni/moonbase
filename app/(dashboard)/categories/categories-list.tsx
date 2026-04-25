"use client";

import { ChevronDown, ChevronRight, MoreHorizontal, Plus, Tags } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

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

const COLOR_DOT_CLASS: Record<string, string> = {
  red: "bg-red-500",
  orange: "bg-orange-500",
  yellow: "bg-yellow-400",
  green: "bg-green-500",
  blue: "bg-blue-500",
  purple: "bg-purple-500",
  pink: "bg-pink-500",
  brown: "bg-amber-700",
  gray: "bg-gray-400",
};

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
          pendingDelete.kind === "category" ? "Categoria excluída." : "Subcategoria excluída.",
        );
        setPendingDelete(null);
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Categorias</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            Categorias e subcategorias para classificar despesas.
          </p>
        </div>
        <Button onClick={() => setDialog({ kind: "new-category" })} size="sm">
          <Plus aria-hidden className="size-4" /> Nova categoria
        </Button>
      </div>

      {initialCategories.length === 0 ? (
        <EmptyState onAdd={() => setDialog({ kind: "new-category" })} />
      ) : (
        <div className="flex flex-col gap-2">
          {initialCategories.map((category) => {
            const isOpen = expanded.has(category.id);
            return (
              <div key={category.id} className="border-border overflow-hidden rounded-lg border">
                <div className="flex items-center gap-3 px-4 py-3">
                  <button
                    type="button"
                    onClick={() => toggleExpand(category.id)}
                    aria-expanded={isOpen}
                    aria-label={isOpen ? "Recolher subcategorias" : "Expandir subcategorias"}
                    className="text-muted-foreground hover:text-foreground shrink-0 transition-colors"
                  >
                    {isOpen ? (
                      <ChevronDown className="size-4" aria-hidden />
                    ) : (
                      <ChevronRight className="size-4" aria-hidden />
                    )}
                  </button>

                  {category.icon ? (
                    <span className="w-5 shrink-0 text-center text-base leading-none" aria-hidden>
                      {category.icon}
                    </span>
                  ) : (
                    <span
                      className={`size-3 shrink-0 rounded-full ring-1 ring-black/10 ${COLOR_DOT_CLASS[category.color]}`}
                      aria-hidden
                    />
                  )}

                  <span className="flex-1 font-medium">{category.name}</span>

                  <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                    {category.subcategories.length === 0
                      ? "sem subcategorias"
                      : `${category.subcategories.length} subcategoria${category.subcategories.length !== 1 ? "s" : ""}`}
                  </span>

                  <DropdownMenu>
                    <DropdownMenuTrigger
                      aria-label="Ações da categoria"
                      className="hover:bg-muted aria-expanded:bg-muted focus-visible:ring-ring/50 inline-flex size-7 shrink-0 items-center justify-center rounded-md transition-colors focus-visible:ring-3 focus-visible:outline-none"
                    >
                      <MoreHorizontal aria-hidden className="size-3.5" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onSelect={() => setDialog({ kind: "edit-category", category })}
                      >
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        variant="destructive"
                        onSelect={() => setPendingDelete({ kind: "category", item: category })}
                      >
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {isOpen && (
                  <div className="border-t">
                    {category.subcategories.map((sub) => (
                      <div
                        key={sub.id}
                        className="border-border flex items-center gap-3 border-b px-4 py-2.5 last:border-b-0"
                      >
                        <span className="w-4 shrink-0" aria-hidden />
                        <ChevronRight
                          className="text-muted-foreground/40 size-3 shrink-0"
                          aria-hidden
                        />
                        <span className="flex-1 text-sm">{sub.name}</span>
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            aria-label="Ações da subcategoria"
                            className="hover:bg-muted aria-expanded:bg-muted focus-visible:ring-ring/50 inline-flex size-7 shrink-0 items-center justify-center rounded-md transition-colors focus-visible:ring-3 focus-visible:outline-none"
                          >
                            <MoreHorizontal aria-hidden className="size-3.5" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onSelect={() =>
                                setDialog({
                                  kind: "edit-subcategory",
                                  subcategory: sub,
                                  categoryId: category.id,
                                })
                              }
                            >
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              variant="destructive"
                              onSelect={() => setPendingDelete({ kind: "subcategory", item: sub })}
                            >
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    ))}

                    <div className="px-4 py-2.5">
                      <button
                        type="button"
                        onClick={() =>
                          setDialog({
                            kind: "new-subcategory",
                            categoryId: category.id,
                            categoryName: category.name,
                          })
                        }
                        className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-xs transition-colors"
                      >
                        <Plus className="size-3" aria-hidden />
                        Adicionar subcategoria
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
              {dialog.kind === "edit-category" ? "Editar categoria" : "Nova categoria"}
            </DialogTitle>
            <DialogDescription>
              {dialog.kind === "edit-category"
                ? "Atualize os dados da categoria."
                : "Crie uma nova categoria para classificar despesas."}
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
              {dialog.kind === "edit-subcategory" ? "Editar subcategoria" : "Nova subcategoria"}
            </DialogTitle>
            <DialogDescription>
              {dialog.kind === "new-subcategory"
                ? `Em: ${dialog.categoryName}`
                : "Atualize o nome da subcategoria."}
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
              {pendingDelete?.kind === "category" ? "Excluir categoria?" : "Excluir subcategoria?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete?.kind === "category"
                ? `A categoria "${pendingDelete.item.name}" será removida permanentemente.`
                : pendingDelete?.kind === "subcategory"
                  ? `A subcategoria "${pendingDelete.item.name}" será removida.`
                  : null}{" "}
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting}
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
            >
              {isDeleting ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="border-border bg-card flex flex-col items-center gap-4 rounded-lg border border-dashed px-6 py-16 text-center">
      <Tags className="text-muted-foreground/60 size-10" strokeWidth={1} aria-hidden />
      <div className="flex max-w-sm flex-col gap-1">
        <h2 className="text-base font-medium">Nenhuma categoria ainda</h2>
        <p className="text-muted-foreground text-sm">
          Crie categorias para classificar suas despesas.
        </p>
      </div>
      <Button onClick={onAdd} size="sm">
        <Plus aria-hidden className="size-4" /> Nova categoria
      </Button>
    </div>
  );
}
