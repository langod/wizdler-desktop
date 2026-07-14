# Wizdler Desktop

A desktop version of [Wizdler](https://chromewebstore.google.com/detail/wizdler/oebpmncolmhiapingjaagmapififiakb), the popular Chrome extension for working with SOAP web services. Wizdler Desktop parses WSDL definitions and lets you inspect services, generate sample SOAP requests, and send them to view the responses — all in a standalone desktop app built with [Electrobun](https://blackboard.sh/electrobun/).

## Overview

Wizdler recognizes WSDL definitions and presents the available services and operations in an easy-to-understand tree. Pick an operation to generate a pre-filled SOAP request, edit it, and send it to see the response — without leaving your machine or installing a browser extension.

Try it against a public WSDL such as `http://www.webservicex.com/globalweather.asmx?WSDL`.

## Features

- View WSDL information in a comprehensible tree of services, ports, and operations.
- Generate a sample SOAP request for any operation.
- Edit and send the request, then inspect the response with syntax highlighting.
- Remember recent WSDL URLs and previously saved requests.
- Supports custom HTTP headers and authentication when sending requests.

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) (latest)

### Development

Start the Vite dev server (for hot module reload) alongside the Electrobun runtime:

```bash
bun run dev:hmr
```

Or run the app with a one-off build:

```bash
bun run start
```

### Build a distributable

```bash
bun run build:stable
```

The output artifacts are placed in the `build/` directory.

## How It Works

The app is structured as an Electrobun project:

- `src/bun/index.ts` — the main (Bun) process. Owns the `BrowserWindow`, the application menu, and an RPC handler that performs network fetches on behalf of the UI.
- `src/mainview/` — the React + Vite + Tailwind UI. Contains the WSDL tree, SOAP editor, and request/response panes.
- `src/mainview/lib/` — WSDL parsing, SOAP sample generation, request storage, and XML formatting.

When you load a WSDL URL, the UI asks the main process (via `fetchUrl` RPC) to retrieve the document, parses it into a service tree, and lets you generate and send SOAP messages against its operations.

## Credits

This desktop app is a reimplementation of the original Wizdler browser extension by Peter Prikryl. The original project lives at <https://github.com/pepri/wizdler>. Libraries used in this build include:

- [React](https://react.dev) — UI
- [Vite](https://vitejs.dev) + [Tailwind CSS](https://tailwindcss.com) — build and styling
- [Electrobun](https://blackboard.sh/electrobun/) — desktop runtime
- [JSZip](https://stuk.github.io/jszip/) — packaging WSDL/XSD files
- [Prism](https://prismjs.com) / [CodeJar](https://github.com/antonmedv/codejar) — syntax-highlighted editing
- vkBeautify — XML pretty-printing

## Privacy

Wizdler Desktop runs locally and makes no network calls except to the WSDL endpoints you explicitly provide. No data is collected or transmitted elsewhere.


