import type { WsdlData, OperationContext } from "../lib/types";
import TreeItem from "./TreeItem";

function GlobeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

function PlugIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22v-5" />
      <path d="M9 8V2" />
      <path d="M15 8V2" />
      <path d="M18 8v5a6 6 0 0 1-12 0V8" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="6 3 20 12 6 21 6 3" />
    </svg>
  );
}

interface WsdlTreeProps {
  wsdl: WsdlData;
  operations: OperationContext[];
  onDownloadWsdl: (serviceName: string) => void;
  onOpenOperation: (ctx: OperationContext) => void;
}

export default function WsdlTree({ wsdl, operations, onDownloadWsdl, onOpenOperation }: WsdlTreeProps) {
  const serviceOpMap = new Map<string, OperationContext[]>();

  for (const op of operations) {
    const key = op.service.name.full;
    if (!serviceOpMap.has(key)) serviceOpMap.set(key, []);
    serviceOpMap.get(key)!.push(op);
  }

  return (
    <div className="overflow-y-auto bg-white transition-colors dark:bg-[#1a1b1e]">
      <ul>
        {wsdl.services.map((service) => {
          const serviceOps = serviceOpMap.get(service.name.full) ?? [];
          const portMap = new Map<string, OperationContext[]>();

          for (const op of serviceOps) {
            const portKey = op.port.name.full;
            if (!portMap.has(portKey)) portMap.set(portKey, []);
            portMap.get(portKey)!.push(op);
          }

          return (
            <TreeItem
              key={service.name.full}
              label={service.name.local}
              icon={<GlobeIcon />}
              title={service.description}
              onClick={() => onDownloadWsdl(service.name.local)}
            >
              {service.ports.map((port) => {
                const portOps = portMap.get(port.name.full) ?? [];
                return (
                  <TreeItem
                    key={port.name.full}
                    label={port.name.local}
                    icon={<PlugIcon />}
                    title={port.description}
                  >
                    {portOps.map((ctx) => (
                      <TreeItem
                        key={ctx.operation.name.full}
                        label={ctx.operation.name.local}
                      icon={<PlayIcon />}
                        title={ctx.operation.description}
                        onClick={() => onOpenOperation(ctx)}
                      />
                    ))}
                  </TreeItem>
                );
              })}
            </TreeItem>
          );
        })}
      </ul>
    </div>
  );
}
