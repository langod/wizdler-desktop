import { useEffect, useCallback } from "react";

type ModKey = "metaKey" | "ctrlKey";

function getModKey(): ModKey {
  const platform = navigator.platform || navigator.userAgent;
  return /Mac|iPod|iPhone|iPad/.test(platform) ? "metaKey" : "ctrlKey";
}

function hasOnlyModifier(e: KeyboardEvent, mod: ModKey, options?: { shift?: boolean }) {
  const shift = options?.shift ?? false;
  return e[mod] && e.shiftKey === shift && !e.altKey;
}

interface ShortcutOptions {
  onGo?: () => void;
  onBack?: () => void;
  onFocusUrl?: () => void;
  onToggleTheme?: () => void;
  onToggleHeaders?: () => void;
  onTabPrev?: () => void;
  onTabNext?: () => void;
}

export default function useKeyboardShortcuts({
  onGo,
  onBack,
  onFocusUrl,
  onToggleTheme,
  onToggleHeaders,
  onTabPrev,
  onTabNext,
}: ShortcutOptions) {
  const handler = useCallback(
    (e: KeyboardEvent) => {
      const mod = getModKey();

      if (e.key === "Escape" && onBack && !e[mod] && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        onBack();
        return;
      }

      if (!e[mod]) return;

      switch (e.key.toLowerCase()) {
        case "enter":
          if (hasOnlyModifier(e, mod) && onGo) {
            e.preventDefault();
            onGo();
          }
          break;

        case "l":
          if (hasOnlyModifier(e, mod) && onFocusUrl) {
            e.preventDefault();
            onFocusUrl();
          }
          break;

        case "t":
          if (hasOnlyModifier(e, mod, { shift: true }) && onToggleTheme) {
            e.preventDefault();
            onToggleTheme();
          }
          break;

        case "h":
          if (hasOnlyModifier(e, mod, { shift: true }) && onToggleHeaders) {
            e.preventDefault();
            onToggleHeaders();
          }
          break;

        case "[":
          if (hasOnlyModifier(e, mod, { shift: true }) && onTabPrev) {
            e.preventDefault();
            onTabPrev();
          }
          break;

        case "]":
          if (hasOnlyModifier(e, mod, { shift: true }) && onTabNext) {
            e.preventDefault();
            onTabNext();
          }
          break;
      }
    },
    [onGo, onBack, onFocusUrl, onToggleTheme, onToggleHeaders, onTabPrev, onTabNext]
  );

  useEffect(() => {
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [handler]);
}
