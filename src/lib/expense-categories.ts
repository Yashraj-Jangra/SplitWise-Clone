

export const defaultExpenseCategories: Record<string, string[]> = {
  'Food & Dining': ['food', 'restaurant', 'dinner', 'lunch', 'breakfast', 'cafe', 'pizza', 'swiggy', 'zomato', 'coffee'],
  'Groceries': ['grocery', 'market', 'vegetables', 'fruits', 'milk', 'eggs'],
  'Travel': ['flight', 'train', 'bus', 'taxi', 'uber', 'ola', 'hotel', 'airbnb', 'travel', 'trip'],
  'Utilities': ['bill', 'electricity', 'water', 'internet', 'rent', 'gas', 'phone', 'recharge'],
  'Entertainment': ['movie', 'concert', 'tickets', 'show', 'game', 'party', 'netflix', 'spotify'],
  'Shopping': ['clothes', 'electronics', 'mall', 'amazon', 'flipkart', 'shopping', 'apparel'],
  'Health & Wellness': ['doctor', 'pharmacy', 'medicine', 'gym', 'hospital', 'wellness'],
  'Other': [],
};

/**
 * Classifies an expense description into a category based on keywords.
 * @param description The expense description.
 * @param categories A map of categories to their keywords.
 * @returns The determined category, or 'Other' if no keywords match.
 */
export function classifyExpense(description: string, categories: Record<string, string[]>): string {
  if (!description) {
    return 'Other';
  }

  const lowerCaseDescription = description.toLowerCase();
  const categoryList = Object.keys(categories);

  for (const category of categoryList) {
    if (category === 'Other') continue;
    
    const keywords = categories[category] || [];
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
