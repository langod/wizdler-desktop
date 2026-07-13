import { useEffect, useCallback } from "react";

type ModKey = "metaKey" | "ctrlKey";

function getModKey(): ModKey {
  return /Mac|iPod|iPhone|iPad/.test(navigator.platform) ? "metaKey" : "ctrlKey";
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
          if (onGo) {
            e.preventDefault();
            onGo();
          }
          break;

        case "l":
          if (!e.shiftKey && onFocusUrl) {
            e.preventDefault();
            onFocusUrl();
          }
          break;

        case "t":
          if (e.shiftKey && onToggleTheme) {
            e.preventDefault();
            onToggleTheme();
          }
          break;

        case "h":
          if (e.shiftKey && onToggleHeaders) {
            e.preventDefault();
            onToggleHeaders();
          }
          break;

        case "[":
          if (e.shiftKey && onTabPrev) {
            e.preventDefault();
            onTabPrev();
          }
          break;

        case "]":
          if (e.shiftKey && onTabNext) {
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
