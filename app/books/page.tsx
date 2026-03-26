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
import { useGetDiscoverBooks } from "@/query/book";
import { TablePagination } from "@/components/table-pagination";
import { useState } from "react";
import { cn } from "@/lib/utils";

type Book = {
  id: number;
  title: string;
  author: string;
  description: string;
  coverImage: null | string;
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
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [category, setCategory] = useState("");
  const [searchText, setSearchText] = useState("");
  const { data, isLoading } = useGetDiscoverBooks();

  return (
    <div className="w-full p-5 space-y-5 relative">
      <Link
        href={"/"}
        className="absolute top-5 left-10 bg-neutral-200 w-8 h-8 flex justify-center items-center"
      >
        <ChevronLeft />
      </Link>
      <div className="max-w-5xl mx-auto space-y-5">
        <div className="w-full flex justify-between border-b pb-5">
          <Input
            type="text"
            placeholder="type book name"
            className="max-w-96"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
          <div>
            <Link
              href={"/books/1"}
              className="bg-neutral-200 h-8 px-2 flex justify-center items-center"
            >
              new book
            </Link>
          </div>
        </div>
        <div className="w-full flex gap-3 items-center px-2">
          <p className="text-sm text-neutral-400">Categories:</p>
          <div className="w-full flex gap-2">
            {categories.map((cat) => (
              <Badge
                key={cat.id}
                variant="outline"
                className={cn(
                  "text-gray-500 text-sm cursor-pointer active:scale-95 duration-150",
                  category === cat.name && "text-black",
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

        <div className="bg-neutral-100/50 rounded-xl">
          <Table>
            <TableCaption className="py-3">
              A list of your recent books.
            </TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead className="w-80">Title</TableHead>
                <TableHead>Author</TableHead>
                <TableHead className="text-center">Views</TableHead>
                <TableHead className="text-center">Likes</TableHead>
                <TableHead className="text-center w-36">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.map((book: Book) => (
                <TableRow key={book.id}>
                  <TableCell className="font-medium hover:underline cursor-pointer duration-200">
                    {book.title}
                  </TableCell>
                  <TableCell>{book.author}</TableCell>
                  <TableCell className="text-center">{book.views}</TableCell>
                  <TableCell className="text-center">{book.likes}</TableCell>
                  <TableCell className="text-center">
                    {book.isPublished ? (
                      <Badge variant={"outline"} className="text-green-500">
                        Published
                      </Badge>
                    ) : (
                      <Badge variant={"outline"} className="text-red-500">
                        Unpublished
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={1}>Rows per page {limit}</TableCell>
                <TableCell colSpan={4} className="text-right">
                  <div className="">
                    <TablePagination
                      pageCount={10}
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
