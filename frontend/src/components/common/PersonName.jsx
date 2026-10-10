import React from 'react';

/**
 * Renders person name according to SplitOrbit identity & privacy hierarchy:
 * - Dominant text: linked account name (users.name) if linked, else host-assigned person.name.
 * - @username: muted/smaller right next to or below the name when available.
 * - Secondary note: 'saved as "Rahul"' when the host's custom label differs from the linked account name.
 */
export default function PersonName({
  person,
  showSavedAs = true,
  showUsername = true,
  inline = false,
  className = '',
  nameClassName = '',
}) {
  if (!person) return null;

  const displayName = person.accountName || person.name;
  const hasSavedAsDiff =
    showSavedAs &&
    person.accountName &&
    person.name &&
    person.accountName.trim().toLowerCase() !== person.name.trim().toLowerCase();

  return (
    <div
      className={`min-w-0 ${inline ? 'inline-flex items-baseline gap-1.5 flex-wrap' : 'flex flex-col'} ${className}`}
    >
      <div className="inline-flex items-baseline gap-1.5 flex-wrap min-w-0">
        <span
          className={`font-semibold text-text truncate ${nameClassName || 'text-sm sm:text-base'}`}
          title={displayName}
        >
          {displayName}
        </span>

        {showUsername && person.username && (
          <span
            className="text-xs text-text-muted/80 font-mono font-medium tracking-tight"
            title={`@${person.username}`}
          >
            @{person.username}
          </span>
        )}
      </div>

      {hasSavedAsDiff && (
        <span
          className="text-[11px] text-text-muted/70 italic truncate"
          title={`Saved as "${person.name}"`}
        >
          saved as &ldquo;{person.name}&rdquo;
        </span>
      )}
    </div>
  );
}
