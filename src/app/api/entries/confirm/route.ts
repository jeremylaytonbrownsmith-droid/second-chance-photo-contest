import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPaymentProvider } from "@/lib/payments";
import { getEmailProvider } from "@/lib/email";
import { siteUrl } from "@/lib/site-url";

/** Where every payment provider's hosted checkout sends the browser back to
 * after a completed (or abandoned) payment. Never trusts the redirect by
 * itself — retrieveSession() asks the processor directly what actually
 * happened before anything is marked paid or made public (CLAUDE.md rule 3:
 * every mutation that touches money is a logged, verified fact, not a
 * client-side claim). */
export async function GET(request: Request) {
  const sessionId = new URL(request.url).searchParams.get("session_id");
  if (!sessionId) {
    return failRedirect("Missing payment session");
  }

  let result;
  try {
    result = await getPaymentProvider().retrieveSession(sessionId);
  } catch {
    return failRedirect("Could not confirm payment");
  }

  const transactionId = result.metadata.transactionId;
  const transaction = transactionId
    ? await prisma.transaction.findUnique({ where: { id: transactionId }, include: { entry: true } })
    : null;
  if (!transaction || !transaction.entry) {
    return failRedirect("Entry not found for this payment");
  }

  // Idempotent — a page refresh or duplicate redirect shouldn't re-process.
  if (transaction.status === "SUCCEEDED") {
    return NextResponse.redirect(new URL(`/pet/${transaction.entry.slug}?entered=1`, siteUrl()));
  }

  if (result.status !== "paid") {
    await prisma.transaction.update({ where: { id: transaction.id }, data: { status: "FAILED" } });
    return failRedirect("Payment was not completed");
  }

  const contest = await prisma.contest.findUnique({ where: { id: transaction.contestId } });
  const nextStatus = contest?.moderationEnabled ? "PENDING" : "APPROVED";

  await prisma.$transaction([
    prisma.transaction.update({
      where: { id: transaction.id },
      data: { status: "SUCCEEDED", processorRef: result.processorRef },
    }),
    prisma.entry.update({ where: { id: transaction.entry.id }, data: { status: nextStatus } }),
  ]);

  try {
    await getEmailProvider().send({
      to: transaction.donorEmail,
      subject: `You're entered! ${transaction.entry.petName} is in the contest`,
      html: `<p>Thanks for entering <strong>${transaction.entry.petName}</strong> in the ${contest?.name ?? "photo contest"}!</p><p>Entry fee: $${(transaction.amountCents / 100).toFixed(2)}</p>`,
      text: `Thanks for entering ${transaction.entry.petName}! Entry fee: $${(transaction.amountCents / 100).toFixed(2)}`,
    });
  } catch {
    // Best-effort — a failed confirmation email shouldn't undo a successful,
    // already-committed payment and entry.
  }

  const destination =
    nextStatus === "APPROVED"
      ? `/pet/${transaction.entry.slug}?entered=1`
      : `/enter?submitted=pending`;
  return NextResponse.redirect(new URL(destination, siteUrl()));
}

function failRedirect(message: string): NextResponse {
  const url = new URL("/enter", siteUrl());
  url.searchParams.set("error", message);
  return NextResponse.redirect(url);
}
