import { useCallback, useEffect, useState } from "react";
import type { SavedRequest } from "../lib/types";
import { getAllRequests, deleteRequest, clearRequests, toggleFavorite } from "../lib/db";

interface SidebarProps {
  refreshTrigger: number;
  onSelectRequest: (req: SavedRequest) => void;
}

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function sortRequests(requests: SavedRequest[]): SavedRequest[] {
  return [...requests].sort((a, b) => {
    if (a.favorited && !b.favorited) return -1;
    if (!a.favorited && b.favorited) return 1;
    return b.createdAt - a.createdAt;
  });
}

export default function Sidebar({ refreshTrigger, onSelectRequest }: SidebarProps) {
  const [requests, setRequests] = useState<SavedRequest[]>([]);

  useEffect(() => {
    getAllRequests().then((r) => setRequests(sortRequests(r)));
  }, [refreshTrigger]);

  const handleDelete = useCallback(async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    await deleteRequest(id);
    setRequests((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const handleToggleFavorite = useCallback(async (e: React.MouseEvent, req: SavedRequest) => {
    e.stopPropagation();
    const updated = await toggleFavorite(req.id!);
    if (updated) {
      setRequests((prev) => {
        if (!updated.favorited) {
          return sortRequests(prev.filter((r) => r.id !== updated.id));
        }
        return sortRequests(prev.map((r) => (r.id === updated.id ? updated : r)));
      });
    }
  }, []);

  const handleClear = useCallback(async () => {
    await clearRequests();
    setRequests([]);
  }, []);

  return (
    <div className="flex w-64 flex-shrink-0 flex-col border-r border-gray-200 bg-gray-50 transition-colors dark:border-gray-700 dark:bg-[#151618]">
      <div className="flex items-center justify-between border-b border-gray-200 px-3 py-2 dark:border-gray-700">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">History</span>
        {requests.length > 0 && (
          <button
            onClick={handleClear}
            className="text-xs text-gray-400 transition-colors hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400"
          >
            Clear all
          </button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto">
        {requests.length === 0 && (
          <div className="px-3 py-6 text-center text-xs text-gray-400 dark:text-gray-500">
            No saved requests yet
          </div>
        )}
        {requests.map((req) => (
          <div
            key={req.id!}
            className={`group relative border-b border-gray-100 dark:border-gray-800 ${req.favorited ? "bg-amber-50/50 dark:bg-amber-900/10" : ""}`}
          >
            <button
              onClick={() => onSelectRequest(req)}
              className="w-full px-3 py-2 pr-8 text-left text-xs transition-colors hover:bg-gray-100 dark:hover:bg-[#1e1f22]"
            >
              <div className="flex items-start justify-between gap-1">
                <span className="flex-1 truncate font-medium text-gray-800 dark:text-gray-200">
                  {req.serviceName}
                </span>
                <span className="flex-shrink-0 text-[10px] text-gray-400 dark:text-gray-500">
                  {relativeTime(req.createdAt)}
                </span>
              </div>
              <div className="mt-0.5 flex items-center gap-1">
                <span
                  className={`flex-shrink-0 rounded px-1 font-mono text-[10px] ${
                    req.method === "POST"
                      ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400"
                      : "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400"
                  }`}
                >
                  {req.method}
                </span>
                <span className="truncate text-gray-400 dark:text-gray-500">
                  {req.operationName}
                </span>
              </div>
              <div className="mt-0.5 truncate text-[10px] text-gray-400 dark:text-gray-500">
                {req.requestUrl}
              </div>
            </button>
            <div className="absolute right-1 top-2 flex gap-0.5">
              {req.favorited ? (
                <button
                  onClick={(e) => handleToggleFavorite(e, req)}
                  className="rounded px-1 text-amber-500 transition-colors hover:bg-amber-100 hover:text-amber-600 dark:hover:bg-amber-900/30"
                  title="Unfavorite (deletes request)"
                >
                  &#9733;
                </button>
              ) : (
                <>
                  <button
                    onClick={(e) => handleToggleFavorite(e, req)}
                    className="hidden rounded px-1 text-gray-400 transition-colors hover:text-amber-500 group-hover:block dark:hover:text-amber-400"
                    title="Favorite"
                  >
                    &#9734;
                  </button>
                  <button
                    onClick={(e) => handleDelete(e, req.id!)}
                    className="hidden rounded px-1 text-gray-400 transition-colors hover:bg-red-100 hover:text-red-500 group-hover:block dark:hover:bg-red-900/30 dark:hover:text-red-400"
                  >
                    &times;
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
