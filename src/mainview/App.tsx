import { useCallback, useRef, useState } from "react";
import type { OperationContext, WsdlData } from "./lib/types";
import { parseWsdl, getOperations } from "./lib/wsdl";
import { fetchUrl } from "./lib/fetch";
import { useLocalStorage } from "./lib/useLocalStorage";
import useKeyboardShortcuts from "./lib/useKeyboardShortcuts";
import UrlBar from "./components/UrlBar";
import WsdlTree from "./components/WsdlTree";
import SoapEditor from "./components/SoapEditor";

type Screen =
  | { name: "loading" }
  | { name: "tree"; wsdl: WsdlData; operations: OperationContext[] }
  | { name: "editor"; ctx: OperationContext }
  | { name: "error"; message: string };

export default function App() {
  const [lastUrl, setLastUrl] = useLocalStorage("wizdler_lastUrl", "");
  const [screen, setScreen] = useState<Screen | null>(null);
  const urlInputRef = useRef<HTMLInputElement>(null);

  useKeyboardShortcuts({
    onFocusUrl: () => urlInputRef.current?.focus(),
    onBack: screen?.name === "editor"
      ? () => {
          const ed = screen as { name: "editor"; ctx: OperationContext };
          setScreen({ name: "tree", wsdl: ed.ctx.wsdl, operations: getOperations(ed.ctx.wsdl) });
        }
      : undefined,
  });

  const handleLoad = useCallback(async (url: string) => {
    setScreen({ name: "loading" });

    try {
      const text = await fetchUrl(url);

      const wsdl = await parseWsdl(url, text);
      const operations = getOperations(wsdl);

      setLastUrl(url);
      setScreen({ name: "tree", wsdl, operations });
    } catch (err: unknown) {
      setScreen({ name: "error", message: (err as Error).message });
    }
  }, [setLastUrl]);

  const handleDownloadWsdl = useCallback(async (_serviceName: string) => {
    // TODO: implement ZIP download using jszip
    // For now, this is a placeholder
  }, []);

  const handleOpenOperation = useCallback((ctx: OperationContext) => {
    setScreen({ name: "editor", ctx });
  }, []);

  return (
    <div className="flex h-screen flex-col bg-white text-gray-900 transition-colors dark:bg-[#1a1b1e] dark:text-gray-100">
      <UrlBar ref={urlInputRef} onLoad={handleLoad} loading={screen?.name === "loading"} initialUrl={lastUrl} />

      <div className="flex-1 overflow-hidden">
        {screen === null && (
          <div className="flex h-full items-center justify-center text-gray-400 dark:text-gray-500">
            Enter a WSDL URL above to get started
          </div>
        )}

        {screen?.name === "loading" && (
          <div className="flex h-full items-center justify-center text-gray-500 dark:text-gray-400">
            Loading WSDL...
          </div>
        )}

        {screen?.name === "error" && (
          <div className="flex h-full items-center justify-center">
            <div className="text-red-500 dark:text-red-400">{screen.message}</div>
          </div>
        )}

        {screen?.name === "tree" && (
          <WsdlTree
            wsdl={screen.wsdl}
            operations={screen.operations}
            onDownloadWsdl={handleDownloadWsdl}
            onOpenOperation={handleOpenOperation}
          />
        )}

        {screen?.name === "editor" && (
          <SoapEditor
            ctx={screen.ctx}
            onBack={() => setScreen({ name: "tree", wsdl: screen.ctx.wsdl, operations: getOperations(screen.ctx.wsdl) })}
          />
        )}
      </div>
    </div>
  );
}
