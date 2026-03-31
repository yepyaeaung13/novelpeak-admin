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
  const res = await axiosClient.get(`/v1/books/${bookId}`);
  return res.data;
}

export const getChapterDetails = async (chapterId: string) => {
  const res = await axiosClient.get(`/v1/books/chapters/${chapterId}`);
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
  category?: string;
  searchText?: string;
}) => {
  const res = await axiosClient.get("/v1/books", {
    params,
  });
  return res.data;
}

export const addBook = async (bookData: {
  title: string;
  author: string;
  description: string;
  coverImage: string | null;
}) => {
  const res = await axiosClient.post("/v1/books", bookData);
  return res.data;
};

export const updateBook = async (bookId: string, bookData: {
  title: string;
  author: string;
  description: string;
  coverImage: string | null;
}) => {
  const res = await axiosClient.put(`/v1/books/${bookId}`, bookData);
  return res.data;
};

export const addChapter = async (bookId: string, chapterData: {
  title: string;
  content: string;
  chapterNumber: number;
}) => {
  const res = await axiosClient.post(`/v1/books/${bookId}/chapters`, chapterData);
  return res.data;
};

export const updateChapter = async (chapterId: string, chapterData: {
  title: string;
  content: string;
  chapterNumber: number;
}) => {
  const res = await axiosClient.put(`/v1/books/chapters/${chapterId}`, chapterData);
  return res.data;
};

export const deleteChapter = async (chapterId: string) => {
  const res = await axiosClient.delete(`/v1/books/chapters/${chapterId}`);
  return res.data;
};

export const bookTranslate = async (text: string, targetLang: string) => {
  const res = await axiosClient.post("/v1/books/translate", { text, targetLang });
  return res.data;
}

export const getChapterList = async (bookId: string | undefined, params: { page: number; limit: number; }) => {
  const res = await axiosClient.get(`/v1/books/${bookId}/chapters`, { params });
  return res.data;
}