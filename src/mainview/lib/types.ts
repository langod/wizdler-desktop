export interface QualifiedName {
  ns: string;
  local: string;
  full: string;
}

export interface MessagePart {
  name: string;
  element: QualifiedName | null;
  type: QualifiedName | null;
}

export interface Message {
  name: QualifiedName;
  parts: MessagePart[];
}

export interface SoapBody {
  parts: string;
  use: string;
  encodingStyle: string;
  namespace: string;
}

export interface SoapHeader {
  message: QualifiedName;
  parts: string;
  use: string;
  encodingStyle: string;
  namespace: string;
  faults: Array<{
    message: string;
    parts: string;
    use: string;
    encodingStyle: string;
    namespace: string;
  }>;
}

export interface SoapIO {
  body: SoapBody | null;
  headers: SoapHeader[];
}

export interface HttpIO {
  urlEncoded: boolean;
  urlReplacement: boolean;
}

export interface OperationInput {
  soap?: SoapIO;
  soap12?: SoapIO;
  http?: HttpIO;
}

export interface OperationOutput {
  soap?: SoapIO;
  soap12?: SoapIO;
  http?: HttpIO;
}

export interface PortTypeOperation {
  name: QualifiedName;
  description: string;
  input: QualifiedName;
  output: QualifiedName;
}

export interface PortType {
  name: QualifiedName;
  operations: Record<string, PortTypeOperation>;
}

export interface BindingOperation {
  name: QualifiedName;
  description: string;
  soap?: { action: string; style: string };
  soap12?: { action: string; style: string };
  http?: { location: string };
  input?: OperationInput;
  output?: OperationOutput;
}

export interface Binding {
  name: QualifiedName;
  type: QualifiedName;
  description: string;
  operations: BindingOperation[];
  soap?: { transport: string; style: string };
  soap12?: { style: string };
  http?: { verb: string };
}

export interface Port {
  name: QualifiedName;
  description: string;
  binding: QualifiedName;
  soap?: { address: string };
  soap12?: { address: string };
  http?: { address: string };
}

export interface Service {
  name: QualifiedName;
  description: string;
  ports: Port[];
}

export interface WsdlImport {
  location: string;
  ns: string;
  text: string;
  XML: XMLDocument;
}

export interface OperationContext {
  wsdl: WsdlData;
  generator: unknown;
  service: Service;
  port: Port;
  binding: Binding;
  portType: PortType;
  portTypeOperation: PortTypeOperation;
  operation: BindingOperation;
}

export interface WsdlData {
  url: string;
  text: string;
  targetNamespace: string;
  messages: Record<string, Message>;
  portTypes: Record<string, PortType>;
  bindings: Record<string, Binding>;
  services: Service[];
  imports: WsdlImport[];
  resources: Record<string, string>;
  generator: unknown;
  _parsed: boolean;
  _loaded: boolean;
  _XML: XMLDocument | null;
  zip?: string;
}

export interface GeneratedRequest {
  method: string;
  url: string;
  headers: Record<string, string>;
  body: string;
}

export interface SavedRequest {
  id?: number;
  wsdlUrl: string;
  serviceName: string;
  operationName: string;
  method: string;
  requestUrl: string;
  headers: Array<{ id: number; key: string; value: string }>;
  requestBody: string;
  responseBody: string;
  status: string;
  createdAt: number;
  favorited?: boolean;
}

export interface XmlQualifiedName {
  ns: string;
  localName: string;
}

export interface SchemaElement {
  qname: XmlQualifiedName;
  child: InstanceElement | GroupNode | null;
  valueGenerator: { generateValue: () => string } | null;
  isFixed: boolean;
  fixedValue: string;
  hasDefault: boolean;
  defaultValue: string;
}

export interface InstanceElement {
  qname: XmlQualifiedName;
  attrs: Array<{ name: string; value: string }>;
  valueGenerator: { generateValue: () => string } | null;
  child: InstanceElement | GroupNode | null;
  sibling: InstanceElement | GroupNode | null;
  minOccurs: number;
  maxOccurs: number;
  isFixed: boolean;
  fixedValue: string;
  hasDefault: boolean;
  defaultValue: string;
  isNillable: boolean;
}

export interface GroupNode {
  occurs: number;
  isChoice: boolean;
  minOccurs: number;
  maxOccurs: number;
}
