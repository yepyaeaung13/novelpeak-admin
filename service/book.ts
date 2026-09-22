import axiosClient, { isOakApi } from "../lib/axios";

const unsupported = (operation: string): never => {
  throw new Error(`${operation} is not available in the Oak API yet.`);
};

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
  const res = await axiosClient.get(isOakApi ? `/books/${bookId}` : `/v1/books/${bookId}`);
  return isOakApi && res.data
    ? { ...res.data, coverImage: res.data.cover }
    : res.data;
}

export const getChapterDetails = async (chapterId: string, bookId?: string) => {
  if (isOakApi && !bookId) throw new Error("Book ID is required for Oak chapters.");
  const res = await axiosClient.get(isOakApi
    ? `/books/${bookId}/chapters/${chapterId}`
    : `/v1/books/chapters/${chapterId}`);
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
  if (isOakApi) {
    const res = await axiosClient.get("/books");
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
  const res = await axiosClient.post(
    isOakApi ? "/books" : "/v1/books",
    isOakApi ? {
      title: bookData.title,
      author: bookData.author,
      description: bookData.description,
      cover: bookData.coverImage ?? "",
    } : bookData,
  );
  return res.data;
};

export const updateBook = async (bookId: string, bookData: {
  title: string;
  author: string;
  description: string;
  coverImage: string | null;
}) => {
  if (isOakApi) unsupported("Book editing");
  const res = await axiosClient.put(`/v1/books/${bookId}`, bookData);
  return res.data;
};

export const addChapter = async (bookId: string, chapterData: {
  title: string;
  content: string;
  chapterNumber: number;
}) => {
  const res = await axiosClient.post(
    isOakApi ? `/books/${bookId}/chapters` : `/v1/books/${bookId}/chapters`,
    chapterData,
  );
  return res.data;
};

export const updateChapter = async (chapterId: string, chapterData: {
  title: string;
  content: string;
  chapterNumber: number;
}) => {
  if (isOakApi) unsupported("Chapter editing");
  const res = await axiosClient.put(`/v1/books/chapters/${chapterId}`, chapterData);
  return res.data;
};

export const deleteChapter = async (chapterId: string) => {
  if (isOakApi) unsupported("Chapter deletion");
  const res = await axiosClient.delete(`/v1/books/chapters/${chapterId}`);
  return res.data;
};

export const bookTranslate = async (text: string, targetLang: string) => {
  if (isOakApi) unsupported("Translation");
  const res = await axiosClient.post("/v1/books/translate", { text, targetLang });
  return res.data;
}

export const getChapterList = async (bookId: string | undefined, params: { page: number; limit: number; }) => {
  if (isOakApi) {
    const res = await axiosClient.get(`/books/${bookId}/chapters`);
    const chapters = (res.data as Array<{ chapterNumber: number }>).sort(
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
  const res = await axiosClient.get(`/v1/books/${bookId}/chapters`, { params });
  return res.data;
}
