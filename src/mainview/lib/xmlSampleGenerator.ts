import type { QualifiedName } from "./types";

export class XmlQualifiedName {
  ns: string;
  localName: string;

  constructor(ns: string, localName: string) {
    this.ns = ns;
    this.localName = localName;
  }

  static fromElement(el: Element, name: string): XmlQualifiedName {
    const resolver = el.ownerDocument!.createNSResolver(el);
    const arr = name.split(":");
    if (arr.length !== 2)
      throw new Error("Invalid qualified name: " + name);
    const ns = resolver.lookupNamespaceURI(arr[0]) ?? "";
    const localName = arr[1];
    return new XmlQualifiedName(ns, localName);
  }

  toString(): string {
    return this.localName + " (" + this.ns + ")";
  }
}

interface InstanceObject {
  parent: InstanceGroup | null;
  sibling: InstanceElement | GroupNode | null;
  child: InstanceElement | GroupNode | null;
}

export class InstanceGroup implements InstanceObject {
  occurs = 1;
  isChoice = false;
  parent: InstanceGroup | null = null;
  sibling: InstanceElement | GroupNode | null = null;
  child: InstanceElement | GroupNode | null = null;

  addChild(obj: InstanceElement | GroupNode): void {
    obj.parent = this;
    if (!this.child) {
      this.child = obj;
    } else {
      let prev: InstanceElement | GroupNode | null = null;
      let next: InstanceElement | GroupNode | null = this.child;
      while (next) {
        prev = next;
        next = next.sibling;
      }
      prev!.sibling = obj;
    }
  }
}

let instanceElementId = 0;

export class InstanceElement extends InstanceGroup {
  id: number;
  qname: XmlQualifiedName;
  valueGenerator: { generateValue: () => string } | null = null;
  isMixed = false;
  isNillable = false;
  genNil = true;
  isFixed = false;
  fixedValue = "";
  hasDefault = false;
  defaultValue = "";
  minOccurs = 1;
  maxOccurs = 1;
  xsiType: string | null = null;

  constructor(qname: XmlQualifiedName) {
    super();
    this.id = ++instanceElementId;
    this.qname = qname;
  }
}

export type GroupNode = InstanceGroup;

const anyGenerator = { generateValue: () => "anyType" };

function createGenerator(dataType: string, _listLength: number, minOccurs = 1): { generateValue: () => string } {
  return {
    generateValue: () => "[" + dataType + (minOccurs === 0 ? "?" : "") + "]",
  };
}

export class XmlSampleGenerator {
  schemas: Element[];
  imports: Array<{ namespace?: string; XML: XMLDocument; text: string }>;
  root: Element | null = null;
  elementTypesProcessed: InstanceElement[] | null = null;
  instanceElementsProcessed: Record<string, InstanceElement> | null = null;
  listLength = 3;
  targetNamespace: string;
  globalElements: Record<string, Element> = {};
  globalTypes: Record<string, Element> = {};
  anyType = "anyType";

  constructor(targetNamespace: string, schemas: Element[], imports: Array<{ namespace?: string; XML: XMLDocument; text: string }>) {
    this.schemas = schemas;
    this.imports = imports;
    this.targetNamespace = targetNamespace;
    this.globalElements = this.getGlobalElements();
    this.globalTypes = this.getGlobalTypes();
  }

  writeXml(rootName: QualifiedName): XMLDocument {
    this.elementTypesProcessed = [];
    const schemaEl = this.findRootSchemaElement(rootName);
    const root = this.generateElement(schemaEl, null, false);
    if (!root) throw new Error("Schema did not lead to generation of a valid XML document.");
    this.instanceElementsProcessed = {};
    this.instanceElementsProcessed[root.id] = root;
    const doc = document.implementation.createDocument(root.qname.ns, root.qname.localName, null);
    if (root.valueGenerator != null) {
      let value: string;
      if (root.isFixed) value = root.fixedValue;
      else if (root.hasDefault) value = root.defaultValue;
      else value = root.valueGenerator.generateValue();
      doc.documentElement.appendChild(doc.createTextNode(value));
    } else {
      for (let g = root.child; g; g = g.sibling) {
        this.processGroup(doc.documentElement, g);
      }
    }
    return doc;
  }

  processGroup(parentEl: Element, grp: InstanceElement | GroupNode): void {
    if (grp instanceof InstanceElement) {
      this.processElement(parentEl, grp);
    } else {
      if (!grp.isChoice) {
        for (let i = 0, n = grp.occurs; i < n; i++) {
          let childGroup = grp.child;
          while (childGroup) {
            this.processGroup(parentEl, childGroup);
            childGroup = childGroup.sibling;
          }
        }
      } else {
        this.processChoiceGroup(parentEl, grp);
      }
    }
  }

  processChoiceGroup(parentEl: Element, grp: GroupNode): void {
    for (let i = 0, n = grp.occurs; i < n; i++) {
      const items: Array<InstanceElement | GroupNode> = [];
      let child = grp.child;
      while (child) {
        items.push(child);
        child = child.sibling;
      }
      if (items.length > 0) {
        const chosen = items[Math.floor(Math.random() * items.length)];
        this.processGroup(parentEl, chosen);
      }
    }
  }

  processElement(parentEl: Element, elem: InstanceElement): void {
    if (this.instanceElementsProcessed![elem.id]) return;
    this.instanceElementsProcessed![elem.id] = elem;
    const doc = parentEl.ownerDocument!;
    for (let i = 0, n = elem.occurs; i < n; i++) {
      const el = doc.createElementNS(elem.qname.ns === null ? "\0" : elem.qname.ns, elem.qname.localName);
      if (elem.isNillable) {
        if (elem.genNil) {
          this.writeNillable(el);
          elem.genNil = false;
          continue;
        } else {
          elem.genNil = true;
        }
      }
      if (elem.valueGenerator != null) {
        if (elem.isFixed) el.appendChild(doc.createTextNode(elem.fixedValue));
        else if (elem.hasDefault) el.appendChild(doc.createTextNode(elem.defaultValue));
        else el.appendChild(doc.createTextNode(elem.valueGenerator.generateValue()));
      } else {
        for (let g = elem.child; g; g = g.sibling) {
          this.processGroup(el, g);
        }
      }
      parentEl.appendChild(el);
    }
    delete this.instanceElementsProcessed![elem.id];
  }

  writeNillable(el: Element): void {
    el.setAttributeNS("http://www.w3.org/2001/XMLSchema-instance", "xsi:nil", "true");
  }

  findSchemaDocEl(el: Element): Element {
    const ns = "http://www.w3.org/2001/XMLSchema";
    for (let e: Element | null = el; e; e = e.parentElement) {
      if (e.localName === "schema" && e.namespaceURI === ns) return e;
    }
    return el;
  }

  generateElement(schemaEl: Element, parentEl: InstanceGroup | null, any?: boolean): InstanceElement | null {
    const globalDecl = this.resolveGlobalDecl(schemaEl);
    if (!globalDecl) return null;
    if (this.isAbstract(globalDecl)) return null;
    const dataIdx = (globalDecl as any).dataIndex;
    if (dataIdx != null && this.elementTypesProcessed![dataIdx]) {
      const existing = this.elementTypesProcessed![dataIdx] as InstanceElement;
      const minOccurs = this.getMinOccurs(schemaEl);
      const maxOccurs = this.getMinOccurs(schemaEl);
      if (!any && minOccurs > 0) {
        const clone = this.cloneElement(existing, this.getOccurs(minOccurs, maxOccurs));
        parentEl?.addChild(clone);
      }
      return null;
    }
    const schemaDocEl = this.findSchemaDocEl(schemaEl);
    const targetNs = schemaDocEl.getAttributeNS(null, "targetNamespace") || this.targetNamespace;
    const qualifiedElements = schemaDocEl.getAttributeNS(null, "elementFormDefault") === "qualified";
    const elemTargetNs = parentEl && !qualifiedElements ? null : targetNs;
    const elem = new InstanceElement(new XmlQualifiedName(elemTargetNs ?? "", globalDecl.getAttributeNS(null, "name")!));
    parentEl?.addChild(elem);
    const schemaType = this.getSchemaType(globalDecl, "type");
    if (schemaType === this.anyType) {
      elem.valueGenerator = anyGenerator;
    } else if (this.isComplexType(schemaType as Element)) {
      (globalDecl as any).dataIndex = this.elementTypesProcessed!.length;
      this.elementTypesProcessed![(globalDecl as any).dataIndex] = elem;
      const isAbstract = (schemaType as Element).getAttributeNS(null, "abstract");
      if (isAbstract !== "1" && isAbstract !== "true") {
        this.processComplexType(schemaType as Element, elem);
      }
    } else {
      const dataType = this.getSimpleDataType(schemaType as string | Element);
      const mo = this.getMinOccurs(schemaEl);
      elem.valueGenerator = createGenerator(dataType, this.listLength, mo);
    }
    return elem;
  }

  private resolveGlobalDecl(schemaEl: Element): Element | null {
    const ref = schemaEl.getAttributeNS(null, "ref");
    if (ref) {
      return this.findGlobalElement(XmlQualifiedName.fromElement(schemaEl, ref));
    }
    return schemaEl;
  }

  private cloneElement(elem: InstanceElement, occurs: number): InstanceElement {
    const clone = new InstanceElement(elem.qname);
    clone.valueGenerator = elem.valueGenerator;
    clone.isFixed = elem.isFixed;
    clone.fixedValue = elem.fixedValue;
    clone.hasDefault = elem.hasDefault;
    clone.defaultValue = elem.defaultValue;
    clone.isNillable = elem.isNillable;
    clone.genNil = elem.genNil;
    clone.occurs = occurs;
    clone.child = elem.child;
    return clone;
  }

  processComplexType(schemaType: Element, elem: InstanceElement): void {
    if (this.isSimpleContent(schemaType)) {
      const dataType = this.getSimpleDataType(schemaType);
      elem.valueGenerator = createGenerator(dataType, this.listLength);
    } else {
      this.generateParticle(this.getContentTypeParticle(schemaType), elem);
    }
  }

  isSimpleContent(schemaType: string | Element): boolean {
    return typeof schemaType === "string";
  }

  generateParticle(particle: Element | undefined, iGrp: InstanceGroup): void {
    if (!particle) return;
    const max = this.getMaxOccurs(particle);
    const min = this.getMinOccurs(particle);
    const occurs = this.getOccurs(min, max);

    if (particle.localName === "sequence") {
      const grp = new InstanceGroup();
      grp.occurs = occurs;
      iGrp.addChild(grp);
      this.generateGroupBase(particle, grp);
    } else if (particle.localName === "choice") {
      if (max === 1) {
        const pt = this.getContentTypeParticle(particle);
        this.generateParticle(pt, iGrp);
      } else {
        const grp = new InstanceGroup();
        grp.occurs = occurs;
        grp.isChoice = true;
        iGrp.addChild(grp);
        this.generateGroupBase(particle, grp);
      }
    } else if (particle.localName === "all") {
      this.generateAll(particle, iGrp);
    } else if (particle.localName === "element") {
      const ref = particle.getAttributeNS(null, "ref");
      let ch: Element | undefined;
      if (ref) ch = this.getSubstitutionChoice(particle);
      if (ch) this.generateParticle(ch, iGrp);
      else this.generateElement(particle, iGrp);
    } else if (particle.localName === "complexContent") {
      const pt = this.getChildren(particle, "extension", "restriction")[0];
      if (pt) {
        this.getSchemaType(pt, "base");
      }
    } else if (particle.localName === "any") {
      this.generateAny(particle, iGrp);
    }
  }

  generateGroupBase(gBase: Element, group: InstanceGroup): void {
    const particles = this.getParticles(gBase);
    for (const p of particles) {
      this.generateParticle(p, group);
    }
  }

  generateAll(gBase: Element, group: InstanceGroup): void {
    const particles = this.getParticles(gBase);
    for (const p of particles) {
      this.generateParticle(p, group);
    }
  }

  generateAny(_particle: Element, _group: InstanceGroup): void {
  }

  getParticles(schemaType: Element): Element[] {
    return this.getChildren(schemaType, "choice", "sequence", "all", "element", "any", "complexContent");
  }

  getContentTypeParticle(schemaType: Element): Element | undefined {
    return this.getParticles(schemaType)[0];
  }

  getSimpleDataType(schemaType: string | Element): string {
    if (typeof schemaType === "string") return schemaType;
    const children = this.getChildren(schemaType, "restriction", "list", "union");
    let result = "unknown";
    for (const child of children) {
      switch (child.localName) {
        case "restriction":
          result = this.getSchemaType(child, "base") as string;
          return result;
        case "list":
          result = this.getSchemaType(child, "itemType") as string;
          return result;
        case "union":
          result = this.getSchemaType(child, "memberTypes") as string;
          return result;
      }
    }
    return result;
  }

  isComplexType(schemaType: Element): boolean {
    return schemaType.localName === "complexType";
  }

  getSchemaType(el: Element, attrName: string): string | Element {
    const type = el.getAttributeNS(null, attrName);
    if (type) {
      const typeNS = this.resolveNS(el, type);
      if (typeNS.ns === "http://www.w3.org/2001/XMLSchema") {
        return typeNS.local;
      }
      const globalType = this.findGlobalType(typeNS);
      return globalType;
    }
    const schemaTypes = this.getChildren(el, "complexType", "simpleType");
    return schemaTypes[0];
  }

  private resolveNS(node: Element, name: string): { ns: string; local: string; full: string } {
    const resolver = node.ownerDocument!.createNSResolver(node);
    const index = name.indexOf(":");
    let ns: string, local: string;
    if (index === -1) {
      ns = node.ownerDocument!.documentElement.getAttributeNS(null, "targetNamespace") ?? "";
      local = name;
    } else {
      ns = resolver.lookupNamespaceURI(name.substring(0, index)) ?? "";
      local = name.substring(index + 1);
    }
    return { ns, local, full: ns + ":" + local };
  }

  getOccurs(minOccurs: number, _maxOccurs: number): number {
    return minOccurs;
  }

  getMinOccurs(el: Element): number {
    const value = el.getAttributeNS(null, "minOccurs");
    if (!value) return 1;
    const num = +value;
    if (isNaN(num)) return 1;
    return num;
  }

  getMaxOccurs(el: Element): number {
    const value = el.getAttributeNS(null, "maxOccurs");
    if (!value) return 1;
    if (value === "unbounded") return Infinity;
    const num = +value;
    if (isNaN(num)) return 1;
    return num;
  }

  getGlobalElements(): Record<string, Element> {
    const result: Record<string, Element> = {};
    for (const schema of this.schemas) {
      const targetNs = schema.getAttributeNS(null, "targetNamespace") ?? "";
      for (const el of this.getChildren(schema, "element")) {
        const name = el.getAttributeNS(null, "name")!;
        result[targetNs + ":" + name] = el;
      }
    }
    for (const imp of this.imports) {
      const importTargetNs = (imp.namespace || imp.XML.documentElement.getAttributeNS(null, "targetNamespace")) ?? "";
      for (const el of this.getChildren(imp.XML.documentElement, "element")) {
        const name = el.getAttributeNS(null, "name")!;
        result[importTargetNs + ":" + name] = el;
      }
    }
    return result;
  }

  getGlobalTypes(): Record<string, Element> {
    const result: Record<string, Element> = {};
    for (const schema of this.schemas) {
      const targetNs = schema.getAttributeNS(null, "targetNamespace") ?? "";
      for (const el of this.getChildren(schema, "complexType", "simpleType")) {
        const name = el.getAttributeNS(null, "name")!;
        result[targetNs + ":" + name] = el;
      }
    }
    for (const imp of this.imports) {
      const importTargetNs = (imp.namespace || imp.XML.documentElement.getAttributeNS(null, "targetNamespace")) ?? "";
      for (const el of this.getChildren(imp.XML.documentElement, "complexType", "simpleType")) {
        const name = el.getAttributeNS(null, "name")!;
        result[importTargetNs + ":" + name] = el;
      }
    }
    return result;
  }

  getSubstitutionChoice(_particle: Element): Element | undefined {
    return undefined;
  }

  findGlobalElement(qname: XmlQualifiedName): Element {
    const key = qname.ns + ":" + qname.localName;
    const el = this.globalElements[key];
    if (!el) {
      throw new Error("No global element was found: " + qname);
    }
    return el;
  }

  findGlobalType(qname: { ns: string; local: string }): Element {
    const key = qname.ns + ":" + qname.local;
    const el = this.globalTypes[key];
    if (!el) {
      return "unknown type: " + qname.local as unknown as Element;
    }
    return el;
  }

  findRootSchemaElement(root: QualifiedName | null): Element {
    let el: Element | undefined;
    if (root) {
      el = this.findGlobalElement(new XmlQualifiedName(root.ns, root.local));
    } else {
      for (const x in this.globalElements) {
        if (this.globalElements.hasOwnProperty(x)) {
          if (!this.isAbstract(this.globalElements[x])) {
            el = this.globalElements[x];
            break;
          }
        }
      }
    }
    if (!el) throw new Error("No root element was found.");
    if (this.isAbstract(el)) throw new Error("Root element type is abstract.");
    return el;
  }

  isAbstract(el: Element): boolean {
    const isAbstract = el.getAttributeNS(null, "abstract");
    return isAbstract === "true" || isAbstract === "1";
  }

  getChildren(el: Element, ...tagNames: string[]): Element[] {
    const ns = "http://www.w3.org/2001/XMLSchema";
    const children = el.childNodes;
    const result: Element[] = [];
    for (let i = 0, n = children.length; i < n; i++) {
      const child = children[i];
      if (child.nodeType === 1 && (child as Element).namespaceURI === ns) {
        for (let j = 0; j < tagNames.length; j++) {
          if ((child as Element).localName === tagNames[j]) {
            result.push(child as Element);
          }
        }
      }
    }
    return result;
  }
}
