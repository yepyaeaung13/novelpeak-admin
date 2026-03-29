import Link from "next/link";

export function NavItem({ icon, label, href, open }: any) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-neutral-100 transition flex-nowrap"
    >
      <p className="w-5">{icon}</p>
      {open && <span className="text-sm">{label}</span>}
    </Link>
  );
}

export function StatCard({ title, value }: any) {
  return (
    <div className="bg-white p-5 rounded-xl shadow-sm border">
      <p className="text-sm text-neutral-500">{title}</p>
      <h4 className="text-xl font-bold mt-2">{value}</h4>
    </div>
  );
}

export function QuickCard({ title, href }: any) {
  return (
    <Link
      href={href}
      className="bg-white p-5 rounded-xl border hover:shadow-md transition"
    >
      <h4 className="font-medium">{title}</h4>
    </Link>
  );
}