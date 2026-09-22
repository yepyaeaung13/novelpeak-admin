"use client";

import { useParams, useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { useGetChapterDetails } from "@/query/book";

export default function Page() {
  const { id, chapterId } = useParams();
  const router = useRouter();
  const { data, isLoading } = useGetChapterDetails(
    chapterId as string,
    id as string,
  );

  if (isLoading) {
    return <div className="p-8">Loading chapter...</div>;
  }

  if (!data) {
    return <div className="p-8">Chapter not found.</div>;
  }

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
                  {data.title}
                </h1>
                <p className="text-sm text-neutral-600">
                  Chapter {data.chapterNumber}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 md:p-6 rounded-xl border border-neutral-200 shadow-sm h-full">
          <div
            className="chapter-content prose lg:prose-xl max-w-none text-neutral-700"
            dangerouslySetInnerHTML={{ __html: data.content || "<p>No content</p>" }}
          />
        </div>
      </div>
    </div>
  );
}
