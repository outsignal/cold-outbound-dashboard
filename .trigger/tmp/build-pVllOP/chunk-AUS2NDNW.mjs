import {
  EmailBisonClient
} from "./chunk-HYVNS55X.mjs";
import {
  prisma
} from "./chunk-6UNNRELO.mjs";
import {
  __name,
  init_esm
} from "./chunk-QA7U3GQ6.mjs";

// trigger/sync-senders.ts
init_esm();

// src/lib/emailbison/sync-senders.ts
init_esm();
async function syncSendersForAllWorkspaces() {
  const result = {
    workspaces: 0,
    synced: 0,
    created: 0,
    skipped: 0,
    errors: []
  };
  const workspaces = await prisma.workspace.findMany({
    where: { apiToken: { not: null } },
    select: { slug: true, apiToken: true }
  });
  result.workspaces = workspaces.length;
  console.log(`[sync-senders] Found ${workspaces.length} workspace(s) with API tokens`);
  for (const workspace of workspaces) {
    const { slug, apiToken } = workspace;
    if (!apiToken) {
      result.skipped++;
      continue;
    }
    try {
      console.log(`[sync-senders] Processing workspace: ${slug}`);
      const client = new EmailBisonClient(apiToken);
      const senderEmails = await client.getSenderEmails();
      console.log(`[sync-senders] ${slug}: fetched ${senderEmails.length} sender(s) from EmailBison`);
      const existingSenders = await prisma.sender.findMany({
        where: { workspaceSlug: slug },
        select: {
          id: true,
          name: true,
          emailAddress: true,
          emailBisonSenderId: true,
          emailSenderName: true
        }
      });
      const byEmail = /* @__PURE__ */ new Map();
      const byName = /* @__PURE__ */ new Map();
      for (const s of existingSenders) {
        if (s.emailAddress) byEmail.set(s.emailAddress.toLowerCase(), s);
        byName.set(s.name.toLowerCase(), s);
      }
      for (const senderEmail of senderEmails) {
        const emailKey = senderEmail.email.toLowerCase();
        const nameKey = (senderEmail.name ?? senderEmail.email).toLowerCase();
        const matchedByEmail = byEmail.get(emailKey);
        if (matchedByEmail) {
          const needsUpdate = matchedByEmail.emailBisonSenderId !== senderEmail.id || senderEmail.name && matchedByEmail.emailSenderName !== senderEmail.name;
          if (needsUpdate) {
            await prisma.sender.update({
              where: { id: matchedByEmail.id },
              data: {
                emailBisonSenderId: senderEmail.id,
                ...senderEmail.name ? { emailSenderName: senderEmail.name } : {}
              }
            });
            console.log(`[sync-senders] ${slug}: updated sender by email — ${senderEmail.email}`);
          } else {
            console.log(`[sync-senders] ${slug}: no changes needed for — ${senderEmail.email}`);
          }
          result.synced++;
          continue;
        }
        const matchedByName = byName.get(nameKey);
        if (matchedByName) {
          await prisma.sender.update({
            where: { id: matchedByName.id },
            data: {
              emailAddress: senderEmail.email,
              emailBisonSenderId: senderEmail.id,
              ...senderEmail.name ? { emailSenderName: senderEmail.name } : {}
            }
          });
          console.log(`[sync-senders] ${slug}: matched sender by name and set email — ${senderEmail.email}`);
          result.synced++;
          continue;
        }
        await prisma.sender.create({
          data: {
            workspaceSlug: slug,
            name: senderEmail.name ?? senderEmail.email,
            emailAddress: senderEmail.email,
            emailBisonSenderId: senderEmail.id,
            ...senderEmail.name ? { emailSenderName: senderEmail.name } : {},
            status: "active"
          }
        });
        console.log(`[sync-senders] ${slug}: created new sender — ${senderEmail.email}`);
        result.created++;
      }
    } catch (error) {
      const msg = `${slug}: ${error instanceof Error ? error.message : String(error)}`;
      console.error(`[sync-senders] Error processing workspace ${slug}:`, error);
      result.errors.push(msg);
    }
  }
  console.log(
    `[sync-senders] Done: ${result.workspaces} workspaces, ${result.synced} synced, ${result.created} created, ${result.skipped} skipped, ${result.errors.length} errors`
  );
  return result;
}
__name(syncSendersForAllWorkspaces, "syncSendersForAllWorkspaces");

// trigger/sync-senders.ts
async function runSyncSenders() {
  console.log("[sync-senders] Starting daily sender sync");
  const result = await syncSendersForAllWorkspaces();
  console.log(
    `[sync-senders] Complete: ${result.workspaces} workspaces, ${result.synced} synced, ${result.created} created, ${result.skipped} skipped, ${result.errors.length} errors`
  );
  if (result.errors.length > 0) {
    console.warn("[sync-senders] Errors during sync:", result.errors);
  }
  return result;
}
__name(runSyncSenders, "runSyncSenders");

export {
  runSyncSenders
};
//# sourceMappingURL=chunk-AUS2NDNW.mjs.map
