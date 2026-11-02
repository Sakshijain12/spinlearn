"use client";

import { useEffect, useMemo, useState } from "react";
import { renderToString } from "katex";
import { Icon } from "./Icon";
import { useLearning } from "./LearningProvider";

export function Formula({ value }: { value: string }) {
  const result = useMemo<{ html: string } | { error: string }>(() => {
    try {
      return { html: renderToString(value, { displayMode: true, throwOnError: true, trust: false, strict: "error" }) };
    } catch (cause) {
      console.error("Spinlearn could not render a lesson formula.", cause);
      return { error: "This formula could not be rendered. Reload the lesson or try another step." };
    }
  }, [value]);
  if ("error" in result) return <p role="alert" className="rounded-default bg-danger-bg p-3 text-small text-danger-text">{result.error}</p>;
  return <div className="min-w-0 overflow-x-auto rounded-default bg-surface-1 px-3 py-1 text-body-lg" dangerouslySetInnerHTML={{ __html: result.html }} />;
}

const keywords = new Set(["import", "from", "as", "def", "return", "for", "in", "if", "else", "class", "const", "let", "function", "await", "async"]);

export function CodeBlock({ code, language, downloadable = false }: { code: string; language: string; downloadable?: boolean }) {
  const { notify } = useLearning();
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const tokens = code.split(/(#[^\n]*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\b(?:import|from|as|def|return|for|in|if|else|class|const|let|function|await|async)\b)/g);
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);
  const copy = async () => {
    try {
      if (!navigator.clipboard) throw new Error("Clipboard access is not available.");
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setError("");
      notify("Code copied");
    } catch (cause) {
      console.error("Spinlearn could not copy the code.", cause);
      setError("Copy is unavailable in this browser. Select the code and copy it manually.");
    }
  };
  return (
    <div className="min-w-0">
      <div className="overflow-hidden rounded-default border border-border bg-surface-1">
        <div className="flex items-center justify-between border-b border-border px-4 py-1 text-caption text-text-secondary">
          <span>{language === "python" ? "Python" : language}</span>
          <button type="button" onClick={copy} className="inline-flex min-h-9 items-center gap-1.5 px-2 text-small hover:text-accent-text"><Icon name={copied ? "check" : "copy"} size={14} />{copied ? "Copied" : "Copy code"}</button>
        </div>
        <pre className="m-0 max-w-full rounded-none text-[12px] leading-6"><code>{tokens.map((token, index) => <span key={index} className={token.startsWith("#") ? "text-text-secondary" : keywords.has(token) ? "text-accent-text" : "text-text-primary"}>{token}</span>)}</code></pre>
      </div>
      {error && <p role="alert" className="mt-3 text-small text-danger-text">{error}</p>}
      {downloadable && <a href="/examples/kv_cache_demo.py" download className="text-link mt-4"><Icon name="download" size={16} />Download the full Python example</a>}
    </div>
  );
}

export function KVCacheDemo() {
  const tokens = ["The", "cat", "sat", "on", "the", "mat"];
  const [step, setStep] = useState(1);
  return (
    <figure className="mt-5 rounded-default border border-border bg-surface-1 p-4">
      <figcaption className="mb-4 flex items-center justify-between gap-3 text-small"><span className="font-medium">Build a cache, one token at a time</span><span className="text-caption text-text-secondary">{step}/{tokens.length}</span></figcaption>
      <div className="mb-4 flex flex-wrap gap-1.5" aria-hidden="true">
        {tokens.map((token, index) => <span key={index} className={`rounded-default border px-2.5 py-1 text-small ${index === step - 1 ? "border-accent-fill bg-accent-bg text-accent-text" : index < step ? "border-border bg-surface-2 text-text-primary" : "border-transparent text-text-secondary"}`}>{token}</span>)}
      </div>
      <div className="space-y-3" aria-hidden="true">
        {["K", "V"].map((kind) => (
          <div key={kind} className="flex items-center gap-2">
            <span className="w-5 shrink-0 font-mono text-small">{kind}</span>
            <div className="grid flex-1 grid-cols-6 gap-1.5">
              {tokens.map((_, index) => <span key={index} className={`flex h-9 items-center justify-center rounded-[4px] border text-[11px] ${index === step - 1 ? "border-accent-fill bg-accent-bg text-accent-text" : index < step - 1 ? "border-success-text/20 bg-success-bg text-success-text" : "border-dashed border-border text-text-secondary"}`}>{index < step ? `${kind.toLowerCase()}${index + 1}` : "\u00b7"}</span>)}
            </div>
          </div>
        ))}
      </div>
      <p aria-live="polite" className="mt-4 text-small text-text-secondary">Compute 1 new key/value pair. Reuse {step - 1} cached {step === 2 ? "pair" : "pairs"}.</p>
      <div className="mt-4 flex justify-between gap-3">
        <button type="button" className="btn-secondary px-3" onClick={() => setStep((value) => value - 1)} disabled={step === 1}><Icon name="left" size={15} />Previous token</button>
        <button type="button" className="btn-secondary px-3" onClick={() => setStep((value) => value + 1)} disabled={step === tokens.length}>Next token<Icon name="right" size={15} /></button>
      </div>
      <p className="mt-3 text-caption text-text-secondary">Illustration of cached K/V rows, not a running language model.</p>
    </figure>
  );
}

export function AttentionDemo() {
  const tokens = ["The", "cat", "sat", "because", "it", "was", "tired"];
  const [selected, setSelected] = useState(4);
  const raw = selected === 4 ? [1, 9, 1, 1, 2, 1, 1] : tokens.map((_, index) => index === selected ? 5 : Math.max(1, 4 - Math.abs(index - selected)));
  const total = raw.reduce((sum, weight) => sum + weight, 0);
  return (
    <figure className="mt-5 rounded-default border border-border bg-surface-1 p-4">
      <figcaption className="mb-3 text-small font-medium">Which words matter to this token?</figcaption>
      <div role="group" aria-label="Attention query token" className="mb-5 flex flex-wrap gap-1.5">
        {tokens.map((token, index) => <button key={index} type="button" className="filter-chip min-h-9 px-2.5" aria-pressed={selected === index} onClick={() => setSelected(index)}>{token}</button>)}
      </div>
      <div className="space-y-2" aria-label={`Illustrative attention weights for ${tokens[selected]}`}>
        {tokens.map((token, index) => <div key={index} className="flex items-center gap-3 text-caption"><span className="w-14">{token}</span><div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2"><div className="h-full rounded-full bg-accent-fill" style={{ width: `${raw[index] / total * 100}%` }} /></div><span className="w-9 text-right text-text-secondary">{Math.round(raw[index] / total * 100)}%</span></div>)}
      </div>
      <p aria-live="polite" className="mt-4 text-caption text-text-secondary">Showing example weights for &ldquo;{tokens[selected]}&rdquo;. These illustrate weighted mixing, not a model&apos;s measured attention.</p>
    </figure>
  );
}
