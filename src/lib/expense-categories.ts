

import type { ExpenseCategory } from '@/types';

export const defaultExpenseCategories: Record<string, ExpenseCategory> = {
  'Food & Dining': {
    icon: 'Wallet',
    keywords: ['food', 'restaurant', 'dinner', 'lunch', 'breakfast', 'cafe', 'pizza', 'swiggy', 'zomato', 'coffee', 'bar', 'pub'],
  },
  'Groceries': {
    icon: 'Users',
    keywords: ['grocery', 'market', 'vegetables', 'fruits', 'milk', 'eggs', 'supermarket', 'kirana'],
  },
  'Transportation': {
    icon: 'Home',
    keywords: ['transport', 'flight', 'train', 'bus', 'taxi', 'uber', 'ola', 'auto', 'fuel', 'petrol', 'diesel', 'metro'],
  },
  'Housing': {
    icon: 'Home',
    keywords: ['rent', 'mortgage', 'maintenance', 'furniture', 'repairs', 'housing'],
  },
  'Utilities': {
    icon: 'Settings',
    keywords: ['bill', 'electricity', 'water', 'internet', 'gas', 'phone', 'recharge', 'utility'],
  },
  'Entertainment': {
    icon: 'Wallet',
    keywords: ['movie', 'concert', 'tickets', 'show', 'game', 'party', 'netflix', 'spotify', 'hotstar', 'cinema', 'event'],
  },
  'Shopping': {
    icon: 'Wallet',
    keywords: ['clothes', 'electronics', 'mall', 'amazon', 'flipkart', 'shopping', 'apparel', 'gadgets'],
  },
  'Health & Wellness': {
    icon: 'Heart',
    keywords: ['doctor', 'pharmacy', 'medicine', 'gym', 'hospital', 'wellness', 'fitness', 'healthcare'],
  },
  'Personal Care': {
    icon: 'Wallet',
    keywords: ['salon', 'haircut', 'cosmetics', 'toiletries', 'personal care'],
  },
  'Education': {
    icon: 'Wallet',
    keywords: ['school', 'college', 'university', 'books', 'stationery', 'course', 'fees', 'education'],
  },
  'Gifts & Donations': {
    icon: 'Wallet',
    keywords: ['gift', 'present', 'donation', 'charity', 'wedding', 'birthday'],
  },
  'Travel': {
    icon: 'Wallet',
    keywords: ['hotel', 'airbnb', 'travel', 'trip', 'vacation', 'holiday', 'tourism'],
  },
  'Other': {
    icon: 'Wallet',
    keywords: [],
  },
};

/**
 * Classifies an expense description into a category based on keywords.
 * @param description The expense description.
 * @param categories A map of categories to their keywords.
 * @returns The determined category, or 'Other' if no keywords match.
 */
export function classifyExpense(description: string, categories: Record<string, ExpenseCategory>): string {
  if (!description) {
    return 'Other';
  }

  const lowerCaseDescription = description.toLowerCase();
  const categoryList = Object.keys(categories);

  for (const category of categoryList) {
    if (category === 'Other') continue;
    
    const keywords = categories[category]?.keywords || [];
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
