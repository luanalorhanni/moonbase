import { getCategoryIcon } from "@/lib/category-icons";
import { cn } from "@/lib/utils";

type Props = {
  icon: string | null | undefined;
  color?: string | null;
  size?: number;
  className?: string;
};

/**
 * Renders the lucide icon for a category. Falls back to the raw `icon`
 * string (legacy emoji) when the value is not a known lucide name.
 * Returns null when no icon is set.
 */
export function CategoryIcon({ icon, color, size = 14, className }: Props) {
  if (!icon) return null;
  const Icon = getCategoryIcon(icon);
  if (!Icon) {
    return (
      <span
        aria-hidden
        className={cn("inline-flex shrink-0 items-center text-[14px] leading-none", className)}
        style={{ width: size, height: size }}
      >
        {icon}
      </span>
    );
  }
  return (
    <Icon
      aria-hidden
      strokeWidth={1.7}
      className={cn("shrink-0", className)}
      style={{
        width: size,
        height: size,
        color: color ?? "currentColor",
      }}
    />
  );
}
