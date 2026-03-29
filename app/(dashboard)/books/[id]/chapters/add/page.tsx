"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { ChevronLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { useAddChapter, useGetBookDetails } from "@/query/book";

export default function Page() {
  const { id } = useParams();
  const searchQuery = useSearchParams();
  const router = useRouter();
  const nextChapter = searchQuery.get("next-chapter");
  const bookTitle = searchQuery.get("book-title");

  const { mutate: addChapter, isPending: isSaving } = useAddChapter(
    id as string,
  );

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [chapterNumber, setChapterNumber] = useState(Number(nextChapter));

  const isContentEmpty = useMemo(() => {
    return content.replace(/<[^>]+>/g, "").trim().length === 0;
  }, [content]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!id) return;

    addChapter(
      { title, content, chapterNumber },
      {
        onSuccess: () => {
          router.push(`/books/${id}`);
        },
      },
    );
  };

  return (
    <div className="w-full p-5 bg-neutral-50 min-h-screen">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* 🔷 Header Section (Improved UI) */}
        <div className="bg-white rounded-xl border border-neutral-200 shadow-sm px-6 py-4 flex items-center justify-between">
          {/* Left */}
          <div className="flex items-center gap-4">
            {/* Back Button */}
            <button
              onClick={() => router.push(`/books/${id}`)}
              className="w-10 h-10 border rounded-lg flex items-center justify-center hover:bg-neutral-100 transition"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            {/* Title */}
            <div className="flex flex-col">
              <h1 className="text-lg font-semibold text-neutral-900">
                New Chapter
              </h1>
              <p className="text-sm text-neutral-500">
                {bookTitle} • Chapter {chapterNumber}
              </p>
            </div>
          </div>

          {/* Right */}
          <div className="flex items-center gap-3">
            {/* Chapter Badge */}
            <div className="hidden sm:flex items-center px-3 py-1 rounded-md bg-neutral-100 text-sm text-neutral-600">
              #{chapterNumber}
            </div>

            {/* Divider */}
            <div className="hidden sm:block w-px h-6 bg-neutral-300"></div>

            {/* Cancel */}
            <button
              type="button"
              onClick={() => router.back()}
              className="px-4 py-2 text-sm border rounded-lg hover:bg-neutral-100 transition"
            >
              Cancel
            </button>

            {/* Save */}
            <button
              form="chapterForm"
              type="submit"
              disabled={isSaving || !id || !title.trim() || isContentEmpty}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-neutral-200 shadow-sm">
          <form id="chapterForm" onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="text"
              placeholder="Chapter title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />

            <Input
              type="number"
              min={1}
              value={chapterNumber.toString()}
              onChange={(e) => setChapterNumber(Number(e.target.value))}
              placeholder={`${chapterNumber}`}
              required
            />

            <RichTextEditor
              value={content}
              placeholder="Chapter content"
              className="h-full"
              onChange={(value) => setContent(value)}
            />
          </form>
        </div>
      </div>
    </div>
  );
}
