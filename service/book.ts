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