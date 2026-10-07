import type { BookFormData } from "@/lib/book";
import axiosClient from "../lib/axios";


export const getDiscoverBooks = async () => {
  const res = await axiosClient.get("/v1/books/discover");
  return res.data;
}

export const getTrendingBooks = async () => {
  const res = await axiosClient.get("/v1/books/trending");
  return res.data;
}

export const getRecommendedBooks = async () => {
  const res = await axiosClient.get("/v1/books/recommended");
  return res.data;
}

export const getBookDetails = async (bookId: string) => {
  const res = await axiosClient.get(`/admin/books/${bookId}`);
  return res.data
    ? { ...res.data, coverImage: res.data.cover }
    : res.data;
}

export const getChapterDetails = async (chapterId: string, bookId?: string) => {
  if (!bookId) throw new Error("Book ID is required for chapters.");
  const res = await axiosClient.get(`/admin/books/${bookId}/chapters/${chapterId}`);
  return res.data;
}

export const searchBooks = async (query: string) => {
  const res = await axiosClient.get("/v1/books/search", {
    params: { q: query }
  });
  return res.data;
}

export const getUserBooks = async () => {
  const res = await axiosClient.get("/v1/books/user");
  return res.data;
}

export const addBookToLibrary = async (bookId: string) => {
  const res = await axiosClient.post(`/v1/books/${bookId}/add`);
  return res.data;
}

export const removeBookFromLibrary = async (bookId: string) => {
  const res = await axiosClient.post(`/v1/books/${bookId}/remove`);
  return res.data;
}

export const getBooks = async (params: {
  page: number;
  limit: number;
  searchText?: string;
}) => {
  const res = await axiosClient.get("/admin/books");
  const books = (res.data as Array<{
      id: string;
      title: string;
      author: string;
      cover: string;
    }>).filter((book) => !params.searchText ||
      `${book.title} ${book.author}`.toLowerCase().includes(params.searchText.toLowerCase()));
  const start = (params.page - 1) * params.limit;
  return {
    data: books.slice(start, start + params.limit).map((book) => ({
      ...book,
      coverImage: book.cover,
    })),
    meta: { total: books.length, totalPages: Math.max(1, Math.ceil(books.length / params.limit)) },
  };
}

export const addBook = async (bookData: BookFormData) => {
  const res = await axiosClient.post(
    "/books",
    {
      title: bookData.title,
      author: bookData.author,
      description: bookData.description,
      bookType: bookData.bookType,
      genres: bookData.genres,
      status: bookData.status,
      language: bookData.language,
      publicationStatus: bookData.publicationStatus,
      cover: bookData.coverImage ?? "",
    },
  );
  return res.data;
};

export const updateBook = async (bookId: string, bookData: BookFormData) => {
  const { coverImage, ...metadata } = bookData;
  const res = await axiosClient.patch(`/books/${bookId}`, { ...metadata, cover: coverImage ?? "" });
  return res.data;
};

export const addChapter = async (bookId: string, chapterData: {
  title: string;
  content: string;
  chapterNumber: number;
}) => {
  const res = await axiosClient.post(`/books/${bookId}/chapters`, chapterData);
  return res.data;
};

export const updateChapter = async (bookId: string, chapterId: string, chapterData: {
  title: string;
  content: string;
  chapterNumber: number;
}) => {
  const res = await axiosClient.patch(`/books/${bookId}/chapters/${chapterId}`, chapterData);
  return res.data;
};

export const getChapterList = async (bookId: string | undefined, params: { page: number; limit: number; }) => {
  const res = await axiosClient.get(`/admin/books/${bookId}/chapters`);
  const chapters = (res.data as Array<{
    id: string;
    title: string;
    chapterNumber: number;
  }>).sort(
      (a, b) => a.chapterNumber - b.chapterNumber,
    );
  const start = (params.page - 1) * params.limit;
  return {
    data: chapters.slice(start, start + params.limit),
    meta: {
      total: chapters.length,
      totalPages: Math.max(1, Math.ceil(chapters.length / params.limit)),
      nextChapterNumber: chapters.reduce((max, chapter) => Math.max(max, chapter.chapterNumber), 0) + 1,
    },
  };
}
