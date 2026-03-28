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
        {/* Header Section */}
        <div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push(`/books/${id}`)}
                className="bg-neutral-100 hover:bg-neutral-200 w-10 h-10 flex justify-center items-center rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-neutral-900">
                  Add New Chapter
                </h1>
                <p className="text-sm text-neutral-600 mt-1">
                  Book: <span className="font-medium">{bookTitle}</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-sm text-neutral-500">Chapter #</div>
                <div className="text-lg font-semibold text-neutral-900">
                  {chapterNumber}
                </div>
              </div>
              <div className="w-px h-8 bg-neutral-300"></div>
              <button
                type="button"
                onClick={() => router.back()}
                className="bg-neutral-100 hover:bg-neutral-200 text-neutral-700 px-4 py-2 rounded-lg transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                form="chapterForm"
                type="submit"
                disabled={isSaving || !id || !title.trim() || isContentEmpty}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 font-medium"
              >
                {isSaving ? "Saving..." : "Save Chapter"}
              </button>
            </div>
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
              value={chapterNumber}
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
