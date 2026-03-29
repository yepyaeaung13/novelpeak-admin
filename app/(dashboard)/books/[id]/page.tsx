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
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { TablePagination } from "@/components/table-pagination";
import { uploadImage } from "@/service/common";

export default function Page() {
  const router = useRouter();
  const { id } = useParams();

  const { data, isLoading } = useGetBookDetails(id as string);
  const { mutate: updateBook, isPending } = useUpdateBook(id as string);
  const { mutate: deleteChapter } = useDeleteChapter(id as string);

  const [bookEdits, setBookEdits] = useState<any>({});
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

  const handleSave = async () => {
    let coverImage = book.coverImage;

    if (imageFile) {
      const res = await uploadImage(imageFile);
      coverImage = res.url;
    }

    updateBook({
      ...book,
      coverImage,
    });
  };

  if (isLoading) return <div className="p-6">Loading...</div>;

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* 🔷 Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/books")}
            className="w-10 h-10 border rounded-lg flex items-center justify-center hover:bg-neutral-100 bg-white"
          >
            <ChevronLeft size={18} />
          </button>

          <div>
            <h1 className="text-xl font-semibold">{book.title}</h1>
            <p className="text-sm text-neutral-500">
              {data?.chapters?.length} chapters
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => router.push(`/books/${id}/chapters/add`)}
            className="flex items-center gap-2 px-3 py-2 bg-neutral-900 text-white rounded-lg text-sm"
          >
            <Plus size={16} />
            Add Chapter
          </button>

          <button
            onClick={handleSave}
            className="px-3 py-2 border rounded-lg text-sm bg-white"
          >
            {isPending ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      {/* 🔷 Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left */}
        <div className="bg-white border rounded-xl p-5 space-y-4">
          <div className="h-64 bg-neutral-100 rounded-lg overflow-hidden flex items-center justify-center">
            {book.coverImage ? (
              <img
                src={book.coverImage}
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
              onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
              className="hidden"
            />
            <div className="text-center text-sm border border-dashed rounded-lg py-2 cursor-pointer hover:bg-neutral-100">
              Choose Image
            </div>
          </label>

          <div className="text-sm text-neutral-500 space-y-1">
            <p>Updated: {dayjs(data?.updatedAt).format("YYYY-MM-DD HH:mm")}</p>
          </div>
        </div>

        {/* Right */}
        <div className="lg:col-span-2 bg-white border rounded-xl p-6 space-y-4">
          <Input
            value={book.title}
            onChange={(e) =>
              setBookEdits({ ...bookEdits, title: e.target.value })
            }
          />
          <Input
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
            className="h-40"
          />
        </div>
      </div>

      {/* 🔷 Chapters */}
      <div className="bg-white border rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b text-sm text-neutral-500">
          Chapters
        </div>

        <div>
          {data?.chapters?.map((c: any) => (
            <div
              key={c.id}
              className="flex justify-between items-center px-5 py-3 border-b hover:bg-neutral-50"
            >
              <div
                onClick={() => router.push(`/books/${id}/chapters/${c.id}`)}
                className="cursor-pointer"
              >
                <p className="font-medium">
                  Chapter {c.chapterNumber}: {c.title}
                </p>
                <p className="text-xs text-neutral-400">
                  {dayjs(c.updatedAt).format("YYYY-MM-DD HH:mm")}
                </p>
              </div>

              <ConfirmDialog
                trigger={
                  <button className="text-neutral-400 hover:text-red-500">
                    <Trash2 size={16} />
                  </button>
                }
                title="Delete Chapter"
                description="Are you sure?"
                onConfirm={() => deleteChapter(String(c.id))}
                destructive
              />
            </div>
          ))}
        </div>

        {!data?.chapters?.length && (
          <div className="text-center py-10 text-neutral-400">
            No chapters yet
          </div>
        )}
      </div>
    </div>
  );
}
