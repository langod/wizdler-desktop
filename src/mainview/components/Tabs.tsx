import type { ReactNode } from "react";

interface Tab {
  id: string;
  label: string;
  content: ReactNode;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (id: string) => void;
  status?: string;
}

export default function Tabs({ tabs, activeTab, onTabChange, status }: TabsProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="relative flex-1">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={`absolute inset-0 ${tab.id === activeTab ? "block" : "hidden"}`}
          >
            {tab.content}
          </div>
        ))}
      </div>
      <div className="flex items-center border-t border-gray-200 bg-gray-50 text-sm transition-colors dark:border-gray-700 dark:bg-gray-800">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`border-r border-gray-200 px-4 py-2 transition-colors dark:border-gray-700 ${
              tab.id === activeTab
                ? "bg-white font-medium text-gray-900 dark:bg-[#1a1b1e] dark:text-gray-100"
                : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
        {status && <span className="ml-auto px-3 text-gray-400 dark:text-gray-500">{status}</span>}
      </div>
    </div>
  );
}
