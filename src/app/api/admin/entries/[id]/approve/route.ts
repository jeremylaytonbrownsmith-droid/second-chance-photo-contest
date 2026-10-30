import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminFromSession } from "@/lib/admin/auth";
import { logAdminAction } from "@/lib/admin/audit";
import { getEmailProvider } from "@/lib/email";
import { siteUrl } from "@/lib/site-url";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminFromSession();
  if (!admin) {
    return NextResponse.redirect(new URL("/admin/login", siteUrl()), 303);
  }

  const { id } = await params;
  const formData = await request.formData();
  const note = String(formData.get("note") ?? "").trim() || null;

  // updateMany (not update) so this is a no-op instead of an error if the
  // entry was already handled — e.g. a double click, or two admins acting
  // on the same queue at once.
  //
  // shareApproved flips on here too — the share buttons/QR code are just a
  // convenience wrapper around a URL that's already public the moment an
  // entry is APPROVED (anyone can copy it straight out of the gallery), so
  // gating them separately added an admin step without actually protecting
  // anything. An admin can still revoke sharing for a specific entry later
  // from the Reports page's Sharing column if a real reason comes up.
  const result = await prisma.entry.updateMany({
    where: { id, status: "PENDING" },
    data: { status: "APPROVED", moderationNote: note, shareApproved: true },
  });

  if (result.count > 0) {
    await logAdminAction({
      adminUserId: admin.id,
      adminEmail: admin.email,
      action: "ENTRY_APPROVED",
      targetType: "Entry",
      targetId: id,
      detail: note ?? undefined,
    });

    // GoGo (the client's prior vendor) sends this automatically — she asked
    // for it directly on the call. Best-effort: a failed notification email
    // shouldn't undo an already-committed approval.
    const entry = await prisma.entry.findUnique({ where: { id } });
    if (entry) {
      try {
        await getEmailProvider().send({
          to: entry.ownerEmail,
          subject: `${entry.petName} is approved and live in the contest!`,
          html: `<p>Good news — <strong>${entry.petName}</strong> has been approved and is now live in the contest.</p><p><a href="${new URL(`/pet/${entry.slug}`, siteUrl())}">See ${entry.petName}'s page</a> and start sharing for votes!</p>`,
          text: `Good news — ${entry.petName} has been approved and is now live in the contest! See the page: ${new URL(`/pet/${entry.slug}`, siteUrl())}`,
        });
      } catch {
        // best-effort, see comment above
      }
    }
  }

  return NextResponse.redirect(new URL("/admin/moderation", siteUrl()), 303);
}
