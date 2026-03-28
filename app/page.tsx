"use client"

import Link from "next/link";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { useUserStore } from "@/lib/store/user";

export default function Home() {
  const router = useRouter();
  const user = useUserStore((state) => state.user);
  const clearUser = useUserStore((state) => state.clearUser);

  const handleLogout = () => {
    Cookies.remove("auth", { path: "/" });
    Cookies.remove("token", { path: "/" });
    clearUser();
    router.push("/login");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 font-sans">
      <main className="flex min-h-screen w-full max-w-5xl flex-col items-center justify-between py-32 px-16">
        <div className="mt-10 flex justify-center items-center">
          <div className="grid grid-cols-4 gap-4">
            <Link
              href={"/books"}
              className="flex justify-center items-center w-40 h-20 rounded-lg bg-neutral-200 hover:bg-neutral-300 duration-200 transition-colors"
            >
              Books
            </Link>
            <Link
              href={"/payments"}
              className="flex justify-center items-center w-40 h-20 rounded-lg bg-neutral-200 hover:bg-neutral-300 duration-200 transition-colors"
            >
              Payments
            </Link>
            <Link
              href={"/users"}
              className="flex justify-center items-center w-40 h-20 rounded-lg bg-neutral-200 hover:bg-neutral-300 duration-200 transition-colors"
            >
              Users
            </Link>
            <Link
              href={"/reports"}
              className="flex justify-center items-center w-40 h-20 rounded-lg bg-neutral-200 hover:bg-neutral-300 duration-200 transition-colors"
            >
              Reports
            </Link>
          </div>
        </div>
        <div className="mt-4 text-sm text-neutral-600">Logged in as: <span className="font-medium">{user?.name ?? user?.email ?? "Unknown"}</span></div>
        <div className="mt-8">
          <button
            onClick={handleLogout}
            className="text-blue-500 hover:underline"
          >
            Logout
          </button>
        </div>
      </main>
    </div>
  );
}
