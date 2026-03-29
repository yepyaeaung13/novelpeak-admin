import { QuickCard, StatCard } from "@/components/common";

export default function Page() {
  return (
    <div className="p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Users" value="1,240" />
        <StatCard title="Books" value="320" />
        <StatCard title="Revenue" value="$2,340" />
        <StatCard title="Active Readers" value="860" />
      </div>

      <div className="mt-10">
        <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <QuickCard title="Manage Books" href="/books" />
          <QuickCard title="Payments" href="/payments" />
          <QuickCard title="Users" href="/users" />
          <QuickCard title="Reports" href="/reports" />
        </div>
      </div>
    </div>
  );
}
