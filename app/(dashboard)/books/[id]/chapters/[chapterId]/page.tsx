"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import axios from "axios";
import { ChevronLeft, Pencil, SpellCheck } from "lucide-react";
import { useGetChapterDetails, useUpdateChapter } from "@/query/book";
import { Input } from "@/components/ui/input";
import { RichTextEditor } from "@/components/ui/rich-text-editor";

const stripHtml = (html: string) => html.replace(/<[^>]*>/g, "").trim();

export default function Page() {
  const { id, chapterId } = useParams();
  const router = useRouter();
  const { data, isLoading } = useGetChapterDetails(
    chapterId as string,
    id as string,
  );
  const { mutate: updateChapter, isPending: isSaving } = useUpdateChapter(
    id as string,
    chapterId as string,
  );

  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [chapterNumber, setChapterNumber] = useState(1);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);

  if (isLoading) {
    return <div className="p-8">Loading chapter...</div>;
  }

  if (!data) {
    return <div className="p-8">Chapter not found.</div>;
  }

  const isContentEmpty = stripHtml(content).length === 0 && !/<img\b/i.test(content);
  const canSave =
    !isSaving &&
    !isUploadingImage &&
    title.trim().length > 0 &&
    !isContentEmpty &&
    chapterNumber >= 1;

  const handleStartEdit = () => {
    setTitle(data.title);
    setContent(data.content || "");
    setChapterNumber(data.chapterNumber);
    setSaveError("");
    setSaveSuccess(false);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setSaveError("");
  };

  const handleSave = () => {
    if (!canSave) return;
    setSaveError("");
    setSaveSuccess(false);

    updateChapter(
      {
        title: title.trim(),
        content,
        chapterNumber,
      },
      {
        onSuccess: () => {
          setIsEditing(false);
          setSaveSuccess(true);
        },
        onError: (error) => {
          const message = axios.isAxiosError(error)
            ? error.response?.data?.message
            : undefined;
          setSaveError(
            typeof message === "string"
              ? message
              : "Could not save the chapter. Please try again.",
          );
        },
      },
    );
  };

  return (
    <div className="w-full p-4 md:p-5 bg-neutral-50 min-h-screen">
      <div className="max-w-5xl mx-auto space-y-4 md:space-y-6 h-full">
        {/* Header Section */}
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
                <h1 className="text-base md:text-lg font-bold text-neutral-900 truncate">
                  {isEditing ? "Edit chapter" : data.title}
                </h1>
                <p className="text-sm text-neutral-600">
                  {isEditing
                    ? "Update the title, number or content."
                    : `Chapter ${data.chapterNumber}`}
                </p>
              </div>
            </div>

            {!isEditing ? (
              <div className="flex items-center gap-2 sm:gap-3">
                {saveSuccess && (
                  <span className="text-sm text-green-600">Saved</span>
                )}
                <Link
                  href={`/books/${id}/chapters/${chapterId}/review`}
                  className="inline-flex items-center gap-2 rounded-lg border px-3 sm:px-4 py-2 text-sm hover:bg-neutral-100 transition"
                >
                  <SpellCheck size={16} />
                  Review
                </Link>
                <button
                  type="button"
                  onClick={handleStartEdit}
                  className="inline-flex items-center gap-2 rounded-lg border px-3 sm:px-4 py-2 text-sm hover:bg-neutral-100 transition"
                >
                  <Pencil size={16} />
                  Edit
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={isSaving || isUploadingImage}
                  className="px-3 sm:px-4 py-2 text-sm border rounded-lg hover:bg-neutral-100 transition disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={!canSave}
                  className="px-3 sm:px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {isSaving
                    ? "Saving..."
                    : isUploadingImage
                    ? "Uploading..."
                    : "Save"}
                </button>
              </div>
            )}
          </div>
        </div>

        {saveError && (
          <p role="alert" className="text-sm text-red-600">{saveError}</p>
        )}

        <div className="bg-white p-4 md:p-6 rounded-xl border border-neutral-200 shadow-sm h-full">
          {isEditing ? (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-[1fr_160px]">
                <Input
                  type="text"
                  placeholder="Chapter title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
                <Input
                  type="number"
                  min={1}
                  value={chapterNumber.toString()}
                  onChange={(e) => setChapterNumber(Number(e.target.value))}
                  placeholder="1"
                />
              </div>

              <RichTextEditor
                value={content}
                placeholder="Chapter content"
                onChange={(value) => setContent(value)}
                onUploadChange={setIsUploadingImage}
              />
            </div>
          ) : (
            <div
              className="chapter-content prose lg:prose-xl max-w-none text-neutral-700"
              dangerouslySetInnerHTML={{ __html: data.content || "<p>No content</p>" }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
