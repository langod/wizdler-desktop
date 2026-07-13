import vkbeautify from "./vkbeautify";
import { XmlSampleGenerator } from "./xmlSampleGenerator";
import { fetchUrl } from "./fetch";
import type {
  WsdlData,
  Message,
  PortType,
  Binding,
  Service,
  Port,
  BindingOperation,
  QualifiedName,
  SoapIO,
  GeneratedRequest,
  OperationContext,
  WsdlImport,
} from "./types";

const ns = {
  soap: "http://schemas.xmlsoap.org/wsdl/soap/",
  soap12: "http://schemas.xmlsoap.org/wsdl/soap12/",
  soapEnv: "http://schemas.xmlsoap.org/soap/envelope/",
  soap12Env: "http://www.w3.org/2003/05/soap-envelope",
  http: "http://schemas.xmlsoap.org/wsdl/http/",
  wsdl: "http://schemas.xmlsoap.org/wsdl/",
  schema: "http://www.w3.org/2001/XMLSchema",
};

function getDirectory(url: string): string {
  const base = url.substring(0, url.lastIndexOf("/"));
  return base.length ? base : url;
}

function combineURL(baseURL: string, url: string): string {
  if (/^(?:https?|file):\/\/|^\//.test(url)) return url;
  return baseURL + "/" + url.replace(/^\//, "");
}

function getImportCandidates(baseURL: string, location: string): string[] {
  if (/^(?:https?|file):\/\/|^\//.test(location)) return [location];
  const candidates = new Set<string>();
  candidates.add(combineURL(getDirectory(baseURL), location));
  candidates.add(combineURL(baseURL, location));
  return [...candidates];
}

function formatXml(doc: XMLDocument | null): string {
  const text = doc ? new XMLSerializer().serializeToString(doc) : "";
  return vkbeautify.xml(text.replace(/ xmlns="\0"/g, ' xmlns=""'));
}

function resolveNS(node: Node, name: string): QualifiedName {
  const resolver = (node.ownerDocument ?? node as Document).createNSResolver(node);
  const index = name.indexOf(":");
  let nsResolved: string, local: string;
  if (index === -1) {
    nsResolved = (node.ownerDocument?.documentElement ?? (node as Element)).getAttributeNS(null, "targetNamespace") ?? "";
    local = name;
  } else {
    nsResolved = resolver.lookupNamespaceURI(name.substring(0, index)) ?? "";
    local = name.substring(index + 1);
  }
  return { ns: nsResolved, local, full: nsResolved + ":" + local };
}

function attr(element: Element, name: string, nsUri?: string): string {
  if (!element) return "";
  return element.getAttributeNS(nsUri ?? null, name) ?? "";
}

function children(element: Element, nsUri: string, tagName: string): Element[] {
  const result: Element[] = [];
  for (let i = 0, n = element.childNodes.length; i < n; i++) {
    const child = element.childNodes[i];
    if (child.nodeType === 1 && (child as Element).namespaceURI === nsUri && (child as Element).localName === tagName) {
      result.push(child as Element);
    }
  }
  return result;
}

function child(element: Element, nsUri: string, name: string): Element | undefined {
  return children(element, nsUri, name)[0];
}

function generateSoapMessage(ctx: OperationContext, soapVersion: "soap" | "soap12"): XMLDocument {
  const soapNs = ns[soapVersion === "soap" ? "soapEnv" : "soap12Env"];
  const doc = document.implementation.createDocument(soapNs, "Envelope", null);

  const headers = ctx.operation.input?.[soapVersion]?.headers;
  if (headers && headers.length) {
    const hdr = doc.createElementNS(soapNs, "Header");
    doc.documentElement.appendChild(hdr);
    for (let i = 0, n = headers.length; i < n; i++) {
      const message = ctx.wsdl.messages[headers[i].message.full];
      if (message && ctx.wsdl.generator) {
        const gen = ctx.wsdl.generator as XmlSampleGenerator;
        const el = gen.writeXml(message.parts[0].element!).documentElement;
        hdr.appendChild(doc.importNode(el, true));
      }
    }
  }

  const message = ctx.wsdl.messages[ctx.portTypeOperation.input.full];
  const bodyEl = doc.createElementNS(soapNs, "Body");
  doc.documentElement.appendChild(bodyEl);
  const operationBody = ctx.operation.input?.[soapVersion]?.body;
  if (ctx.operation[soapVersion]?.style === "rpc") {
    const wrapper = doc.createElementNS(ctx.operation.name.ns, ctx.operation.name.local);
    bodyEl.appendChild(wrapper);
    for (const part of message.parts) {
      const el = doc.createElementNS(ctx.operation.name.ns, part.name);
      wrapper.appendChild(el);
      el.appendChild(document.createTextNode("[" + part.type?.local + "]"));
    }
  } else {
    if (operationBody && !operationBody.parts) {
      operationBody.parts = message.parts[0]?.name ?? "";
    }
    for (let i = 0, n = message.parts.length; i < n; i++) {
      const part = message.parts[i];
      if (part.name === operationBody?.parts) {
        if (ctx.wsdl.generator && part.element) {
          const gen = ctx.wsdl.generator as XmlSampleGenerator;
          const el = gen.writeXml(part.element).documentElement;
          bodyEl.appendChild(doc.importNode(el, true));
        }
      }
    }
  }

  return doc;
}

export function generateRequest(ctx: OperationContext): GeneratedRequest {
  const request: GeneratedRequest = {
    method: "POST",
    url: "",
    headers: {},
    body: "",
  };

  if (ctx.operation?.input) {
    if (ctx.operation.soap12) {
      request.url = ctx.port.soap12?.address ?? "";
      if (ctx.operation.soap12.hasOwnProperty("action")) {
        request.headers["SOAPAction"] = ctx.operation.soap12.action;
        request.headers["Content-Type"] = "application/soap+xml; charset=\"utf-8\"";
      }
      try {
        request.body = formatXml(generateSoapMessage(ctx, "soap12"));
      } catch (e: unknown) {
        request.body = (e as Error).message;
      }
    } else if (ctx.operation.soap) {
      request.url = ctx.port.soap?.address ?? "";
      if (ctx.operation.soap.hasOwnProperty("action")) {
        request.headers["SOAPAction"] = ctx.operation.soap.action;
        request.headers["Content-Type"] = "text/xml; charset=\"utf-8\"";
      }
      try {
        request.body = formatXml(generateSoapMessage(ctx, "soap"));
      } catch (e: unknown) {
        request.body = (e as Error).message;
      }
    } else if (ctx.operation.http) {
      const httpBinding = ctx.binding.http;
      request.method = httpBinding?.verb ?? "GET";
      const portAddress = ctx.port.http?.address ?? "";
      const opLocation = ctx.operation.http.location ?? "";
      request.url = portAddress + opLocation;
    }
  }

  return request;
}

function parseSoapInputOrOutput(io: Element, soapNs: string): SoapIO {
  const result: SoapIO = {
    body: null,
    headers: [],
  };

  const bodyEl = child(io, soapNs, "body");
  if (bodyEl) {
    result.body = {
      parts: attr(bodyEl, "parts"),
      use: attr(bodyEl, "use"),
      encodingStyle: attr(bodyEl, "encodingStyle"),
      namespace: attr(bodyEl, "namespace"),
    };
  }

  for (const headerEl of children(io, soapNs, "header")) {
    const header = {
      message: resolveNS(headerEl, attr(headerEl, "message")),
      parts: attr(headerEl, "part"),
      use: bodyEl ? attr(bodyEl, "use") : "",
      encodingStyle: bodyEl ? attr(bodyEl, "encodingStyle") : "",
      namespace: bodyEl ? attr(bodyEl, "namespace") : "",
      faults: [] as Array<{ message: string; parts: string; use: string; encodingStyle: string; namespace: string }>,
    };

    for (const faultEl of children(headerEl, soapNs, "headerfault")) {
      header.faults.push({
        message: attr(faultEl, "message"),
        parts: attr(faultEl, "part"),
        use: bodyEl ? attr(bodyEl, "use") : "",
        encodingStyle: bodyEl ? attr(bodyEl, "encodingStyle") : "",
        namespace: bodyEl ? attr(bodyEl, "namespace") : "",
      });
    }
    result.headers.push(header);
  }

  return result;
}

async function resolveImport(baseURL: string, location: string, _ns: string): Promise<WsdlImport> {
  if (!location) throw new Error("Missing location.");
  const candidates = getImportCandidates(baseURL, location);
  let lastError: unknown;
  for (const url of candidates) {
    try {
      const text = await fetchUrl(url);
      return {
        location: url,
        ns: _ns,
        text,
        XML: new DOMParser().parseFromString(text, "text/xml"),
      };
    } catch (err) {
      lastError = err;
    }
  }
  const tried = candidates.join(", ");
  throw new Error(`Failed to load schema import "${location}" from: ${tried}` + (lastError ? ` (${lastError})` : ""));
}

async function resolveImports(baseURL: string, imports: Element[]): Promise<WsdlImport[]> {
  if (!imports.length) return [];
  const resolved: WsdlImport[] = [];
  for (const imp of imports) {
    const loc = imp.getAttributeNS(null, "schemaLocation") ?? "";
    const importNs = imp.getAttributeNS(null, "namespace") ?? "";
    try {
      resolved.push(await resolveImport(baseURL, loc, importNs));
    } catch (err) {
      console.warn("[wizdler] Skipping unresolvable schema import:", (err as Error).message);
    }
  }
  return resolved;
}

class WsdlParser {
  private data: WsdlData;

  constructor(url: string, text: string) {
    this.data = {
      url,
      text,
      targetNamespace: "",
      messages: {},
      portTypes: {},
      bindings: {},
      services: [],
      imports: [],
      resources: {},
      generator: null,
      _parsed: false,
      _loaded: false,
      _XML: null,
    };
    this.data.resources[url] = text;
  }

  getData(): WsdlData {
    return this.data;
  }

  private getXML(): XMLDocument {
    if (!this.data._XML) {
      this.data._XML = new DOMParser().parseFromString(this.data.text, "text/xml");
    }
    return this.data._XML;
  }

  private getSchemas(): Element[] {
    const xml = this.getXML();
    const typesEl = child(xml.documentElement, ns.wsdl, "types");
    return children(typesEl!, ns.schema, "schema");
  }

  private getImportEls(): Element[] {
    const xml = this.getXML();
    const typesEl = child(xml.documentElement, ns.wsdl, "types");
    const schemaEl = child(typesEl!, ns.schema, "schema");
    if (!schemaEl) return [];
    return children(schemaEl, ns.schema, "import");
  }

  async parseWSDL(): Promise<void> {
    if (this.data._parsed) return;
    this.data._parsed = true;

    const xml = this.getXML();
    this.data.targetNamespace = xml.documentElement.getAttributeNS(null, "targetNamespace") ?? "";

    for (const msgEl of children(xml.documentElement, ns.wsdl, "message")) {
      const message: Message = {
        name: resolveNS(msgEl, attr(msgEl, "name")),
        parts: [],
      };
      for (const partEl of children(msgEl, ns.wsdl, "part")) {
        const elementAttr = attr(partEl, "element");
        const typeAttr = attr(partEl, "type");
        message.parts.push({
          name: attr(partEl, "name"),
          element: elementAttr ? resolveNS(partEl, elementAttr) : null,
          type: typeAttr ? resolveNS(partEl, typeAttr) : null,
        });
      }
      this.data.messages[message.name.full] = message;
    }

    for (const ptEl of children(xml.documentElement, ns.wsdl, "portType")) {
      const portType: PortType = {
        name: resolveNS(ptEl, attr(ptEl, "name")),
        operations: {},
      };
      for (const opEl of children(ptEl, ns.wsdl, "operation")) {
        const operation = {
          name: resolveNS(opEl, attr(opEl, "name")),
          description: getDocText(opEl),
          input: resolveNS(opEl, attr(child(opEl, ns.wsdl, "input")!, "message")),
          output: resolveNS(opEl, attr(child(opEl, ns.wsdl, "output")!, "message")),
        };
        portType.operations[operation.name.full] = operation;
      }
      this.data.portTypes[portType.name.full] = portType;
    }

    for (const bEl of children(xml.documentElement, ns.wsdl, "binding")) {
      const binding: Binding = {
        name: resolveNS(bEl, attr(bEl, "name")),
        type: resolveNS(bEl, attr(bEl, "type")),
        description: getDocText(bEl),
        operations: [],
      };

      const soapBinding = child(bEl, ns.soap, "binding");
      if (soapBinding) {
        binding.soap = {
          transport: attr(soapBinding, "transport"),
          style: attr(soapBinding, "style") || "document",
        };
      }

      const soap12Binding = child(bEl, ns.soap12, "binding");
      if (soap12Binding) {
        binding.soap12 = {
          style: attr(soap12Binding, "style") || "document",
        };
      }

      const httpBinding = child(bEl, ns.http, "binding");
      if (httpBinding) {
        binding.http = {
          verb: attr(httpBinding, "verb"),
        };
      }

      for (const opEl of children(bEl, ns.wsdl, "operation")) {
        const op: BindingOperation = {
          name: resolveNS(opEl, attr(opEl, "name")),
          description: getDocText(opEl),
        };

        if (binding.soap) {
          const soapOperation = child(opEl, ns.soap, "operation");
          op.soap = {
            action: attr(soapOperation!, "soapAction"),
            style: attr(soapOperation!, "style") || binding.soap.style,
          };
        }

        if (binding.soap12) {
          const soap12Operation = child(opEl, ns.soap12, "operation");
          op.soap12 = {
            action: attr(soap12Operation!, "soapAction"),
            style: attr(soap12Operation!, "style") || binding.soap12.style,
          };
        }

        if (binding.http) {
          const httpOperation = child(opEl, ns.http, "operation");
          op.http = {
            location: attr(httpOperation!, "location"),
          };
        }

        const inputEl = child(opEl, ns.wsdl, "input");
        if (inputEl) {
          op.input = {};
          if (binding.soap) op.input.soap = parseSoapInputOrOutput(inputEl, ns.soap);
          if (binding.soap12) op.input.soap12 = parseSoapInputOrOutput(inputEl, ns.soap12);
          if (binding.http) op.input.http = { urlEncoded: !!child(inputEl, ns.http, "urlEncoded"), urlReplacement: !!child(inputEl, ns.http, "urlReplacement") };
        }

        const outputEl = child(opEl, ns.wsdl, "output");
        if (outputEl) {
          op.output = {};
          if (binding.soap) op.output.soap = parseSoapInputOrOutput(outputEl, ns.soap);
          if (binding.soap12) op.output.soap12 = parseSoapInputOrOutput(outputEl, ns.soap12);
          if (binding.http) op.output.http = { urlEncoded: !!child(outputEl, ns.http, "urlEncoded"), urlReplacement: !!child(outputEl, ns.http, "urlReplacement") };
        }

        binding.operations.push(op);
      }

      this.data.bindings[binding.name.full] = binding;
    }

    for (const sEl of children(xml.documentElement, ns.wsdl, "service")) {
      const service: Service = {
        name: resolveNS(sEl, attr(sEl, "name")),
        description: getDocText(sEl),
        ports: [],
      };

      for (const pEl of children(sEl, ns.wsdl, "port")) {
        const port: Port = {
          name: resolveNS(pEl, attr(pEl, "name")),
          description: getDocText(pEl),
          binding: resolveNS(pEl, attr(pEl, "binding")),
        };

        const binding = this.data.bindings[port.binding.full];
        if (binding) {
          if (binding.soap) {
            port.soap = { address: attr(child(pEl, ns.soap, "address")!, "location") };
          }
          if (binding.soap12) {
            port.soap12 = { address: attr(child(pEl, ns.soap12, "address")!, "location") };
          }
          if (binding.http) {
            port.http = { address: attr(child(pEl, ns.http, "address")!, "location") };
          }
        }

        service.ports.push(port);
      }

      this.data.services.push(service);
    }
  }

  async parseSchema(url: string): Promise<void> {
    if (this.data._loaded) return;
    this.data._loaded = true;

    const schemas = this.getSchemas();
    const importEls = this.getImportEls();

    if (importEls.length > 0) {
      const resolved = await resolveImports(getDirectory(url), importEls);
      for (const imp of resolved) {
        this.data.imports.push(imp);
      }
    }

    this.data.generator = new XmlSampleGenerator(
      this.data.targetNamespace,
      schemas,
      this.data.imports.map((i) => ({ namespace: i.ns || undefined, XML: i.XML, text: i.text }))
    );
  }
}

function getDocText(el: Element): string {
  const docEl = child(el, ns.wsdl, "documentation");
  if (!docEl) return "";
  return docEl.textContent ?? "";
}

export async function parseWsdl(url: string, text: string): Promise<WsdlData> {
  const parser = new WsdlParser(url, text);
  await parser.parseWSDL();
  const data = parser.getData();

  // load schema synchronously (compatible with original behavior)
  await parser.parseSchema(url);

  return data;
}

export function getOperations(wsdl: WsdlData): OperationContext[] {
  const contexts: OperationContext[] = [];

  for (const service of wsdl.services) {
    for (const port of service.ports) {
      const binding = wsdl.bindings[port.binding.full];
      if (!binding) continue;
      const portType = wsdl.portTypes[binding.type.full];
      if (!portType) continue;

      for (const operation of binding.operations) {
        const portTypeOperation = portType.operations[operation.name.full];
        if (!portTypeOperation) continue;

        contexts.push({
          wsdl,
          generator: wsdl.generator,
          service,
          port,
          binding,
          portType,
          portTypeOperation,
          operation,
        });
      }
    }
  }

  return contexts;
}
