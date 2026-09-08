import { AdminHeader } from "@/presentation/features/admin/admin-header";

export const metadata = {
  title: "Admin — 7eightDev",
  robots: { index: false, follow: false },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <AdminHeader showEmailLink={process.env.NODE_ENV !== "production"} />
      <main className="flex-1 min-h-0 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}