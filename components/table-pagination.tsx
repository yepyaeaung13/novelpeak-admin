import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

export function TablePagination({
  pageCount,
  page,
  setPage,
}: {
  pageCount: number;
  page: number;
  setPage: (v: number) => void;
}) {
  const visiblePages = getVisiblePages(page, pageCount);

  return (
    <Pagination className="flex justify-end">
      <PaginationContent>
        {/* Previous */}
        <PaginationItem>
          <PaginationPrevious
            href="#"
            onClick={(e) => {
              e.preventDefault();
              if (page !== 0) setPage(page - 1);
            }}
          />
        </PaginationItem>

        {/* Page numbers + ellipsis */}
        {visiblePages.map((p, idx) =>
          p === "ellipsis" ? (
            <PaginationItem key={`ellipsis-${idx}`}>
              <PaginationEllipsis />
            </PaginationItem>
          ) : (
            <PaginationItem key={p}>
              <PaginationLink
              className="ease-in duration-500"
                href="#"
                isActive={p === page}
                onClick={(e) => {
                  e.preventDefault();
                  setPage(p);
                }}
              >
                {p + 1}
              </PaginationLink>
            </PaginationItem>
          ),
        )}

        {/* Next */}
        <PaginationItem>
          <PaginationNext
            href="#"
            onClick={(e) => {
              e.preventDefault();
              if (page !== pageCount) setPage(page + 1);
            }}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}

function getVisiblePages(pageIndex: number, pageCount: number) {
  const pages: (number | "ellipsis")[] = [];

  if (pageCount <= 5) {
    return Array.from({ length: pageCount }, (_, i) => i);
  }

  pages.push(0); // first page

  if (pageIndex > 2) pages.push("ellipsis"); // left ellipsis

  const start = Math.max(1, pageIndex - 1);
  const end = Math.min(pageCount - 2, pageIndex + 1);

  for (let i = start; i <= end; i++) pages.push(i);

  if (pageIndex < pageCount - 3) pages.push("ellipsis"); // right ellipsis

  pages.push(pageCount - 1); // last page

  return pages;
}
