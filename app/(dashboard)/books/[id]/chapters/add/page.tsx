"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { ChevronLeft, Eye, Pencil } from "lucide-react";
import { Input } from "@/components/ui/input";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { useAddChapter } from "@/query/book";

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
  const [chapterNumber, setChapterNumber] = useState(Number(nextChapter) || 1);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isPreview, setIsPreview] = useState(false);
  const [saveError, setSaveError] = useState("");

  // Helper to strip HTML tags from content (plain text extraction)
  const stripHtml = (html: string) => {
    return html.replace(/<[^>]*>/g, "").trim();
  };

  const isContentEmpty = useMemo(() => {
    return stripHtml(content).length === 0;
  }, [content]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!id || isUploadingImage) return;
    setSaveError("");

    addChapter(
      { title, content, chapterNumber },
      {
        onSuccess: () => {
          router.push(`/books/${id}`);
        },
        onError: () => setSaveError("Could not save the chapter. Please try again."),
      },
    );
  };

  return (
    <div className="w-full p-4 md:p-5 min-h-screen bg-neutral-50">
      <div className="max-w-5xl mx-auto space-y-4 md:space-y-6">
        {/* Header */}
        <div className="bg-white rounded-xl border border-neutral-200 shadow-sm px-4 md:px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3 sm:gap-4">
              <button
                onClick={() => router.push(`/books/${id}`)}
                className="w-10 h-10 border rounded-lg flex items-center justify-center hover:bg-neutral-100 transition"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="min-w-0">
                <h1 className="text-base md:text-lg font-semibold text-neutral-900">
                  New Chapter
                </h1>
                <p className="text-sm text-neutral-500 truncate max-w-[200px] sm:max-w-none">
                  {bookTitle} • Ch. {chapterNumber}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="hidden sm:flex items-center px-3 py-1 rounded-md bg-neutral-100 text-sm text-neutral-600">
                #{chapterNumber}
              </div>
              <div className="hidden sm:block w-px h-6 bg-neutral-300"></div>
              <button
                type="button"
                onClick={() => router.back()}
                className="px-3 sm:px-4 py-2 text-sm border rounded-lg hover:bg-neutral-100 transition"
              >
                Cancel
              </button>
              <button
                form="chapterForm"
                type="submit"
                disabled={isSaving || isUploadingImage || !id || !title.trim() || isContentEmpty}
                className="px-3 sm:px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
              >
                {isSaving ? "Saving..." : isUploadingImage ? "Uploading..." : "Save"}
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 md:p-6 rounded-xl border border-neutral-200 shadow-sm">
          <form id="chapterForm" onSubmit={handleSubmit} className="space-y-4">
            {saveError && <p role="alert" className="text-sm text-red-600">{saveError}</p>}
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

            <button
              type="button"
              onClick={() => setIsPreview((current) => !current)}
              className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-neutral-50"
            >
              {isPreview ? <Pencil size={16} /> : <Eye size={16} />}
              {isPreview ? "Edit" : "Preview"}
            </button>

            <div className={isPreview ? "hidden" : ""}>
              <RichTextEditor
              value={content}
              placeholder="Chapter content"
              className="h-full"
              onChange={(value) => setContent(value)}
              onUploadChange={setIsUploadingImage}
              />
            </div>
            {isPreview && (
              <div className="chapter-content prose prose-neutral max-w-none min-h-64 border border-neutral-200 p-4" dangerouslySetInnerHTML={{ __html: content || "<p>No content</p>" }} />
            )}
          </form>

        </div>
      </div>
    </div>
  );
}
