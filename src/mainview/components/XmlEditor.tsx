import { useEffect, useMemo, useRef } from "react";
import { CodeJar, type CodeJar as CodeJarInstance } from "codejar";
import { withLineNumbers } from "codejar-linenumbers";
import Prism from "prismjs";
import "prismjs/components/prism-markup";
import "codejar-linenumbers/es/codejar-linenumbers.css";
import "../styles/prism-theme.css";
import { useTheme } from "../lib/ThemeProvider";

interface XmlEditorProps {
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
}

export default function XmlEditor({ value, onChange, readOnly }: XmlEditorProps) {
  if (readOnly) {
    return <ReadOnlyXmlViewer value={value} />;
  }

  return <EditableXmlEditor value={value} onChange={onChange} />;
}

const MAX_HIGHLIGHT_CHARS = 120_000;

function getHighlightedMarkup(code: string): string | null {
  if (code.length > MAX_HIGHLIGHT_CHARS) {
    return null;
  }

  return Prism.highlight(code, Prism.languages.markup, "markup");
}

function highlightEditor(editor: HTMLElement) {
  const code = editor.textContent || "";
  const highlighted = getHighlightedMarkup(code);

  if (highlighted === null) {
    editor.textContent = code;
    editor.classList.add("codejar-editor-plain");
    return;
  }

  editor.innerHTML = highlighted;
  editor.classList.remove("codejar-editor-plain");
}

function getLineCount(code: string) {
  let lines = 1;
  for (let index = 0; index < code.length; index += 1) {
    if (code.charCodeAt(index) === 10) {
      lines += 1;
    }
  }
  return lines;
}

function EditableXmlEditor({
  value,
  onChange,
}: Pick<XmlEditorProps, "value" | "onChange">) {
  const container = useRef<HTMLDivElement>(null);
  const jarRef = useRef<CodeJarInstance | null>(null);
  const initialValueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  const { theme } = useTheme();
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!container.current) return;

    const jar = CodeJar(
      container.current,
      withLineNumbers(highlightEditor, { width: "48px" }),
      { tab: "  " }
    );

    jar.onUpdate((code) => {
      onChangeRef.current?.(code);
    });

    jarRef.current = jar;
    jar.updateCode(initialValueRef.current, false);

    return () => {
      jar.destroy();
      jarRef.current = null;
    };
  }, []);

  useEffect(() => {
    const j = jarRef.current;
    if (!j) return;
    const current = j.toString();
    if (current !== value) {
      j.updateCode(value, false);
    }
  }, [value]);

  return (
    <div
      ref={container}
      className={`codejar-editor h-full w-full font-mono text-[13px] leading-relaxed ${
        theme === "dark" ? "dark" : "light"
      }`}
    />
  );
}

function ReadOnlyXmlViewer({ value }: Pick<XmlEditorProps, "value">) {
  const { theme } = useTheme();
  const highlightedMarkup = useMemo(() => getHighlightedMarkup(value), [value]);
  const lineNumbers = useMemo(() => {
    const lines = getLineCount(value);
    return Array.from({ length: lines }, (_, index) => index + 1).join("\n");
  }, [value]);

  return (
    <div
      className={`code-view h-full w-full font-mono text-[13px] leading-relaxed ${
        theme === "dark" ? "dark" : "light"
      }`}
    >
      <pre className="code-view__gutter" aria-hidden="true">
        {lineNumbers}
      </pre>
      <pre className="code-view__code">
        {highlightedMarkup === null ? (
          <code>{value}</code>
        ) : (
          <code
            className="language-markup"
            dangerouslySetInnerHTML={{ __html: highlightedMarkup }}
          />
        )}
      </pre>
    </div>
  );
}
