"use client";

import { ChevronLeft } from "lucide-react";
import { useAddBook } from "@/query/book";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { uploadImage } from "@/service/common";

type Book = {
  title: string;
  author: string;
  description: string;
  coverImage: null | string;
};

export default function Page() {
  const router = useRouter();
  const [book, setBook] = useState<Book>({
    title: "",
    description: "",
    author: "",
    coverImage: null,
  });
  const [imageFile, setImageFile] = useState<File | null>(null);

  const { mutate: addBook, isPending } = useAddBook();

  const handleCreateBook = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    let coverImage = null;
    if (imageFile) {
      const res = await uploadImage(imageFile);
      console.log("res", res);
      coverImage = res.url;
    }

    addBook(
      { ...book, coverImage },
      {
        onSuccess: () => {
          router.back();
        },
      },
    );
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (!file) return;
    setImageFile(file);
    setBook((prev) => ({ ...prev, coverImage: URL.createObjectURL(file) }));
  };

  return (
    <div className="w-full p-5 space-y-6 bg-neutral-50 min-h-screen">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header Section */}
        <div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.back()}
                className="bg-neutral-100 hover:bg-neutral-200 w-10 h-10 flex justify-center items-center rounded-lg transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-neutral-900">
                  Create New Book
                </h1>
                <p className="text-sm text-neutral-600 mt-1">
                  Add a new book to your collection
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-sm text-neutral-500">Status</div>
                <div className="text-sm font-medium text-orange-600">Draft</div>
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
                form="book"
                type="submit"
                disabled={
                  isPending || !book.title || !book.author || !book.description
                }
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 font-medium"
              >
                {isPending ? "Creating..." : "Create Book"}
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
                  alt="cover preview"
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

          <form
            id="book"
            onSubmit={handleCreateBook}
            className="w-2/3 space-y-4"
          >
            <Input
              type="text"
              placeholder="Book title"
              value={book.title}
              onChange={(e) => setBook({ ...book, title: e.target.value })}
              required
            />
            <Input
              type="text"
              placeholder="Author name"
              value={book.author}
              onChange={(e) => setBook({ ...book, author: e.target.value })}
              required
            />
            <Textarea
              value={book.description}
              onChange={(e) =>
                setBook({ ...book, description: e.target.value })
              }
              placeholder="Book description"
              className="h-36"
              required
            />
          </form>
        </div>
      </div>
    </div>
  );
}
