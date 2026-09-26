import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

/*
 * One bubble in the assistant thread.
 *
 * Only the assistant's side is parsed as Markdown — the model writes lists,
 * bold and the occasional table, which were previously shown as literal
 * asterisks. What the user typed is rendered verbatim: treating their input as
 * Markdown would mangle anything containing an underscore or asterisk, and they
 * did not ask for formatting.
 *
 * react-markdown does not render raw HTML unless rehype-raw is added, and it is
 * deliberately not added here: model output is untrusted input, and this keeps
 * a tool result that happens to contain markup from becoming live HTML. Link
 * targets go through react-markdown's default URL filter, which drops
 * javascript: and similar schemes.
 */
function AssistantMessage({ role, content, failed = false, onRetry = null }) {
  if (role !== "assistant") {
    return (
      <>
        <div className={`assistant-message user ${failed ? "is-failed" : ""}`}>
          {content}
        </div>

        {/* Kept in the thread rather than dropped, so nothing typed is lost;
            a retry resends it under the same id and cannot be asked twice. */}
        {failed && (
          <div className="assistant-failed">
            Not answered
            {onRetry && (
              <button type="button" className="link" onClick={onRetry}>
                Retry
              </button>
            )}
          </div>
        )}
      </>
    );
  }

  return (
    <div className="assistant-message assistant">
      <Markdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Anything the model links to is external to the panel, and opening
          // it in place would discard the conversation.
          a: ({ node, ...props }) => (
            <a {...props} target="_blank" rel="noopener noreferrer" />
          ),
        }}
      >
        {content}
      </Markdown>
    </div>
  );
}

export default AssistantMessage;
