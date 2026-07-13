import { forwardRef, type FormEvent, useState, type Ref } from "react";
import { useTheme } from "../lib/ThemeProvider";

interface UrlBarProps {
  onLoad: (url: string) => void;
  loading: boolean;
  initialUrl?: string;
  history?: string[];
}

function UrlBarInner({ onLoad, loading, initialUrl, history }: UrlBarProps, ref: Ref<HTMLInputElement>) {
  const [url, setUrl] = useState(initialUrl ?? "");
  const { theme, toggleTheme } = useTheme();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (url.trim()) onLoad(url.trim());
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-center gap-2 border-b border-gray-200 bg-gray-100 px-2 py-1 transition-colors dark:border-gray-700 dark:bg-gray-800"
    >
      <input
        ref={ref}
        type="text"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="Enter WSDL URL..."
        list="wsdl-history"
        className="flex-1 rounded border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900 transition-colors placeholder:text-gray-400 focus:border-blue-400 focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:border-blue-500"
      />
      <datalist id="wsdl-history">
        {history?.map((u) => (
          <option key={u} value={u} />
        ))}
      </datalist>
      <button
        type="submit"
        disabled={loading || !url.trim()}
        className="rounded bg-blue-500 px-3 py-1 text-sm text-white transition-colors hover:bg-blue-600 disabled:opacity-50 dark:bg-blue-600 dark:hover:bg-blue-500"
      >
        {loading ? "Loading..." : "Go"}
      </button>
      <button
        type="button"
        onClick={toggleTheme}
        title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
        className="rounded p-1.5 text-gray-500 transition-colors hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700"
      >
        {theme === "dark" ? (
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"
              clipRule="evenodd"
            />
          </svg>
        ) : (
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
          </svg>
        )}
      </button>
    </form>
  );
}

const UrlBar = forwardRef(UrlBarInner);
export default UrlBar;
