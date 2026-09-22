"use client";

import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import {
  useGetBookDetails,
  useUpdateBook,
  useGetChaptersList,
} from "@/query/book";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { uploadImage } from "@/service/common";
import { cn } from "@/lib/utils";

type ChapterRow = {
  id: string;
  title: string;
  chapterNumber: number;
};

export default function Page() {
  const router = useRouter();
  const { id } = useParams();
  const [limit, setLimit] = useState<number>(10);
  const [page, setPage] = useState<number>(1);

  const { data, isLoading } = useGetBookDetails(id as string);
  const { data: chapters, isLoading: chaptersLoading } = useGetChaptersList(
    id as string,
    { page, limit },
  );
  const { mutateAsync: updateBook, isPending } = useUpdateBook(id as string);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);

  const book = {
    title: data?.title ?? "",
    author: data?.author ?? "",
    description: data?.description ?? "",
    coverImage: data?.coverImage ?? null,
  };

  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    setSaveError("");
    setSaveSuccess(false);
    try {
      let coverImage = book.coverImage;
      if (imageFile) {
        const res = await uploadImage(imageFile);
        coverImage = res.url;
      }

      await updateBook({ ...book, coverImage });
      setImageFile(null);
      setSaveSuccess(true);
    } catch {
      setSaveError("Could not save the book. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <div className="p-6">Loading...</div>;

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-4 md:space-y-6">
      {/* 🔷 Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div className="flex items-center gap-3 sm:gap-4">
          <button
            onClick={() => router.push("/books")}
            className="w-10 h-10 border rounded-lg flex items-center justify-center hover:bg-neutral-100 bg-white"
          >
            <ChevronLeft size={18} />
          </button>

          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-semibold truncate">{book.title}</h1>
            <p className="text-sm text-neutral-500">
              {chapters?.meta?.total ?? 0} chapters
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => router.push(`/books/${id}/chapters/add?next-chapter=${chapters?.meta?.nextChapterNumber ?? 1}&book-title=${encodeURIComponent(book.title)}`)}
            className="flex items-center gap-2 px-3 py-2 bg-neutral-900 text-white rounded-lg text-sm"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">Add Chapter</span>
          </button>

          <button
            onClick={handleSave}
            disabled={isSaving || isPending || !imageFile}
            className="px-3 py-2 border rounded-lg text-sm bg-white"
          >
            {isSaving || isPending ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      {/* 🔷 Content */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        {/* Left */}
        <div className="bg-white border rounded-xl p-4 md:p-5 space-y-4">
          <div className="aspect-[3/4] max-h-64 mx-auto bg-neutral-100 rounded-lg overflow-hidden flex items-center justify-center w-full md:h-64">
            {book.coverImage ? (
              <img
                src={book.coverImage}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-neutral-400">No cover</span>
            )}
          </div>

          <label className="block">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                setImageFile(e.target.files?.[0] ?? null);
                setSaveError("");
                setSaveSuccess(false);
              }}
              className="hidden"
            />
            <div className="text-center text-sm border border-dashed rounded-lg py-2 cursor-pointer hover:bg-neutral-100">
              {imageFile ? imageFile.name : "Choose Image"}
            </div>
          </label>

          {saveError && <p role="alert" className="text-sm text-red-600">{saveError}</p>}
          {saveSuccess && <p role="status" className="text-sm text-green-700">Book saved.</p>}

        </div>

        {/* Right */}
        <div className="md:col-span-2 bg-white border rounded-xl p-4 md:p-6 space-y-4">
          <Input
            value={book.title}
            readOnly
          />
          <Input
            value={book.author}
            readOnly
          />
          <Textarea
            value={book.description}
            readOnly
            className="h-32 md:h-40"
          />
        </div>
      </div>

      {/* 🔷 Chapters */}
      <div className="bg-white border rounded-xl overflow-hidden">
        <div className="px-4 md:px-5 py-3 border-b text-sm text-neutral-500">
          Chapters
        </div>

        <div>
          {chapters?.data
            ?.slice()
            .sort((a: ChapterRow, b: ChapterRow) => a.chapterNumber - b.chapterNumber)
            .map((c: ChapterRow) => (
              <div
                key={c.id}
                className="flex justify-between items-center px-4 md:px-5 py-3 border-b hover:bg-neutral-50"
              >
                <div
                  onClick={() => router.push(`/books/${id}/chapters/${c.id}`)}
                  className="cursor-pointer min-w-0 flex-1"
                >
                  <p className="font-medium truncate">
                    Ch. {c.chapterNumber}: {c.title}
                  </p>
                </div>

              </div>
            ))}
        </div>

        {!chapters?.data?.length && (
          <div className="text-center py-10 text-neutral-400">
            No chapters yet
          </div>
        )}

        {/* 🔷 Pagination */}
        {/* {chapters?.meta?.totalPages > 1 && ( */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 md:px-5 py-4">
          {/* Left: Limit Selector */}
          <div className="flex items-center gap-2 text-sm order-2 sm:order-1">
            <span className="text-neutral-500">Show</span>

            <select
              value={limit}
              onChange={(e) => {
                setPage(1); // reset page
                setLimit(Number(e.target.value));
              }}
              className="border rounded-lg px-2 py-1 dark:bg-neutral-900"
            >
              {[5, 10, 20, 50].map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>

            <span className="text-neutral-500">chapters</span>
          </div>

          {/* Right: Navigation */}
          <div className="flex items-center gap-3 sm:gap-5 order-1 sm:order-2">
            <button
              disabled={page === 1 || chaptersLoading}
              onClick={() => setPage(page - 1)}
              className={cn(
                "flex items-center gap-1 px-2 sm:px-3 py-2 rounded-lg border text-sm transition",
                "hover:bg-neutral-100 dark:hover:bg-neutral-800",
                page === 1 && "opacity-50 cursor-not-allowed",
              )}
            >
              <ChevronLeft size={16} />
              <span className="hidden sm:inline">Prev</span>
            </button>
            {/* Center: Page Info */}
            <div className="text-sm text-neutral-500">
              <span className="sm:hidden">
                {page}/{chapters?.meta?.totalPages}
              </span>
              <span className="hidden sm:inline">
                Page{" "}
                <span className="font-medium text-neutral-800 dark:text-neutral-200">
                  {page}
                </span>{" "}
                of {chapters?.meta?.totalPages}
              </span>
            </div>
            <button
              disabled={page === chapters?.meta?.totalPages || chaptersLoading}
              onClick={() => setPage(page + 1)}
              className={cn(
                "flex items-center gap-1 px-2 sm:px-3 py-2 rounded-lg border text-sm transition",
                "hover:bg-neutral-100 dark:hover:bg-neutral-800",
                page === chapters?.meta?.totalPages &&
                  "opacity-50 cursor-not-allowed",
              )}
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
        {/* )} */}
      </div>
    </div>
  );
}
