

import type { MasterCategory, SubCategory } from '@/types';

export const defaultExpenseCategories: Record<string, MasterCategory> = {
  'Food and Drink': {
    subCategories: {
      'Groceries': { icon: 'ShoppingBag', keywords: ['grocery', 'market', 'supermarket', 'bigbasket', 'blinkit', 'instamart'] },
      'Dining Out': { icon: 'UtensilsCrossed', keywords: ['restaurant', 'cafe', 'bar', 'pub', 'dining', 'dinner', 'lunch', 'breakfast'] },
      'Takeout': { icon: 'UtensilsCrossed', keywords: ['takeout', 'swiggy', 'zomato', 'ubereats', 'food delivery'] },
      'Coffee Shop': { icon: 'Wallet', keywords: ['coffee', 'starbucks', 'tea'] },
    },
  },
  'Transportation': {
    subCategories: {
      'Bus/Train': { icon: 'Bus', keywords: ['bus', 'train', 'metro', 'railway'] },
      'Taxi': { icon: 'Car', keywords: ['taxi', 'uber', 'ola', 'cab', 'auto', 'rickshaw'] },
      'Flights': { icon: 'Plane', keywords: ['flight', 'airline', 'indigo', 'vistara', 'airways'] },
      'Car': { icon: 'Car', keywords: ['car', 'fuel', 'petrol', 'diesel', 'parking', 'maintenance'] },
    },
  },
  'Housing': {
    subCategories: {
      'Rent': { icon: 'Home', keywords: ['rent'] },
      'Mortgage': { icon: 'Home', keywords: ['mortgage', 'emi'] },
      'Repairs': { icon: 'Settings', keywords: ['repair', 'maintenance', 'plumber', 'electrician'] },
      'Furniture': { icon: 'Home', keywords: ['furniture', 'ikea', 'home decor'] },
    },
  },
  'Utilities': {
    subCategories: {
      'Electricity': { icon: 'Bolt', keywords: ['electricity', 'power', 'bill'] },
      'Water': { icon: 'Droplets', keywords: ['water bill'] },
      'Internet': { icon: 'Wifi', keywords: ['internet', 'wifi', 'broadband', 'jiofiber', 'airtel'] },
      'Phone': { icon: 'Smartphone', keywords: ['phone', 'mobile', 'recharge', 'postpaid', 'prepaid'] },
    },
  },
  'Entertainment': {
    subCategories: {
      'Movies': { icon: 'Film', keywords: ['movie', 'cinema', 'pvr', 'inox', 'bookmyshow'] },
      'Games': { icon: 'Gamepad2', keywords: ['game', 'gaming', 'steam', 'playstation', 'xbox'] },
      'Music': { icon: 'Music', keywords: ['music', 'spotify', 'apple music', 'concert'] },
      'TV/Streaming': { icon: 'Tv', keywords: ['netflix', 'hotstar', 'amazon prime', 'hulu', 'streaming'] },
      'Sports': { icon: 'Ticket', keywords: ['sports', 'tickets', 'match', 'ipl'] },
    },
  },
  'Shopping': {
    subCategories: {
      'Clothing': { icon: 'Shirt', keywords: ['clothing', 'apparel', 'shirt', 'trousers', 'dress'] },
      'Electronics': { icon: 'Laptop', keywords: ['electronics', 'gadget', 'phone', 'laptop', 'croma'] },
      'Online': { icon: 'ShoppingBag', keywords: ['amazon', 'flipkart', 'myntra', 'online shopping'] },
    },
  },
  'Health and Wellness': {
    subCategories: {
      'Doctor': { icon: 'HeartPulse', keywords: ['doctor', 'clinic', 'consultation'] },
      'Pharmacy': { icon: 'HeartPulse', keywords: ['pharmacy', 'medicine', 'apollo'] },
      'Gym': { icon: 'Heart', keywords: ['gym', 'fitness', 'cultfit'] },
    },
  },
  'Personal Care': {
    subCategories: {
      'Salon/Barber': { icon: 'Wallet', keywords: ['salon', 'barber', 'haircut', 'spa'] },
      'Cosmetics': { icon: 'Wallet', keywords: ['cosmetics', 'makeup', 'sephora', 'nykaa'] },
    },
  },
  'Education': {
    subCategories: {
      'Tuition/Fees': { icon: 'University', keywords: ['tuition', 'fees', 'school', 'college', 'university'] },
      'Books/Supplies': { icon: 'Wallet', keywords: ['book', 'stationery'] },
    },
  },
  'Gifts and Donations': {
    subCategories: {
      'Gift': { icon: 'Gift', keywords: ['gift', 'present', 'birthday', 'wedding'] },
      'Donation': { icon: 'Wallet', keywords: ['donation', 'charity'] },
    },
  },
  'Travel': {
    subCategories: {
      'Hotel': { icon: 'Hotel', keywords: ['hotel', 'motel', 'resort', 'stay'] },
      'Bookings': { icon: 'Plane', keywords: ['airbnb', 'booking.com', 'makemytrip'] },
    },
  },
  'Uncategorized': {
    subCategories: {
      'Other': { icon: 'Wallet', keywords: [] },
    },
  },
};

/**
 * Classifies an expense description into a sub-category.
 * @param description The expense description.
 * @param categories A map of master categories to their sub-categories.
 * @returns The determined sub-category name, or 'Other' if no keywords match.
 */
export function classifyExpense(description: string, categories: Record<string, MasterCategory>): { master: string; sub: string } {
  if (!description) {
    return { master: 'Uncategorized', sub: 'Other' };
  }

  const lowerCaseDescription = description.toLowerCase();

  for (const masterCategoryName in categories) {
    const masterCategory = categories[masterCategoryName];
    if (masterCategory?.subCategories) {
        for (const subCategoryName in masterCategory.subCategories) {
          const subCategory = masterCategory.subCategories[subCategoryName];
          const keywords = subCategory.keywords || [];
          for (const keyword of keywords) {
            const keywordRegex = new RegExp(`\\b${keyword}\\b`, 'i');
            if (keywordRegex.test(lowerCaseDescription)) {
              return { master: masterCategoryName, sub: subCategoryName };
            }
          }
        }
    }
  }

  return { master: 'Uncategorized', sub: 'Other' };
}

export function getMasterCategory(subCategoryName: string, categories: Record<string, MasterCategory>): string {
    for (const masterCategoryName in categories) {
        const masterCategory = categories[masterCategoryName];
        if (masterCategory && masterCategory.subCategories && masterCategory.subCategories[subCategoryName]) {
            return masterCategoryName;
        }
    }
    return 'Uncategorized';
}
