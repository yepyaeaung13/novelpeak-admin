import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addBook,
  addBookToLibrary,
  getBookDetails,
  getBooks,
  getChapterDetails,
  getDiscoverBooks,
  getRecommendedBooks,
  getTrendingBooks,
  getUserBooks,
  removeBookFromLibrary,
  searchBooks,
  updateBook,
  addChapter,
  updateChapter,
  deleteChapter,
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

export const useGetBooks = (params: {
  page: number;
  limit: number;
  category?: string;
  searchText?: string;
}) => {
  return useQuery({
    queryKey: ["books", params],
    queryFn: () => getBooks(params),
  });
};

export const useAddBook = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (bookData: {
      title: string;
      author: string;
      description: string;
      coverImage: string | null;
    }) => addBook(bookData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["books"], refetchType: "active" });
      queryClient.invalidateQueries({ queryKey: ["discoverBooks"], refetchType: "active" });
    },
  });
};

export const useUpdateBook = (bookId: string | undefined) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (bookData: {
      title: string;
      author: string;
      description: string;
      coverImage: string | null;
    }) => updateBook(bookId!, bookData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookDetails", bookId], refetchType: "active" });
      queryClient.invalidateQueries({ queryKey: ["books"], refetchType: "active" });
    },
  });
};

export const useAddChapter = (bookId: string | undefined) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (chapterData: {
      title: string;
      content: string;
      chapterNumber: number;
    }) => addChapter(bookId!, chapterData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookDetails", bookId], refetchType: "active" });
    },
  });
};

export const useUpdateChapter = (chapterId: string | undefined) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (chapterData: {
      title: string;
      content: string;
      chapterNumber: number;
    }) => updateChapter(chapterId!, chapterData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chapterDetails", chapterId], refetchType: "active" });
      queryClient.invalidateQueries({ queryKey: ["bookDetails"], refetchType: "active" });
    },
  });
};

export const useDeleteChapter = (bookId: string | undefined) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (chapterId: string) => deleteChapter(chapterId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookDetails", bookId], refetchType: "active" });
    },
  });
};
