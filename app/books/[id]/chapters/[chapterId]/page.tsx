"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, Trash2 } from "lucide-react";
import dayjs from "dayjs";
import { Input } from "@/components/ui/input";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { useGetChapterDetails, useUpdateChapter, useDeleteChapter } from "@/query/book";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export default function Page() {
  const { id, chapterId } = useParams();
  const router = useRouter();
  const { data, isLoading, isError } = useGetChapterDetails(chapterId as string);
  const { mutate: updateChapter, isPending: isSaving } = useUpdateChapter(chapterId as string);
  const { mutate: deleteChapter } = useDeleteChapter(id as string);

  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [chapterNumber, setChapterNumber] = useState(1);

  useEffect(() => {
    if (isError) {
      // optional: handle errors, maybe show toast
    }
  }, [isError]);

  const isContentEmpty = useMemo(() => {
    return content.replace(/<[^>]+>/g, "").trim().length === 0;
  }, [content]);

  const handleSave = () => {
    if (!chapterId) return;

    updateChapter(
      { title, content, chapterNumber },
      {
        onSuccess: () => {
          setIsEditing(false);
        },
      },
    );
  };

  if (isLoading) {
    return <div className="p-8">Loading chapter...</div>;
  }

  if (!data) {
    return <div className="p-8">Chapter not found.</div>;
  }

  return (
    <div className="w-full p-5 bg-neutral-50 min-h-screen">
      <div className="max-w-5xl mx-auto space-y-6 h-full">
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
                <h1 className="text-2xl font-bold text-neutral-900">{isEditing ? "Edit Chapter" : data.title}</h1>
                <p className="text-sm text-neutral-600 mt-1">Chapter {chapterNumber}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <ConfirmDialog
                trigger={
                  <button className="bg-red-50 hover:bg-red-100 text-red-600 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors font-medium">
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                }
                title="Delete Chapter"
                description={`Are you sure you want to delete "${data?.title || 'this chapter'}"? This action cannot be undone.`}
                onConfirm={() => {
                  deleteChapter(chapterId as string, {
                    onSuccess: () => router.push(`/books/${id}`),
                  });
                }}
                confirmText="Delete"
                destructive
              />
              {isEditing ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(false);
                    }}
                    className="bg-neutral-100 hover:bg-neutral-200 text-neutral-700 px-4 py-2 rounded-lg transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={isSaving || !title.trim() || isContentEmpty}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 font-medium"
                  >
                    {isSaving ? "Saving..." : "Save"}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    if (data) {
                      setTitle(data.title || "");
                      setContent(data.content || "");
                      setChapterNumber(data.chapterNumber || 1);
                    }
                    setIsEditing(true);
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors font-medium"
                >
                  Edit
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-neutral-200 shadow-sm h-full">
          {isEditing ? (
            <div className="space-y-4 h-full">
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
                required
              />
              <RichTextEditor value={content} onChange={setContent} placeholder="Chapter content" className="h-full" />
            </div>
          ) : (
            <div className="prose lg:prose-xl max-w-none text-neutral-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: data.content || "<p>No content</p>" }} />
          )}
          <div className="mt-6 text-xs text-neutral-500 flex gap-5">
            <span>Created: {data.createdAt ? dayjs(data.createdAt).format("YYYY-MM-DD HH:mm") : "-"}</span>
            <span>Updated: {data.updatedAt ? dayjs(data.updatedAt).format("YYYY-MM-DD HH:mm") : "-"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
