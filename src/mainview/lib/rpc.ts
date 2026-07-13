let requestId = 0;
const pending = new Map<string, { resolve: (v: unknown) => void; reject: (e: unknown) => void }>();

function getBridge(): { postMessage: (msg: string) => void } | undefined {
  return (window as any).__electrobunBunBridge;
}

function setupResponseHandler(): void {
  const w = window as any;
  const orig = w.__electrobun?.receiveMessageFromBun;
  w.__electrobun = w.__electrobun || {};
  w.__electrobun.receiveMessageFromBun = (msg: unknown) => {
    const data = typeof msg === "string" ? JSON.parse(msg) : msg;
    if (data?.type === "response" && data.id) {
      const p = pending.get(data.id);
      if (p) {
        pending.delete(data.id);
        if (data.success) p.resolve(data.payload);
        else p.reject(new Error(data.error || String(data.payload)));
      }
    }
    if (typeof orig === "function") orig(msg);
  };
}

export async function rpcRequest(method: string, params: unknown): Promise<unknown> {
  const bridge = getBridge();
  if (!bridge) {
    throw new Error("Bun bridge not available (not running in Electrobun desktop)");
  }

  setupResponseHandler();

  const id = `req_${++requestId}_${Date.now()}`;
  const webviewId = (window as any).__electrobunWebviewId ?? 0;

  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    bridge.postMessage(JSON.stringify({
      type: "request",
      method,
      id,
      params,
      hostWebviewId: webviewId,
    }));
    setTimeout(() => {
      if (pending.has(id)) {
        pending.delete(id);
        reject(new Error(`RPC request timeout: ${method}`));
      }
    }, 30000);
  });
}
