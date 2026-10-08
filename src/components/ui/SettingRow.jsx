import { Children } from "react";

/*
 * Settings rows: a card of stacked rows, each one setting.
 *
 *   <SettingRows label="Account">
 *     <SettingRow icon={<User />} title="Name" description="Shown to your team"
 *       action={<button …>Edit</button>}>
 *       …an inline editor or notice for this row only…
 *     </SettingRow>
 *   </SettingRows>
 *
 * Left: the title (with an optional icon) and one line of help. Right: the
 * value or the control. Anything passed as children opens below the row,
 * inside it — an editor, or a notice about this setting — never as a popup.
 */

export function SettingRows({ label, children }) {
  return (
    <section className="setting-rows" aria-label={label}>
      {children}
    </section>
  );
}

export function SettingRow({ icon, title, description, action, children }) {
  return (
    <div className="setting-row">
      <div className="setting-row-main">
        <div className="setting-row-text">
          <h3 className="setting-row-title">
            {icon && <span className="setting-row-icon" aria-hidden="true">{icon}</span>}
            {title}
          </h3>
          {description && <p>{description}</p>}
        </div>

        {action && <div className="setting-row-action">{action}</div>}
      </div>

      {Children.toArray(children).length > 0 && <div className="setting-row-body">{children}</div>}
    </div>
  );
}

// An in-row notice: a title, a sentence and an optional action on the right.
export function SettingNotice({ icon, title, children, action, tone = "neutral" }) {
  return (
    <div className={`setting-notice tone-${tone}`} role={tone === "danger" ? "alert" : "status"}>
      <div>
        {title && (
          <strong className="setting-notice-title">
            {icon && <span aria-hidden="true">{icon}</span>}
            {title}
          </strong>
        )}
        {children && <div className="setting-notice-text">{children}</div>}
      </div>
      {action && <div className="setting-notice-action">{action}</div>}
    </div>
  );
}
