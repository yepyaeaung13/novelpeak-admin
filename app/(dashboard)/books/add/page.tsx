"use client";

import { ChevronLeft, UploadCloud } from "lucide-react";
import { useAddBook } from "@/query/book";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { BookFields } from "@/components/book-fields";
import { emptyBook, type BookFormData } from "@/lib/book";
import { uploadImage } from "@/service/common";

export default function Page() {
  const router = useRouter();
  const [book, setBook] = useState<BookFormData>(emptyBook);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const { mutate: addBook, isPending } = useAddBook();
  const [error, setError] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const handleCreateBook = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    try {
      let coverImage = null;

      if (imageFile) {
        setIsUploading(true);
        const res = await uploadImage(imageFile);
        coverImage = res.url;
      }

      addBook(
        { ...book, coverImage },
        {
          onSuccess: () => router.push("/books"),
          onError: () => setError("Could not create the book. Please try again."),
        },
      );
    } catch {
      setError("Cover upload failed. Please check the image service and try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageFile(file);
    setBook((prev) => ({
      ...prev,
      coverImage: URL.createObjectURL(file),
    }));
  };

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-4 md:space-y-6">

      {/* 🔷 Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 sm:gap-4">
          <button
            onClick={() => router.back()}
            className="w-10 h-10 border rounded-lg flex items-center justify-center hover:bg-neutral-100"
          >
            <ChevronLeft size={18} />
          </button>

          <div>
            <h1 className="text-xl md:text-2xl font-bold">Create Book</h1>
            <p className="text-sm text-neutral-500 hidden sm:block">
              Add a new book to your platform
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={() => router.back()}
            className="px-4 py-2 border rounded-lg text-sm hover:bg-neutral-100"
          >
            Cancel
          </button>

          <button
            form="book"
            type="submit"
            disabled={
              isPending || isUploading || !book.title.trim() || !book.author.trim()
            }
            className="px-4 py-2 bg-black text-white rounded-lg text-sm hover:opacity-90 disabled:opacity-50"
          >
            {isPending ? "Creating..." : isUploading ? "Uploading..." : "Create Book"}
          </button>
        </div>
      </div>

      {/* 🔷 Content */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">

        {/* Cover Upload */}
        <div className="bg-white border rounded-xl p-4 md:p-5 space-y-4">
          <h3 className="font-semibold">Cover Image</h3>

          <div className="relative border rounded-xl aspect-[3/4] max-h-64 mx-auto w-full md:h-64 flex items-center justify-center bg-neutral-50 overflow-hidden">
            {book.coverImage ? (
              <img
                src={book.coverImage}
                alt=""
                className="object-cover w-full h-full"
              />
            ) : (
              <div className="text-center text-neutral-400 text-sm">
                <UploadCloud className="mx-auto mb-2" />
                Upload cover
              </div>
            )}
          </div>

          <label className="block">
            <input
              type="file"
              accept="image/*"
              onChange={handleCoverChange}
              className="hidden"
            />
            <div className="text-center text-sm border border-dashed rounded-lg py-2 cursor-pointer hover:bg-neutral-100">
              Choose Image
            </div>
          </label>
        </div>

        {/* Form */}
        <form
          id="book"
          onSubmit={handleCreateBook}
          className="md:col-span-2 bg-white border rounded-xl p-4 md:p-6 space-y-4 md:space-y-5"
        >
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          <BookFields book={book} onChange={setBook} disabled={isPending || isUploading} />
        </form>
      </div>
    </div>
  );
}
