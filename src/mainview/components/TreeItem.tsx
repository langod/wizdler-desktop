import { useState, type ReactNode } from "react";

interface TreeItemProps {
  label: ReactNode;
  icon?: ReactNode;
  children?: ReactNode;
  title?: string;
  onClick?: () => void;
  defaultExpanded?: boolean;
}

export default function TreeItem({ label, icon, children, title, onClick, defaultExpanded }: TreeItemProps) {
  const [expanded, setExpanded] = useState(defaultExpanded ?? true);
  const hasChildren = !!children;

  const handleToggle = () => {
    if (hasChildren) setExpanded((v) => !v);
  };

  return (
    <li className="w-full" title={title}>
      <span
        className={`flex w-full items-center gap-1.5 py-1.5 pl-3 pr-1 text-base transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 ${hasChildren || onClick ? "cursor-pointer" : "cursor-default"} ${hasChildren ? "" : "pl-8"}`}
        onClick={hasChildren ? handleToggle : onClick}
      >
        {hasChildren && (
          <svg
            className={`h-4 w-4 flex-shrink-0 text-gray-500 transition-transform dark:text-gray-400 ${expanded ? "rotate-0" : "-rotate-90"}`}
            viewBox="0 0 10 10"
          >
            <path d="M0 0 L0 8 L7 4 Z" fill="currentColor" />
          </svg>
        )}
        {icon && <span className="h-5 w-5 flex-shrink-0 text-gray-500 dark:text-gray-400">{icon}</span>}
        {onClick ? (
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onClick();
            }}
            className="text-blue-600 transition-colors hover:text-blue-800 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
          >
            {label}
          </a>
        ) : (
          <span className="text-gray-800 transition-colors dark:text-gray-200">{label}</span>
        )}
      </span>
      {hasChildren && expanded && <ul className="ml-4">{children}</ul>}
    </li>
  );
}
