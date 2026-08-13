import { ApplicationMenu, BrowserWindow, Updater } from "electrobun/bun";
import { defineElectrobunRPC } from "electrobun/bun";

const DEV_SERVER_PORT = 5173;
const DEV_SERVER_URL = `http://localhost:${DEV_SERVER_PORT}`;

async function getMainViewUrl(): Promise<string> {
	const channel = await Updater.localInfo.channel();
	if (channel === "dev") {
		try {
			await fetch(DEV_SERVER_URL, { method: "HEAD" });
			console.log(`HMR enabled: Using Vite dev server at ${DEV_SERVER_URL}`);
			return DEV_SERVER_URL;
		} catch {
			console.log("Vite dev server not running. Run 'bun run dev:hmr' for HMR support.");
		}
	}
	return "views://mainview/index.html";
}

const url = await getMainViewUrl();

const PRIMARY_MODIFIER = "CommandOrControl";
const isMac = process.platform === "darwin";

ApplicationMenu.setApplicationMenu([
  ...(isMac
    ? [
        {
          label: "Wizdler Desktop",
          submenu: [
            { role: "hide", accelerator: "Command+H" },
            { role: "hideOthers", accelerator: "Command+Alt+H" },
            { role: "showAll" },
            { type: "separator" },
            { role: "quit", accelerator: `${PRIMARY_MODIFIER}+Q` },
          ],
        },
      ]
    : []),
  {
    label: "File",
    submenu: [
      { role: "close", accelerator: `${PRIMARY_MODIFIER}+W` },
      ...(!isMac
        ? [
            { type: "separator" as const },
            { role: "quit", accelerator: `${PRIMARY_MODIFIER}+Q` },
          ]
        : []),
    ],
  },
  {
    label: "Edit",
    submenu: [
      { role: "undo", accelerator: `${PRIMARY_MODIFIER}+Z` },
      { role: "redo", accelerator: isMac ? "Command+Shift+Z" : "Ctrl+Y" },
      { type: "separator" },
      { role: "cut", accelerator: `${PRIMARY_MODIFIER}+X` },
      { role: "copy", accelerator: `${PRIMARY_MODIFIER}+C` },
      { role: "paste", accelerator: `${PRIMARY_MODIFIER}+V` },
      { role: "pasteAndMatchStyle", accelerator: `${PRIMARY_MODIFIER}+Shift+V` },
      { role: "delete" },
      { type: "separator" },
      { role: "selectAll", accelerator: `${PRIMARY_MODIFIER}+A` },
    ],
  },
  {
    label: "View",
    submenu: [
      { role: "toggleFullScreen", accelerator: isMac ? "Command+Ctrl+F" : "F11" },
    ],
  },
  {
    label: "Window",
    submenu: [
      { role: "minimize", accelerator: `${PRIMARY_MODIFIER}+M` },
      { role: "zoom" },
    ],
  },
]);

type FetchParams = {
	url: string;
	method?: string;
	body?: string;
	headers?: Record<string, string>;
};

type WizdlerRPCSchema = {
	bun: {
		requests: {
			fetchUrl: { params: FetchParams; response: { text: string; ok: boolean } };
		};
		messages: {};
	};
	webview: {
		requests: {};
		messages: {};
	};
};

const rpc = defineElectrobunRPC<WizdlerRPCSchema, "bun">("bun", {
	handlers: {
		requests: {
			fetchUrl: async (params) => {
				const { url: targetUrl, method, body, headers } = params;
				const init: RequestInit = {};
				if (method) init.method = method;
				if (body) init.body = body;
				if (headers) init.headers = headers;
				try {
					const res = await fetch(targetUrl, init);
					return { text: await res.text(), ok: res.ok };
				} catch (err: unknown) {
					return { text: (err as Error).message, ok: false };
				}
			},
		},
	},
});

const win = new BrowserWindow({
	title: "Wizdler Desktop",
	url,
	frame: {
		width: 1000,
		height: 750,
		x: 200,
		y: 100,
	},
	rpc,
});

win.maximize();

console.log("Wizdler Desktop started!");
