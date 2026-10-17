import quotes from '../data/quotes.json';

// Newest quote is the Quote of the Week; the rest form the archive.
export function getQuotes() {
  return [...quotes].sort((a, b) => new Date(b.date) - new Date(a.date));
}

export const getQuoteOfTheWeek = () => getQuotes()[0] ?? null;
