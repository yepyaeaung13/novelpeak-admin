import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start">
        <div className="mt-10 flex justify-center items-center">
          <div className="grid grid-cols-4 gap-4">
            <Link
              href={"/books"}
              className="flex justify-center items-center w-40 h-20 rounded bg-neutral-200 hover:bg-neutral-300 duration-200"
            >
              Books
            </Link>
            <Link
              href={"/payments"}
              className="flex justify-center items-center w-40 h-20 rounded bg-neutral-200 hover:bg-neutral-300 duration-200"
            >
              Payments
            </Link>
            <Link
              href={"/users"}
              className="flex justify-center items-center w-40 h-20 rounded bg-neutral-200 hover:bg-neutral-300 duration-200"
            >
              Users
            </Link>
            <Link
              href={"/reports"}
              className="flex justify-center items-center w-40 h-20 rounded bg-neutral-200 hover:bg-neutral-300 duration-200"
            >
              Reports
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
