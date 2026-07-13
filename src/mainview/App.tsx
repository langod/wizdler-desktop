import { useCallback, useEffect, useRef, useState } from "react";
import type { OperationContext, SavedRequest, WsdlData } from "./lib/types";
import { parseWsdl, getOperations } from "./lib/wsdl";
import { fetchUrl } from "./lib/fetch";
import { getAllRequests, saveRequest } from "./lib/db";
import useKeyboardShortcuts from "./lib/useKeyboardShortcuts";
import UrlBar from "./components/UrlBar";
import WsdlTree from "./components/WsdlTree";
import SoapEditor from "./components/SoapEditor";
import Sidebar from "./components/Sidebar";

type Screen =
  | { name: "loading" }
  | { name: "tree"; wsdl: WsdlData; operations: OperationContext[] }
  | { name: "editor"; ctx: OperationContext; initialValues?: Pick<SavedRequest, "method" | "requestUrl" | "headers" | "requestBody"> }
  | { name: "error"; message: string };

export default function App() {
  const [lastUrl, setLastUrl] = useState("");
  const [screen, setScreen] = useState<Screen | null>(null);
  const [sidebarRefreshTrigger, setSidebarRefreshTrigger] = useState(0);
  const [lastLoadedWsdl, setLastLoadedWsdl] = useState<{ url: string; wsdl: WsdlData; operations: OperationContext[] } | null>(null);
  const urlInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getAllRequests().then((requests) => {
      if (requests.length > 0) {
        handleSelectSavedRequest(requests[0]);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      setLastLoadedWsdl({ url, wsdl, operations });
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

  const handleSaveRequest = useCallback(async (data: Omit<SavedRequest, "id" | "createdAt">) => {
    await saveRequest({ ...data, createdAt: Date.now() });
    setSidebarRefreshTrigger((n) => n + 1);
  }, []);

  const handleSelectSavedRequest = useCallback(async (req: SavedRequest) => {
    let wsdl: WsdlData;
    let operations: OperationContext[];

    if (lastLoadedWsdl?.url === req.wsdlUrl) {
      wsdl = lastLoadedWsdl.wsdl;
      operations = lastLoadedWsdl.operations;
    } else {
      setScreen({ name: "loading" });
      try {
        const text = await fetchUrl(req.wsdlUrl);
        wsdl = await parseWsdl(req.wsdlUrl, text);
        operations = getOperations(wsdl);
        setLastUrl(req.wsdlUrl);
        setLastLoadedWsdl({ url: req.wsdlUrl, wsdl, operations });
      } catch {
        setScreen({ name: "error", message: "Failed to reload WSDL for saved request" });
        return;
      }
    }

    const ctx = operations.find(
      (op) =>
        op.service.name.local === req.serviceName &&
        op.portTypeOperation.name.local === req.operationName
    );

    if (!ctx) {
      setScreen({
        name: "error",
        message: `Operation "${req.serviceName} / ${req.operationName}" not found in WSDL`,
      });
      return;
    }

    setScreen({
      name: "editor",
      ctx,
      initialValues: {
        method: req.method,
        requestUrl: req.requestUrl,
        headers: req.headers,
        requestBody: req.requestBody,
      },
    });
  }, [lastLoadedWsdl, setLastUrl]);

  return (
    <div className="flex h-screen flex-col bg-white text-gray-900 transition-colors dark:bg-[#1a1b1e] dark:text-gray-100">
      <UrlBar ref={urlInputRef} onLoad={handleLoad} loading={screen?.name === "loading"} initialUrl={lastUrl} />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          refreshTrigger={sidebarRefreshTrigger}
          onSelectRequest={handleSelectSavedRequest}
        />

        <div className="flex flex-1 flex-col overflow-hidden">
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
              initialValues={screen.initialValues}
              onSave={handleSaveRequest}
            />
          )}
        </div>
      </div>
    </div>
  );
}
