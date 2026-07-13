import { useEffect, useRef } from "react";
import { CodeJar } from "codejar";
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
  const container = useRef<HTMLDivElement>(null);
  const jarRef = useRef<ReturnType<typeof CodeJar> | null>(null);
  const onChangeRef = useRef(onChange);
  const { theme } = useTheme();
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!container.current) return;

    const highlight = (editor: HTMLElement) => {
      const code = editor.textContent || "";
      editor.innerHTML = Prism.highlight(code, Prism.languages.markup, "markup");
    };

    const jar = CodeJar(container.current, withLineNumbers(highlight), {
      tab: "  ",
    });

    jar.onUpdate((code) => {
      onChangeRef.current?.(code);
    });

    jarRef.current = jar;

    return () => {
      jar.destroy();
    };
  }, []);

  useEffect(() => {
    const j = jarRef.current;
    if (!j) return;
    const current = j.toString();
    if (current !== value) {
      j.updateCode(value);
    }
  }, [value]);

  useEffect(() => {
    if (!container.current) return;
    container.current.contentEditable = readOnly ? "false" : "plaintext-only";
  }, [readOnly]);

  useEffect(() => {
    if (!container.current) return;
    container.current.classList.toggle("dark", theme === "dark");
    container.current.classList.toggle("light", theme !== "dark");
  }, [theme]);

  return (
    <div
      ref={container}
      className="codejar-editor h-full w-full font-mono text-[13px] leading-relaxed"
    />
  );
}