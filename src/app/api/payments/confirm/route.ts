import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPaymentProvider } from "@/lib/payments";
import { getEmailProvider } from "@/lib/email";
import { recomputeVoteCount } from "@/lib/entries";
import { siteUrl } from "@/lib/site-url";

/** Where every payment provider's hosted checkout sends the browser back to
 * after a completed (or abandoned) payment — for both entry-fee and vote
 * purchases (a single confirm endpoint, branching on Transaction.type,
 * rather than one per money-collecting flow). Never trusts the redirect by
 * itself — retrieveSession() asks the processor directly what actually
 * happened before anything is marked paid or public (CLAUDE.md rule 3:
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
    return failRedirect("We couldn't find that payment");
  }

  // Idempotent — a page refresh or duplicate redirect shouldn't re-process.
  if (transaction.status === "SUCCEEDED") {
    return NextResponse.redirect(successDestination(transaction.type, transaction.entry.slug, transaction.voteQuantity));
  }

  if (result.status !== "paid") {
    await prisma.transaction.update({ where: { id: transaction.id }, data: { status: "FAILED" } });
    return failRedirect("Payment was not completed", transaction.entry.slug);
  }

  if (transaction.type === "ENTRY_FEE") {
    const contest = await prisma.contest.findUnique({ where: { id: transaction.contestId } });
    const nextStatus = contest?.moderationEnabled ? "PENDING" : "APPROVED";

    await prisma.$transaction([
      prisma.transaction.update({
        where: { id: transaction.id },
        data: { status: "SUCCEEDED", processorRef: result.processorRef },
      }),
      prisma.entry.update({ where: { id: transaction.entry.id }, data: { status: nextStatus } }),
    ]);

    await sendReceiptEmail({
      to: transaction.donorEmail,
      subject: `You're entered! ${transaction.entry.petName} is in the contest`,
      html: `<p>Thanks for entering <strong>${transaction.entry.petName}</strong> in the ${contest?.name ?? "photo contest"}!</p><p>Entry fee: $${(transaction.amountCents / 100).toFixed(2)}</p>`,
      text: `Thanks for entering ${transaction.entry.petName}! Entry fee: $${(transaction.amountCents / 100).toFixed(2)}`,
    });

    const destination =
      nextStatus === "APPROVED" ? `/pet/${transaction.entry.slug}?entered=1` : `/enter?submitted=pending`;
    return NextResponse.redirect(new URL(destination, siteUrl()));
  }

  // VOTE_PURCHASE
  await prisma.transaction.update({
    where: { id: transaction.id },
    data: { status: "SUCCEEDED", processorRef: result.processorRef },
  });
  await recomputeVoteCount(transaction.entry.id);

  await sendReceiptEmail({
    to: transaction.donorEmail,
    subject: `Thanks for voting for ${transaction.entry.petName}!`,
    html: `<p>You just gave <strong>${transaction.voteQuantity} vote${transaction.voteQuantity === 1 ? "" : "s"}</strong> to <strong>${transaction.entry.petName}</strong> — $${(transaction.amountCents / 100).toFixed(2)} went straight to Second Chance Pet Adoptions.</p>`,
    text: `You just gave ${transaction.voteQuantity} vote(s) to ${transaction.entry.petName} — $${(transaction.amountCents / 100).toFixed(2)} went to Second Chance Pet Adoptions.`,
  });

  return NextResponse.redirect(
    successDestination(transaction.type, transaction.entry.slug, transaction.voteQuantity),
  );
}

function successDestination(type: string, slug: string, voteQuantity: number | null): URL {
  const url = new URL(`/pet/${slug}`, siteUrl());
  if (type === "VOTE_PURCHASE") {
    url.searchParams.set("voted", String(voteQuantity ?? ""));
  } else {
    url.searchParams.set("entered", "1");
  }
  return url;
}

async function sendReceiptEmail(input: { to: string; subject: string; html: string; text: string }) {
  try {
    await getEmailProvider().send(input);
  } catch {
    // Best-effort — a failed confirmation email shouldn't undo a
    // successful, already-committed payment.
  }
}

function failRedirect(message: string, petSlug?: string): NextResponse {
  const url = new URL(petSlug ? `/pet/${petSlug}` : "/enter", siteUrl());
  url.searchParams.set("error", message);
  return NextResponse.redirect(url);
}
