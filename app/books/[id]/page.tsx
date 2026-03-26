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
    <div className="w-full p-5 space-y-5">
      <div className="max-w-5xl mx-auto space-y-5">
        <div className="w-full flex justify-between border-b pb-5">
          <Link
            href={"/"}
            className="bg-neutral-200 w-8 h-8 flex justify-center items-center"
          >
            <ChevronLeft />
          </Link>
          <div>
            <Link
              href={"/books/1"}
              className="bg-neutral-200 h-8 px-2 flex justify-center items-center"
            >
              save book
            </Link>
          </div>
        </div>

        <div className="bg-neutral-100/50 rounded-xl"></div>
      </div>
    </div>
  );
}
