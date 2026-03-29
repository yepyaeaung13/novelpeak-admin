"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { useUserStore } from "@/lib/store/user";
import {
  LayoutDashboard,
  BookOpen,
  Users,
  CreditCard,
  BarChart3,
  LogOut,
  Menu,
} from "lucide-react";
import { NavItem } from "@/components/common";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [open, setOpen] = useState(true);
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
    <div className="flex h-screen bg-neutral-100">
      {/* Sidebar */}
      <aside
        className={`bg-white border-r transition-all duration-300 overflow-hidden ${
          open ? "w-64" : "w-16"
        }`}
      >
        <div className="p-4 flex items-center justify-between">
          {open && <h1 className="font-bold text-nowrap">Novel Peak</h1>}
          <button onClick={() => setOpen(!open)}>
            <Menu size={20} />
          </button>
        </div>

        <nav className="mt-4 flex flex-col gap-2 px-2">
          <NavItem
            icon={<LayoutDashboard size={18} />}
            label="Dashboard"
            href="/"
            open={open}
          />
          <NavItem
            icon={<BookOpen size={18} />}
            label="Books"
            href="/books"
            open={open}
          />
          <NavItem
            icon={<CreditCard size={18} />}
            label="Payments"
            href="/payments"
            open={open}
          />
          <NavItem
            icon={<Users size={18} />}
            label="Users"
            href="/users"
            open={open}
          />
          <NavItem
            icon={<BarChart3 size={18} />}
            label="Reports"
            href="/reports"
            open={open}
          />
        </nav>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col">
        {/* Topbar */}
        <header className="h-14 bg-white border-b px-6 flex items-center justify-between">
          <h2 className="font-semibold">Dashboard</h2>

          <div className="flex items-center gap-4">
            <span className="text-sm text-neutral-600">
              {user?.name ?? user?.email ?? "Unknown"}
            </span>

            <button
              onClick={handleLogout}
              className="flex items-center gap-1 text-sm text-red-500 hover:underline"
            >
              <LogOut size={16} /> Logout
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
