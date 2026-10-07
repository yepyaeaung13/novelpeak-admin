export const BOOK_TYPES = ["Novel", "Light Novel", "Short Story"] as const;
export const GENRES = ["Action", "Adventure", "Fantasy", "Romance", "Drama", "Comedy", "Mystery", "Thriller", "Horror", "Sci-Fi", "Historical", "Slice of Life"] as const;
export const STORY_STATUSES = ["Ongoing", "Completed", "Hiatus", "Dropped"] as const;
export const LANGUAGES = ["Burmese", "English"] as const;
export interface BookFormData {
  title: string;
  author: string;
  description: string;
  coverImage: string | null;
  bookType: typeof BOOK_TYPES[number];
  genres: string[];
  status: typeof STORY_STATUSES[number];
  language: typeof LANGUAGES[number];
  publicationStatus: "Draft" | "Published";
}
export const emptyBook: BookFormData = {
  title: "", author: "", description: "", coverImage: null,
  bookType: "Novel", genres: [], status: "Ongoing", language: "Burmese",
  publicationStatus: "Draft",
};
