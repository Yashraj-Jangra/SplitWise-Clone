export interface ParticipantLike {
  userId?: string;
  name?: string;
  amountOwed?: number | string | null;
  isCurrentUser?: boolean;
}

export interface GroupMemberLike {
  id: string;
  name?: string;
}

/**
 * Validates whether participant split data is fully resolved and safe to display.
 * Returns false if the array is empty, contains incomplete data, or contains undefined/NaN names or amounts.
 */
export function areParticipantsValid(
  participants: ParticipantLike[] | null | undefined
): boolean {
  if (!Array.isArray(participants) || participants.length === 0) {
    return false;
  }

  return participants.every((p) => {
    if (!p || typeof p !== 'object') return false;

    // Check amount: must be a valid non-NaN number
    const amt = typeof p.amountOwed === 'number' ? p.amountOwed : Number(p.amountOwed);
    if (isNaN(amt) || p.amountOwed === null || p.amountOwed === undefined) {
      return false;
    }

    // Check name: current user is always considered named ('You')
    if (p.isCurrentUser) return true;

    // Otherwise, must have a non-empty, non-undefined string name
    if (
      typeof p.name !== 'string' ||
      p.name.trim() === '' ||
      p.name.trim().toLowerCase() === 'undefined' ||
      p.name.trim().toLowerCase() === 'null'
    ) {
      return false;
    }

    return true;
  });
}

/**
 * Resolves a safe display name for a participant.
 * Guarantees never returning 'undefined' or empty string.
 */
export function resolveParticipantName(
  participant: ParticipantLike | null | undefined,
  currentUserId?: string,
  groupMembers?: GroupMemberLike[]
): string {
  if (!participant) return 'Member';

  if (
    participant.isCurrentUser ||
    (currentUserId && participant.userId && participant.userId === currentUserId)
  ) {
    return 'You';
  }

  const rawName = participant.name;
  if (
    typeof rawName === 'string' &&
    rawName.trim() !== '' &&
    rawName.trim().toLowerCase() !== 'undefined' &&
    rawName.trim().toLowerCase() !== 'null'
  ) {
    return rawName.trim();
  }

  if (groupMembers && participant.userId) {
    const matched = groupMembers.find((m) => m.id === participant.userId);
    if (
      matched?.name &&
      matched.name.trim() !== '' &&
      matched.name.trim().toLowerCase() !== 'undefined' &&
      matched.name.trim().toLowerCase() !== 'null'
    ) {
      return matched.name.trim();
    }
  }

  return 'Member';
}

/**
 * Safely formats the owed text for a participant row.
 * Guarantees that "undefined owes ₹xxx" can never be produced.
 */
export function formatParticipantOwedText(
  participant: ParticipantLike | null | undefined,
  currencySymbol = '₹',
  groupMembers?: GroupMemberLike[],
  currentUserId?: string
): string {
  if (!participant) {
    return 'Loading split...';
  }

  const amtNum =
    typeof participant.amountOwed === 'number' && !isNaN(participant.amountOwed)
      ? participant.amountOwed
      : Number(participant.amountOwed) || 0;

  const formattedAmount = `${currencySymbol}${amtNum.toFixed(2)}`;

  if (
    participant.isCurrentUser ||
    (currentUserId && participant.userId && participant.userId === currentUserId)
  ) {
    return `You owe ${formattedAmount}`;
  }

  const name = resolveParticipantName(participant, currentUserId, groupMembers);
  if (name === 'You') {
    return `You owe ${formattedAmount}`;
  }

  return `${name} owes ${formattedAmount}`;
}

/**
 * Safely formats payer text with fallback.
 */
export function formatPayerText(
  payerName: string | null | undefined,
  amount: number | string | null | undefined,
  currencySymbol = '₹'
): string {
  const safeName =
    typeof payerName === 'string' &&
    payerName.trim() !== '' &&
    payerName.trim().toLowerCase() !== 'undefined' &&
    payerName.trim().toLowerCase() !== 'null'
      ? payerName.trim()
      : 'Member';

  const amtNum =
    typeof amount === 'number' && !isNaN(amount) ? amount : Number(amount) || 0;

  return `${safeName} paid ${currencySymbol}${amtNum.toFixed(2)}`;
}
