import { prisma } from "@/lib/prisma";

/** Fire-and-forget audit trail for admin actions — logins (success and
 * failure), moderation decisions. Best-effort: a logging failure should
 * never block the admin action it's recording. */
export async function logAdminAction(input: {
  adminUserId?: string | null;
  adminEmail: string;
  action: string;
  targetType?: string;
  targetId?: string;
  detail?: string;
}): Promise<void> {
  try {
    await prisma.adminAuditLog.create({
      data: {
        adminUserId: input.adminUserId ?? null,
        adminEmail: input.adminEmail,
        action: input.action,
        targetType: input.targetType,
        targetId: input.targetId,
        detail: input.detail,
      },
    });
  } catch {
    // Best-effort — never let audit logging break the real action.
  }
}
