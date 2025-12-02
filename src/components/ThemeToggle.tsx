import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Icons } from "./Icons";

export function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button
        type="button"
        className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background text-muted-foreground transition-colors hover:border-muted hover:text-foreground"
        aria-label="Toggle theme"
      >
        <div className="h-4 w-4" />
      </button>
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-bg text-muted transition-colors hover:border-muted hover:text-text"
      aria-label="Toggle theme"
    >
      <div className="relative h-4 w-4">
        {/* Sun icon */}
        <div
          className={`absolute inset-0 rotate-0 scale-100 transition-all ${
            isDark ? "-rotate-90 scale-0" : ""
          }`}
        >
          <Icons.Sun className="h-4 w-4" />
        </div>
        {/* Moon icon */}
        <div
          className={`absolute inset-0 rotate-90 scale-0 transition-all ${
            isDark ? "rotate-0 scale-100" : ""
          }`}
        >
          <Icons.Moon className="h-4 w-4" />
        </div>
      </div>
    </button>
  );
}

