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

ApplicationMenu.setApplicationMenu([
  {
    submenu: [
      { role: "hide" },
      { role: "hideOthers" },
      { role: "showAll" },
      { type: "separator" },
      { role: "quit" },
    ],
  },
  {
    label: "File",
    submenu: [{ role: "close" }],
  },
  {
    label: "Edit",
    submenu: [
      { role: "undo" },
      { role: "redo" },
      { type: "separator" },
      { role: "cut" },
      { role: "copy" },
      { role: "paste" },
      { role: "pasteAndMatchStyle" },
      { role: "delete" },
      { type: "separator" },
      { role: "selectAll" },
    ],
  },
  {
    label: "View",
    submenu: [{ role: "toggleFullScreen" }],
  },
  {
    label: "Window",
    submenu: [{ role: "minimize" }, { role: "zoom" }],
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
