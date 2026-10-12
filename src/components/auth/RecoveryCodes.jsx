import { useState } from "react";

/*
 * Two-factor recovery codes (P5), shown once: after setting it up, at sign-in
 * or on Profile, and after making new ones. Copy or download them; the server
 * keeps only hashes.
 */
function RecoveryCodes({ codes }) {
  const [copied, setCopied] = useState(false);
  const text = codes.join("\n");

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  const download = `data:text/plain;charset=utf-8,${encodeURIComponent(`OmniCore recovery codes\nEach works once.\n\n${text}\n`)}`;

  return (
    <div className="recovery-codes">
      <ol aria-label="Recovery codes">
        {codes.map((code) => (
          <li key={code}>
            <code>{code}</code>
          </li>
        ))}
      </ol>

      <div className="recovery-codes-actions">
        <button type="button" className="secondary-button" onClick={copy}>
          {copied ? "Copied" : "Copy"}
        </button>
        <a className="secondary-button" href={download} download="omnicore-recovery-codes.txt">
          Download
        </a>
      </div>
    </div>
  );
}

export default RecoveryCodes;
