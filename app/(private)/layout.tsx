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
    <>
      <AdminHeader showEmailLink={process.env.NODE_ENV !== "production"} />
      <main>{children}</main>
    </>
  );
}
