import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import type { OperationContext } from "../lib/types";
import { generateRequest } from "../lib/wsdl";
import { fetchUrlWithResponse } from "../lib/fetch";
import { useLocalStorage } from "../lib/useLocalStorage";
import useKeyboardShortcuts from "../lib/useKeyboardShortcuts";
import Tabs from "./Tabs";
import XmlEditor from "./XmlEditor";
import vkbeautify from "../lib/vkbeautify";

interface SoapEditorProps {
  ctx: OperationContext;
  onBack: () => void;
}

const METHODS = ["POST", "GET", "PUT", "PATCH", "DELETE", "OPTIONS"];

interface HeaderEntry {
  id: number;
  key: string;
  value: string;
}

export default function SoapEditor({ ctx, onBack }: SoapEditorProps) {
  const initialRequest = useMemo(() => generateRequest(ctx), [ctx]);
  const [method, setMethod] = useState(initialRequest.method);
  const [url, setUrl] = useState(initialRequest.url);
  const [requestBody, setRequestBody] = useState(initialRequest.body);
  const [wlHeaders, setWlHeaders] = useLocalStorage<HeaderEntry[]>("wizdler_headers", []);
  const [showHeaders, setShowHeaders] = useState(false);
  const [responseBody, setResponseBody] = useState("");
  const [activeTab, setActiveTab] = useState("request");
  const [status, setStatus] = useState("");
  const urlInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const r = generateRequest(ctx);
    setMethod(r.method);
    setUrl(r.url);
    setRequestBody(r.body);
    setResponseBody("");
    setActiveTab("request");
  }, [ctx]);

  const builtHeaders = useMemo(() => {
    const h: Record<string, string> = {};
    for (const entry of wlHeaders) {
      if (entry.key.trim()) h[entry.key.trim()] = entry.value;
    }
    h["Content-Type"] = "text/xml; charset=utf-8";
    return h;
  }, [wlHeaders]);

  const addHeader = useCallback((key: string, value: string) => {
    setWlHeaders((prev) => {
      const newId = prev.length > 0 ? Math.max(...prev.map((h) => h.id)) + 1 : 1;
      return [...prev, { id: newId, key, value }];
    });
  }, [setWlHeaders]);

  const removeHeader = useCallback((id: number) => {
    setWlHeaders((prev) => prev.filter((h) => h.id !== id));
  }, []);

  const updateHeader = useCallback(
    (id: number, key: string, value: string) => {
      setWlHeaders((prev) =>
        prev.map((h) => (h.id === id ? { ...h, key, value } : h))
      );
    },
    []
  );

  const handleGo = useCallback(
    async (e?: FormEvent) => {
      e?.preventDefault();
      setStatus("Loading...");
      setActiveTab("response");
      setResponseBody("");

      try {
        const { text, ok } = await fetchUrlWithResponse(url, {
          method,
          headers: builtHeaders,
          body: requestBody || undefined,
        });

        let formatted = text;
        try {
          formatted = vkbeautify.xml(text);
        } catch {
          // leave as-is
        }

        setResponseBody(formatted);
        setStatus(ok ? "" : "Error.");
      } catch (err: unknown) {
        setResponseBody("Failed to send request: " + (err as Error).message);
        setStatus("Error.");
      }
    },
    [url, method, builtHeaders, requestBody]
  );

  useKeyboardShortcuts({
    onGo: handleGo,
    onBack,
    onFocusUrl: () => urlInputRef.current?.focus(),
    onToggleHeaders: () => setShowHeaders((v) => !v),
    onTabNext: () => {
      const tabs = ["request", "response"];
      const idx = tabs.indexOf(activeTab);
      if (idx < tabs.length - 1) setActiveTab(tabs[idx + 1]);
    },
    onTabPrev: () => {
      const tabs = ["request", "response"];
      const idx = tabs.indexOf(activeTab);
      if (idx > 0) setActiveTab(tabs[idx - 1]);
    },
  });

  const tabs = [
    {
      id: "request",
      label: "Request",
      content: (
        <XmlEditor
          value={requestBody}
          onChange={setRequestBody}
        />
      ),
    },
    {
      id: "response",
      label: "Response",
      content: (
        <XmlEditor
          value={responseBody}
          readOnly
        />
      ),
    },
  ];

  return (
    <div className="flex h-full flex-col bg-white transition-colors dark:bg-[#1a1b1e]">
      {/* Address bar */}
      <div className="flex flex-wrap items-center gap-1 border-b border-gray-200 bg-gray-100 px-1 py-0.5 transition-colors dark:border-gray-700 dark:bg-gray-800">
        <select
          value={method}
          onChange={(e) => setMethod(e.target.value)}
          className="w-20 rounded border border-gray-300 bg-white px-1 py-1 text-sm text-gray-900 transition-colors dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
        >
          {METHODS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <input
          ref={urlInputRef}
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="min-w-0 flex-1 rounded border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900 transition-colors placeholder:text-gray-400 focus:border-blue-400 focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:border-blue-500"
          spellCheck={false}
        />
        <button
          onClick={handleGo}
          className="rounded bg-blue-500 px-3 py-1 text-sm text-white transition-colors hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-500"
        >
          Go
        </button>
        <button
          onClick={onBack}
          className="rounded px-3 py-1 text-sm text-gray-600 transition-colors hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700"
        >
          &larr; Back
        </button>
        <button
          onClick={() => setShowHeaders((v) => !v)}
          className={`rounded px-2 py-1 text-xs transition-colors ${
            showHeaders || wlHeaders.length > 0
              ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
              : "text-gray-500 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700"
          }`}
        >
          Headers{wlHeaders.length > 0 ? ` (${wlHeaders.length})` : ""}
        </button>
      </div>

      {/* Headers panel */}
      {showHeaders && (
        <div className="border-b border-gray-200 bg-gray-50 px-2 py-1 transition-colors dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-1 flex flex-wrap gap-1">
            <button
              onClick={() =>
                addHeader("Authorization", "Basic " + btoa("user:pass"))
              }
              className="rounded bg-gray-200 px-2 py-0.5 text-xs transition-colors hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
            >
              + Basic Auth
            </button>
            <button
              onClick={() =>
                addHeader("Authorization", "Bearer ")
              }
              className="rounded bg-gray-200 px-2 py-0.5 text-xs transition-colors hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
            >
              + Bearer Token
            </button>
            <button
              onClick={() => addHeader("", "")}
              className="rounded bg-gray-200 px-2 py-0.5 text-xs transition-colors hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
            >
              + Custom
            </button>
          </div>
          <div className="space-y-1">
            {wlHeaders.map((h) => (
              <div key={h.id} className="flex gap-1 text-xs">
                {h.key.startsWith("Authorization") ? (
                  <>
                    {h.key === "Authorization" &&
                    h.value.startsWith("Basic ") ? (
                      <BasicAuthRow
                        value={h.value}
                        onChange={(v) => updateHeader(h.id, h.key, v)}
                      />
                    ) : h.key === "Authorization" &&
                      h.value.startsWith("Bearer ") ? (
                      <BearerTokenRow
                        value={h.value}
                        onChange={(v) => updateHeader(h.id, h.key, v)}
                      />
                    ) : (
                      <>
                        <input
                          value={h.key}
                          onChange={(e) =>
                            updateHeader(h.id, e.target.value, h.value)
                          }
                          className="w-32 rounded border border-gray-300 bg-white px-1 py-0.5 text-gray-900 transition-colors dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
                          placeholder="Key"
                        />
                        <input
                          value={h.value}
                          onChange={(e) =>
                            updateHeader(h.id, h.key, e.target.value)
                          }
                          className="flex-1 rounded border border-gray-300 bg-white px-1 py-0.5 text-gray-900 transition-colors dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
                          placeholder="Value"
                        />
                      </>
                    )}
                  </>
                ) : (
                  <>
                    <input
                      value={h.key}
                      onChange={(e) =>
                        updateHeader(h.id, e.target.value, h.value)
                      }
                      className="w-32 rounded border border-gray-300 bg-white px-1 py-0.5 text-gray-900 transition-colors dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
                      placeholder="Key"
                    />
                    <input
                      value={h.value}
                      onChange={(e) =>
                        updateHeader(h.id, h.key, e.target.value)
                      }
                      className="flex-1 rounded border border-gray-300 bg-white px-1 py-0.5 text-gray-900 transition-colors dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
                      placeholder="Value"
                    />
                  </>
                )}
                <button
                  onClick={() => removeHeader(h.id)}
                  className="rounded px-1 text-red-500 transition-colors hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-900/30"
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Editor area */}
      <div className="relative flex-1">
        <Tabs
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          status={status}
        />
      </div>
    </div>
  );
}

/* ---- Sub-components for auth presets ---- */

function BasicAuthRow({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const prefix = "Basic ";
  const currentEncoded = value.startsWith(prefix) ? value.slice(prefix.length) : "";
  let currentUser = "";
  let currentPass = "";
  try {
    const decoded = atob(currentEncoded);
    const colon = decoded.indexOf(":");
    if (colon >= 0) {
      currentUser = decoded.slice(0, colon);
      currentPass = decoded.slice(colon + 1);
    } else {
      currentUser = decoded;
    }
  } catch {
    // not valid base64
  }

  const update = (u: string, p: string) => {
    onChange(prefix + btoa(u + ":" + p));
  };

  return (
    <>
      <span className="inline-flex items-center gap-1 text-gray-500 dark:text-gray-400">
        Authorization: Basic
      </span>
      <input
        value={currentUser}
        onChange={(e) => update(e.target.value, currentPass)}
        className="w-28 rounded border border-gray-300 bg-white px-1 py-0.5 text-gray-900 transition-colors dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
        placeholder="Username"
      />
      <input
        type="password"
        value={currentPass}
        onChange={(e) => update(currentUser, e.target.value)}
        className="w-28 rounded border border-gray-300 bg-white px-1 py-0.5 text-gray-900 transition-colors dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
        placeholder="Password"
      />
    </>
  );
}

function BearerTokenRow({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const prefix = "Bearer ";
  const token = value.startsWith(prefix) ? value.slice(prefix.length) : "";

  return (
    <>
      <span className="inline-flex items-center gap-1 text-gray-500 dark:text-gray-400">
        Authorization: Bearer
      </span>
      <input
        value={token}
        onChange={(e) => onChange(prefix + e.target.value)}
        className="flex-1 rounded border border-gray-300 bg-white px-1 py-0.5 text-gray-900 transition-colors dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
        placeholder="Token"
      />
    </>
  );
}
