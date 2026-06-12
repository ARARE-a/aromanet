import { cn } from "@/lib/utils";

interface StoryRingProps {
  hasStory: boolean;
  size?: "sm" | "md" | "lg";
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

const sizeMap = {
  sm: { ring: "p-[2px]", gap: "p-[1.5px]" },
  md: { ring: "p-[2.5px]", gap: "p-[2px]" },
  lg: { ring: "p-[3px]", gap: "p-[2.5px]" },
};

export function StoryRing({ hasStory, size = "md", children, onClick, className }: StoryRingProps) {
  const { ring, gap } = sizeMap[size];

  return (
    <div
      className={cn(
        "rounded-full flex-shrink-0 cursor-pointer",
        ring,
        hasStory
          ? "bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600"
          : "bg-gray-200",
        className
      )}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === "Enter" || e.key === " ") onClick(); } : undefined}
    >
      <div className={cn("rounded-full bg-white", gap)}>
        {children}
      </div>
    </div>
  );
}
