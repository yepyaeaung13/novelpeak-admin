"use client";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Link from "next/link";
import { ChevronLeft, Search } from "lucide-react";
import { useGetBooks, useGetChaptersList } from "@/query/book";
import { TablePagination } from "@/components/table-pagination";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

export default function Page() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const limit = 10;
  const [category, setCategory] = useState("");
  const [searchText, setSearchText] = useState("");

  const { data: books } = useGetBooks({ page, limit });

  const handleGotDetail = (id: number) => {
    router.push(`/books/${id}`);
  };

  return (
    <div className="space-y-6 p-4 md:p-6">

      {/* 🔷 Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 sm:gap-4">
          <Link
            href={"/"}
            className="w-10 h-10 flex items-center justify-center rounded-lg border hover:bg-neutral-100 bg-white"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>

          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Books</h1>
            <p className="text-sm text-neutral-500 hidden sm:block">
              Manage your books and chapters
            </p>
          </div>
        </div>

        <Link
          href={"/books/add"}
          className="bg-black text-white px-4 py-2 rounded-lg text-sm hover:opacity-90 text-center"
        >
          + Add Book
        </Link>
      </div>

      {/* 🔷 Filters */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-between">

        {/* Search */}
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-neutral-400" />
          <Input
            placeholder="Search books..."
            className="pl-9 bg-white"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </div>

        {/* Category Pills */}
        <div className="flex gap-2 flex-wrap">
          {["All", "Xianxia", "Wuxia", "Xuanhuan", "Romance"].map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat === "All" ? "" : cat)}
              className={cn(
                "px-3 py-1.5 rounded-full text-sm border transition",
                category === cat
                  ? "bg-black text-white"
                  : "bg-white hover:bg-neutral-100"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* 🔷 Table Card - Desktop */}
      <div className="hidden md:block bg-white border rounded-xl overflow-hidden">

        {/* Table Header */}
        <div className="px-5 py-3 border-b flex justify-between items-center">
          <span className="text-sm text-neutral-500">
            {books?.meta?.total ?? 0} books
          </span>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead><p className="pl-2">Book</p></TableHead>
              <TableHead>Author</TableHead>
              <TableHead className="text-center">Chapters</TableHead>
              <TableHead className="text-center">Views</TableHead>
              <TableHead className="text-center">Likes</TableHead>
              <TableHead className="text-center">Status</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {books?.data?.map((book: any) => (
              <TableRow
                key={book.id}
                className="hover:bg-neutral-50 cursor-pointer"
                onClick={() => handleGotDetail(book.id)}
              >
                <TableCell>
                  <div className="flex items-center gap-3 pl-2">
                    {book.coverImage && (
                      <img
                        src={book.coverImage}
                        className="w-10 h-14 object-cover rounded-md border"
                      />
                    )}
                    <div>
                      <p className="font-medium">{book.title}</p>
                      <p className="text-xs text-neutral-500">
                        ID: {book.id}
                      </p>
                    </div>
                  </div>
                </TableCell>

                <TableCell className="text-neutral-600">
                  {book.author}
                </TableCell>

                <TableCell className="text-center">
                  {book.chapterCount}
                </TableCell>

                <TableCell className="text-center">
                  {book.views}
                </TableCell>

                <TableCell className="text-center">
                  {book.likes}
                </TableCell>

                <TableCell className="text-center">
                  <Badge
                    className={cn(
                      book.isPublished
                        ? "bg-green-100 text-green-700"
                        : "bg-orange-100 text-orange-700"
                    )}
                  >
                    {book.isPublished ? "Published" : "Draft"}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Pagination */}
        <div className="p-4 border-t flex justify-end">
          <TablePagination
            pageCount={books?.meta?.totalPages}
            page={page}
            setPage={setPage}
          />
        </div>
      </div>

      {/* 🔷 Mobile Cards */}
      <div className="md:hidden space-y-3">
        <div className="px-1 py-2 flex justify-between items-center">
          <span className="text-sm text-neutral-500">
            {books?.meta?.total ?? 0} books
          </span>
        </div>
        {books?.data?.map((book: any) => (
          <div
            key={book.id}
            onClick={() => handleGotDetail(book.id)}
            className="bg-white border rounded-xl p-4 flex gap-4 hover:bg-neutral-50 cursor-pointer"
          >
            {book.coverImage && (
              <img
                src={book.coverImage}
                className="w-16 h-20 object-cover rounded-lg border flex-shrink-0"
              />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium truncate">{book.title}</p>
                  <p className="text-sm text-neutral-500">{book.author}</p>
                </div>
                <Badge
                  className={cn(
                    "flex-shrink-0",
                    book.isPublished
                      ? "bg-green-100 text-green-700"
                      : "bg-orange-100 text-orange-700"
                  )}
                >
                  {book.isPublished ? "Published" : "Draft"}
                </Badge>
              </div>
              <div className="mt-2 flex flex-wrap gap-3 text-xs text-neutral-500">
                <span>Chapters: {book.chapterCount}</span>
                <span>Views: {book.views}</span>
                <span>Likes: {book.likes}</span>
              </div>
              <p className="mt-1 text-xs text-neutral-400">ID: {book.id}</p>
            </div>
          </div>
        ))}
        <div className="pt-2">
          <TablePagination
            pageCount={books?.meta?.totalPages}
            page={page}
            setPage={setPage}
          />
        </div>
      </div>
    </div>
  );
}