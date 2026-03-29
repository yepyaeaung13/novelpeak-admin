"use client";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { useGetBooks } from "@/query/book";
import { TablePagination } from "@/components/table-pagination";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

type Book = {
  id: number;
  title: string;
  author: string;
  description: string;
  coverImage: null | string;
  chapterCount: number;
  views: number;
  likes: number;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
};

const categories = [
  {
    id: 1,
    name: "Xianxia",
  },
  {
    id: 2,
    name: "Wuxia",
  },
  {
    id: 3,
    name: "Xuanhuan",
  },
  {
    id: 4,
    name: "Urban / Modern Fantasy",
  },
  {
    id: 5,
    name: "Romance",
  },
];

export default function Page() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const limit = 10;
  const [category, setCategory] = useState("");
  const [searchText, setSearchText] = useState("");
  const { data: books } = useGetBooks({ page: 1, limit: 10 });

  const handleGotDetail = (id: number) => {
    router.push(`/books/${id}`);
  };

  return (
    <div className="w-full p-5 space-y-6 relative bg-neutral-50 min-h-screen">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header Section */}
        <div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href={"/"}
                className="bg-neutral-100 hover:bg-neutral-200 w-10 h-10 flex justify-center items-center rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-neutral-900">
                  Books Management
                </h1>
                <p className="text-sm text-neutral-600 mt-1">
                  Manage your book collection and chapters
                </p>
              </div>
            </div>
            <Link
              href={"/books/add"}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors font-medium"
            >
              <span className="text-sm">+</span>
              New Book
            </Link>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-6">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex-1 max-w-md">
              <Input
                type="text"
                placeholder="Search books by title or author..."
                className="w-full"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-neutral-700">
                Filter by:
              </span>
              <div className="flex gap-2 flex-wrap">
                {categories.map((cat) => (
                  <Badge
                    key={cat.id}
                    variant="outline"
                    className={cn(
                      "text-neutral-600 border-neutral-300 cursor-pointer hover:bg-neutral-100 transition-colors px-3 py-1",
                      category === cat.name &&
                        "bg-blue-50 text-blue-700 border-blue-300",
                    )}
                    onClick={() =>
                      setCategory(cat.name === category ? "" : cat.name)
                    }
                  >
                    {cat.name}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
          <Table>
            <TableCaption className="py-3 text-neutral-600">
              A list of your books.
            </TableCaption>
            <TableHeader className="bg-neutral-50">
              <TableRow>
                <TableHead className="w-80 font-semibold text-neutral-700">
                  Title
                </TableHead>
                <TableHead className="font-semibold text-neutral-700">
                  Author
                </TableHead>
                <TableHead className="text-center font-semibold text-neutral-700">
                  Chapters
                </TableHead>
                <TableHead className="text-center font-semibold text-neutral-700">
                  Views
                </TableHead>
                <TableHead className="text-center font-semibold text-neutral-700">
                  Likes
                </TableHead>
                <TableHead className="text-center w-36 font-semibold text-neutral-700">
                  Status
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {books?.data?.map((book: Book) => (
                <TableRow
                  key={book.id}
                  className="hover:bg-neutral-50 transition-colors"
                >
                  <TableCell
                    onClick={() => handleGotDetail(book.id)}
                    className="font-medium hover:text-blue-600 cursor-pointer duration-200"
                  >
                    <div className="flex gap-3 items-center">
                      {book.coverImage && (
                        <img
                          src={book.coverImage}
                          alt="photo"
                          width={50}
                          height={200}
                        />
                      )}
                      {book.title}
                    </div>
                  </TableCell>
                  <TableCell className="text-neutral-600">
                    {book.author}
                  </TableCell>
                  <TableCell className="text-center text-neutral-600">
                    {book.chapterCount}
                  </TableCell>
                  <TableCell className="text-center text-neutral-600">
                    {book.views}
                  </TableCell>
                  <TableCell className="text-center text-neutral-600">
                    {book.likes}
                  </TableCell>
                  <TableCell className="text-center">
                    {book.isPublished ? (
                      <Badge
                        variant="outline"
                        className="text-green-600 border-green-300 bg-green-50"
                      >
                        Published
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="text-orange-600 border-orange-300 bg-orange-50"
                      >
                        Draft
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter className="bg-neutral-50">
              <TableRow>
                <TableCell colSpan={1} className="text-neutral-600">
                  Rows per page {limit}
                </TableCell>
                <TableCell colSpan={5} className="text-right">
                  <div className="">
                    <TablePagination
                      pageCount={books?.meta?.totalPages}
                      page={page}
                      setPage={setPage}
                    />
                  </div>
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      </div>
    </div>
  );
}
