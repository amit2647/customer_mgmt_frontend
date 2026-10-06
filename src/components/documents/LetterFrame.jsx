import { forwardRef, useImperativeHandle, useRef, useState } from "react";

/*
 * A letter as it will print (DOC-12, DOC-14, DOC-15). The HTML comes from
 * document-service, rendered by bundle-sdk's locked-down templates with every
 * value escaped; it is shown in a sandboxed frame all the same — no scripts
 * can run in it — so the letter's own styles never touch the app and the
 * app's never touch the letter. `allow-same-origin` lets the page size the
 * frame and print it; without `allow-scripts` that grants the letter nothing.
 */

const LETTER_CSS = `
  @page { margin: 0.5in; }
  html { background: #fff; }
  body { margin: 0; padding: 32px 40px; color: #1a1a1a; font: 12pt/1.55 Georgia, "Times New Roman", serif; }
  p { margin: 0 0 10pt; }
  .letterhead { display: flex; flex-direction: column; align-items: center; gap: 2pt; margin-bottom: 18pt; padding-bottom: 10pt; border-bottom: 1px solid #999; text-align: center; }
  .letterhead strong { font-size: 15pt; letter-spacing: 0.02em; }
  .letter-meta { text-align: right; }
  .subject { font-weight: bold; }
  .addressee { margin-bottom: 14pt; }
  table.representations { width: 100%; margin: 6pt 0 12pt; border-collapse: collapse; }
  table.representations td { padding: 4pt 6pt; border: 1px solid #bbb; vertical-align: top; }
  table.representations td:first-child { width: 42%; }
  .signature { margin-top: 24pt; }
  .signature-space { height: 36pt; }
  /* A missing value stays highlighted on paper too (DOC-12, DOC-14). */
  mark.doc-placeholder { padding: 0 2pt; background: #fff3a8; color: #6b5800; }
  /* Representation answers: favourable green, adverse red (DOC-15). */
  .doc-favourable { color: #1f6b2a; }
  .doc-adverse { color: #a12a2a; font-weight: bold; }
  @media print { body { padding: 0; } }
`;

const page = (html) => `<!doctype html><html><head><meta charset="utf-8"><style>${LETTER_CSS}</style></head><body>${html || ""}</body></html>`;

const LetterFrame = forwardRef(function LetterFrame({ html, title = "Letter" }, ref) {
  const frame = useRef(null);
  const [height, setHeight] = useState(900);

  useImperativeHandle(ref, () => ({
    print: () => frame.current?.contentWindow?.print(),
  }));

  return (
    <iframe
      ref={frame}
      className="letter-frame"
      title={title}
      sandbox="allow-same-origin allow-modals"
      srcDoc={page(html)}
      style={{ height }}
      onLoad={() => {
        const body = frame.current?.contentDocument?.body;
        if (body) setHeight(Math.max(600, body.scrollHeight + 40));
      }}
    />
  );
});

export default LetterFrame;
