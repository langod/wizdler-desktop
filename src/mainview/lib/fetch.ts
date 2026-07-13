import { rpcRequest } from "./rpc";

interface RPCResult {
  text: string;
  ok: boolean;
}

function bridgeAvailable(): boolean {
  return !!(window as any).__electrobunBunBridge;
}

export async function fetchUrl(url: string, options?: RequestInit): Promise<string> {
  if (bridgeAvailable()) {
    const result = (await rpcRequest("fetchUrl", { url, method: options?.method, body: options?.body, headers: options?.headers })) as RPCResult;
    if (!result.ok) throw new Error(result.text);
    return result.text;
  }
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  return res.text();
}

export async function fetchUrlWithResponse(url: string, options?: RequestInit): Promise<RPCResult> {
  if (bridgeAvailable()) {
    return (await rpcRequest("fetchUrl", { url, method: options?.method, body: options?.body, headers: options?.headers })) as RPCResult;
  }
  try {
    const res = await fetch(url, options);
    return { text: await res.text(), ok: res.ok };
  } catch (err: unknown) {
    return { text: (err as Error).message, ok: false };
  }
}
