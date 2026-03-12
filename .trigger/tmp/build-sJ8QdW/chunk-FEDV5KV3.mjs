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

// src/lib/workspaces.ts
init_esm();
async function getAllWorkspaces() {
  try {
    const dbWs = await prisma.workspace.findMany({
      orderBy: { createdAt: "desc" }
    });
    return dbWs.map((w) => ({
      slug: w.slug,
      name: w.name,
      vertical: w.vertical ?? void 0,
      source: "db",
      status: w.status,
      hasApiToken: !!w.apiToken
    }));
  } catch (err) {
    console.error("[workspaces] DB query failed:", err);
    return [];
  }
}
__name(getAllWorkspaces, "getAllWorkspaces");
async function getWorkspaceBySlug(slug) {
  const dbWs = await prisma.workspace.findUnique({ where: { slug } });
  if (!dbWs || !dbWs.apiToken) return void 0;
  return {
    slug: dbWs.slug,
    name: dbWs.name,
    apiToken: dbWs.apiToken,
    vertical: dbWs.vertical ?? void 0,
    source: "db",
    status: dbWs.status
  };
}
__name(getWorkspaceBySlug, "getWorkspaceBySlug");
async function getClientForWorkspace(slug) {
  const workspace = await getWorkspaceBySlug(slug);
  if (!workspace) throw new Error(`Workspace not found: ${slug}`);
  return new EmailBisonClient(workspace.apiToken);
}
__name(getClientForWorkspace, "getClientForWorkspace");

export {
  getAllWorkspaces,
  getWorkspaceBySlug,
  getClientForWorkspace
};
//# sourceMappingURL=chunk-FEDV5KV3.mjs.map
