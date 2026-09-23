/**
 * Idempotent admin-user bootstrap. Reads ADMIN_EMAIL / ADMIN_PASSWORD from
 * the environment and upserts an AdminUser with a freshly hashed password.
 * Safe to run on every build/deploy: a no-op when neither var is set, and
 * simply resets the password when they are — the expected behavior after
 * changing ADMIN_PASSWORD in Vercel and redeploying. There's no signup
 * flow by design; this is the only way an AdminUser gets created.
 */
import { prisma } from "../src/lib/prisma";
import { hashPassword } from "../src/lib/admin/password";

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.log("ADMIN_EMAIL/ADMIN_PASSWORD not set — skipping admin bootstrap.");
    return;
  }

  const passwordHash = hashPassword(password);
  await prisma.adminUser.upsert({
    where: { email },
    update: { passwordHash, voidedAt: null },
    create: { email, passwordHash, role: "SUPER_ADMIN" },
  });
  console.log(`Admin user ready: ${email}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
