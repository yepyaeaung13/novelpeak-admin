import { useMutation, useQuery } from "@tanstack/react-query";
import {
  addBookToLibrary,
  getBookDetails,
  getChapterDetails,
  getDiscoverBooks,
  getRecommendedBooks,
  getTrendingBooks,
  getUserBooks,
  removeBookFromLibrary,
  searchBooks,
} from "../service/book";

export const useGetDiscoverBooks = () => {
  return useQuery({
    queryKey: ["discoverBooks"],
    queryFn: () => getDiscoverBooks(),
  });
};

export const useGetTrendingBooks = () => {
  return useQuery({
    queryKey: ["trendingBooks"],
    queryFn: () => getTrendingBooks(),
  });
};

export const useGetRecommendedBooks = () => {
  return useQuery({
    queryKey: ["recommendedBooks"],
    queryFn: () => getRecommendedBooks(),
  });
};

export const useGetBookDetails = (bookId: string | undefined) => {
  return useQuery({
    queryKey: ["bookDetails", bookId],
    queryFn: () => getBookDetails(bookId!),
    enabled: !!bookId,
  });
};

export const useGetChapterDetails = (chapterId: string | undefined) => {
  return useQuery({
    queryKey: ["chapterDetails", chapterId],
    queryFn: () => getChapterDetails(chapterId!),
    enabled: !!chapterId,
  });
};

export const useSearchBooks = (query: string) => {
  return useQuery({
    queryKey: ["searchBooks", query],
    queryFn: () => searchBooks(query),
  });
};

export const useGetUserBooks = () => {
  return useQuery({
    queryKey: ["userBooks"],
    queryFn: () => getUserBooks(),
  });
};

export const useAddBookToLibrary = (bookId: string) => {
  return useMutation({
    mutationFn: () => addBookToLibrary(bookId),
  });
};

export const useRemoveBookFromLibrary = (bookId: string) => {
  return useMutation({
    mutationFn: () => removeBookFromLibrary(bookId),
  });
};