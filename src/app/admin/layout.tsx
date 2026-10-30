import { getAdminFromSession } from "@/lib/admin/auth";
import { AdminNav } from "@/components/admin/AdminNav";

/** Shared shell for every /admin page. Deliberately does NOT call
 * requireAdmin() — /admin/login and its passkey steps live under this same
 * route and must render without a session (requireAdmin would redirect
 * them straight back to themselves). Pages that need auth still call
 * requireAdmin() themselves; this layout only decides whether to show the
 * admin nav around them. */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await getAdminFromSession();

  if (!admin) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-full flex-1 flex-col bg-neutral-100">
      <AdminNav email={admin.email} isSuperAdmin={admin.role === "SUPER_ADMIN"} />
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}
