"use client";

import { ChevronLeft, Plus, Trash2 } from "lucide-react";
import dayjs from "dayjs";
import {
  useGetBookDetails,
  useUpdateBook,
  useDeleteChapter,
} from "@/query/book";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useParams, useRouter } from "next/navigation";
import { SubmitEvent, Suspense, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TablePagination } from "@/components/table-pagination";
import { uploadImage } from "@/service/common";

type Book = {
  title: string;
  author: string;
  description: string;
  coverImage: null | string;
};

type Chapter = {
  id: number;
  title: string;
  content: string;
  chapterNumber: number;
  createdAt: string;
  updatedAt: string;
};

export default function Page() {
  return (
    <Suspense fallback={<div className="p-8">Loading book details…</div>}>
      <BookDetail />
    </Suspense>
  );
}

function BookDetail() {
  const router = useRouter();
  const { id } = useParams();
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const { data, isLoading } = useGetBookDetails(id as string);
  const { mutate: updateBook, isPending: isUpdating } = useUpdateBook(
    id as string,
  );
  const { mutate: deleteChapter } = useDeleteChapter(id as string);

  const [bookEdits, setBookEdits] = useState<Partial<Book>>({});
  const [imageFile, setImageFile] = useState<File | null>(null);

  const book = useMemo(
    () => ({
      title: data?.title ?? "",
      author: data?.author ?? "",
      description: data?.description ?? "",
      coverImage: data?.coverImage ?? null,
      ...bookEdits,
    }),
    [data, bookEdits],
  );

  const chapterCount = useMemo(() => data?.chapters?.length ?? 0, [data]);
  const totalChapterPages = Math.max(1, Math.ceil(chapterCount / limit));

  const handleSaveBook = async (e: SubmitEvent) => {
    e.preventDefault();

    let coverImage = null;
    if (imageFile) {
      const res = await uploadImage(imageFile);
      console.log("res", res);
      coverImage = res.url;
    }

    updateBook({
      title: book.title,
      author: book.author,
      description: book.description,
      coverImage: coverImage ?? book.coverImage,
    });
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (!file) return;

    setImageFile(file);
    setBookEdits((prev) => ({
      ...prev,
      coverImage: URL.createObjectURL(file),
    }));
  };

  const goToChapter = (chapterId: number) => {
    router.push(`/books/${id}/chapters/${chapterId}`);
  };

  const goToAddChapter = () => {
    router.push(
      `/books/${id}/chapters/add?bookId=${id}&book-title=${book.title}&next-chapter=${data?.chapters?.length + 1}`,
    );
  };

  if (isLoading) {
    return <div className="p-8">Loading book details…</div>;
  }

  return (
    <div className="w-full p-5 space-y-6 bg-neutral-50 min-h-screen">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header Section */}
        <div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push("/books")}
                className="bg-neutral-100 hover:bg-neutral-200 w-10 h-10 flex justify-center items-center rounded-lg transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-neutral-900">
                  {data?.title || "Book Details"}
                </h1>
                <p className="text-sm text-neutral-600 mt-1">
                  by {data?.author || "Unknown Author"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-sm text-neutral-500">Chapters</div>
                <div className="text-lg font-semibold text-neutral-900">
                  {chapterCount}
                </div>
              </div>
              <div className="w-px h-8 bg-neutral-300"></div>
              <button
                onClick={goToAddChapter}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors font-medium"
              >
                <Plus className="w-4 h-4" />
                Add Chapter
              </button>
              <button
                form="book"
                type="submit"
                disabled={isUpdating}
                className="bg-neutral-800 hover:bg-neutral-900 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 font-medium"
              >
                {isUpdating ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>

        <div className="w-full bg-white rounded-xl flex gap-5 p-5 border border-neutral-200 shadow-sm">
          <div className="w-1/3">
            <div className="relative border border-neutral-200 rounded-xl overflow-hidden h-64 flex items-center justify-center bg-neutral-50">
              {book.coverImage ? (
                <img
                  src={book.coverImage}
                  alt="cover"
                  className="object-contain h-full"
                />
              ) : (
                <span className="text-neutral-400">No cover image</span>
              )}
            </div>
            <label
              htmlFor="coverImage"
              className="mt-3 block w-full border border-dashed border-neutral-300 rounded-md text-center py-2 cursor-pointer text-sm text-neutral-600 hover:bg-neutral-50 transition-colors"
            >
              Select cover image
              <input
                type="file"
                accept="image/*"
                className="hidden"
                id="coverImage"
                onChange={handleCoverChange}
              />
            </label>
          </div>

          <form id="book" onSubmit={handleSaveBook} className="w-2/3 space-y-4">
            <Input
              type="text"
              placeholder="Book title"
              value={book.title}
              onChange={(e) =>
                setBookEdits({ ...bookEdits, title: e.target.value })
              }
            />
            <Input
              type="text"
              placeholder="Author name"
              value={book.author}
              onChange={(e) =>
                setBookEdits({ ...bookEdits, author: e.target.value })
              }
            />
            <Textarea
              value={book.description}
              onChange={(e) =>
                setBookEdits({ ...bookEdits, description: e.target.value })
              }
              placeholder="Book description"
              className="h-36"
            />
          </form>
        </div>

        <div className="grid grid-cols-3 gap-3 text-sm">
          <div className="bg-white p-3 rounded-lg border border-neutral-200 shadow-sm">
            Total chapters: {chapterCount}
          </div>
          <div className="bg-white p-3 rounded-lg border border-neutral-200 shadow-sm">
            Cover: {book.coverImage ? "Uploaded" : "Missing"}
          </div>
          <div className="bg-white p-3 rounded-lg border border-neutral-200 shadow-sm">
            Updated:{" "}
            {data?.updatedAt
              ? dayjs(data?.updatedAt).format("YYYY-MM-DD HH:mm")
              : "-"}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
          <Table>
            <TableCaption className="py-3 text-neutral-600">
              List of chapters for this book.
            </TableCaption>
            <TableHeader className="bg-neutral-50">
              <TableRow>
                <TableHead className="w-32 font-semibold text-neutral-700">
                  Chapter #
                </TableHead>
                <TableHead className="font-semibold text-neutral-700">
                  Title
                </TableHead>
                <TableHead className="text-center font-semibold text-neutral-700">
                  Created At
                </TableHead>
                <TableHead className="text-center font-semibold text-neutral-700">
                  Updated At
                </TableHead>
                <TableHead className="w-20 text-center font-semibold text-neutral-700">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.chapters ?? []).map((chapter: Chapter) => (
                <TableRow
                  key={chapter.id}
                  className="hover:bg-neutral-50 transition-colors"
                >
                  <TableCell
                    onClick={() => goToChapter(chapter.id)}
                    className="font-medium hover:text-blue-600 cursor-pointer duration-200"
                  >
                    <p className="pl-2">{chapter.chapterNumber}</p>
                  </TableCell>
                  <TableCell
                    onClick={() => goToChapter(chapter.id)}
                    className="cursor-pointer hover:text-blue-600 transition-colors"
                  >
                    {chapter.title}
                  </TableCell>
                  <TableCell className="text-center text-neutral-600">
                    {chapter.createdAt
                      ? dayjs(chapter.createdAt).format("YYYY-MM-DD HH:mm")
                      : "-"}
                  </TableCell>
                  <TableCell className="text-center text-neutral-600">
                    {chapter.updatedAt
                      ? dayjs(chapter.updatedAt).format("YYYY-MM-DD HH:mm")
                      : "-"}
                  </TableCell>
                  <TableCell className="text-center">
                    <ConfirmDialog
                      trigger={
                        <button className="text-neutral-400 hover:text-red-500 transition-colors cursor-pointer p-1">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      }
                      title="Delete Chapter"
                      description={`Are you sure you want to delete &quot;${chapter.title}&quot;? This action cannot be undone.`}
                      onConfirm={() => deleteChapter(String(chapter.id))}
                      confirmText="Delete"
                      destructive
                    />
                  </TableCell>
                </TableRow>
              ))}

              {!data?.chapters?.length && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center py-4 text-neutral-500"
                  >
                    No chapters yet. Start with &quot;Add Chapter&quot;.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
            <TableFooter className="bg-neutral-50">
              <TableRow>
                <TableCell colSpan={1} className="text-neutral-600">
                  Rows per page {limit}
                </TableCell>
                <TableCell colSpan={4} className="text-right">
                  <TablePagination
                    pageCount={totalChapterPages}
                    page={page}
                    setPage={setPage}
                  />
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      </div>
    </div>
  );
}
