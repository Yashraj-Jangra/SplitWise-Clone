export type ParsedChange =
  | { type: 'changed'; name: string; from: string; to: string }
  | { type: 'added'; name: string; detail: string }
  | { type: 'removed'; name: string; detail: string }
  | { type: 'unknown'; text: string };

/**
 * Parses structured text changes from expense history audit logs.
 */
export function parseComplexChange(text: string): ParsedChange[] {
  const changes: ParsedChange[] = [];
  if (!text || typeof text !== 'string') return changes;

  const parts = text.split(';').map(s => s.trim()).filter(Boolean);

  for (const part of parts) {
    // 1. Changed: "changed [NAME]'s [share/payment] from [VALUE] to [VALUE]"
    const changedMatch = part.match(/changed (.*?)'s (?:share|payment) from (.*?) to (.*?)$/i);
    if (changedMatch) {
      changes.push({
        type: 'changed',
        name: changedMatch[1].trim(),
        from: changedMatch[2].trim(),
        to: changedMatch[3].trim(),
      });
      continue;
    }

    // 2. Added: "added [NAME] who paid [VALUE]" OR "added [NAME] to split (owes [VALUE])"
    const addedPaidMatch = part.match(/added (.*?) who paid (.*?)$/i);
    if (addedPaidMatch) {
      changes.push({
        type: 'added',
        name: addedPaidMatch[1].trim(),
        detail: `paid ${addedPaidMatch[2].trim()}`,
      });
      continue;
    }
    const addedOwesMatch = part.match(/added (.*?) to split \(owes (.*?)\)$/i);
    if (addedOwesMatch) {
      changes.push({
        type: 'added',
        name: addedOwesMatch[1].trim(),
        detail: `owes ${addedOwesMatch[2].trim()}`,
      });
      continue;
    }

    // 3. Removed: "removed [NAME] (who paid [VALUE])" OR "removed [NAME] from split (was owing [VALUE])"
    const removedPaidMatch = part.match(/removed (.*?) \(who paid (.*?)\)$/i);
    if (removedPaidMatch) {
      changes.push({
        type: 'removed',
        name: removedPaidMatch[1].trim(),
        detail: `paid ${removedPaidMatch[2].trim()}`,
      });
      continue;
    }
    const removedOwesMatch = part.match(/removed (.*?) from split \(was owing (.*?)\)$/i);
    if (removedOwesMatch) {
      changes.push({
        type: 'removed',
        name: removedOwesMatch[1].trim(),
        detail: `was owing ${removedOwesMatch[2].trim()}`,
      });
      continue;
    }

    // Fallback for any other format
    changes.push({ type: 'unknown', text: part });
  }

  return changes;
}
