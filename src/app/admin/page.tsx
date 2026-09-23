import { redirect } from "next/navigation";

export default function AdminIndexPage() {
  // /admin/moderation itself redirects to /admin/login when unauthenticated
  // (via requireAdmin), so this doesn't need its own auth check.
  redirect("/admin/moderation");
}
