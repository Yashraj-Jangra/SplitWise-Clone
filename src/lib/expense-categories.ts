
export const expenseCategories = {
  'Food & Dining': ['food', 'restaurant', 'dinner', 'lunch', 'breakfast', 'cafe', 'pizza', 'swiggy', 'zomato', 'coffee'],
  'Groceries': ['grocery', 'market', 'vegetables', 'fruits', 'milk', 'eggs'],
  'Travel': ['flight', 'train', 'bus', 'taxi', 'uber', 'ola', 'hotel', 'airbnb', 'travel', 'trip'],
  'Utilities': ['bill', 'electricity', 'water', 'internet', 'rent', 'gas', 'phone', 'recharge'],
  'Entertainment': ['movie', 'concert', 'tickets', 'show', 'game', 'party', 'netflix', 'spotify'],
  'Shopping': ['clothes', 'electronics', 'mall', 'amazon', 'flipkart', 'shopping', 'apparel'],
  'Health & Wellness': ['doctor', 'pharmacy', 'medicine', 'gym', 'hospital', 'wellness'],
  'Other': [],
};

export const categoryList = Object.keys(expenseCategories);

/**
 * Classifies an expense description into a category based on keywords.
 * @param description The expense description.
 * @returns The determined category, or 'Other' if no keywords match.
 */
export function classifyExpense(description: string): string {
  if (!description) {
    return 'Other';
  }

  const lowerCaseDescription = description.toLowerCase();

  for (const category of categoryList) {
    if (category === 'Other') continue;
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const keywords = (expenseCategories as any)[category];
    for (const keyword of keywords) {
      // Use word boundaries to avoid partial matches e.g. "rental" matching "rent"
      const keywordRegex = new RegExp(`\\b${keyword}\\b`);
      if (keywordRegex.test(lowerCaseDescription)) {
        return category;
      }
    }
  }

  return 'Other';
}
