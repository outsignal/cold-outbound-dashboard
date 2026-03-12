import {
  prisma
} from "./chunk-6UNNRELO.mjs";
import {
  __name,
  init_esm
} from "./chunk-QA7U3GQ6.mjs";

// src/lib/campaigns/operations.ts
init_esm();
var VALID_TRANSITIONS = {
  draft: ["internal_review"],
  internal_review: ["pending_approval", "draft"],
  pending_approval: ["approved", "internal_review"],
  approved: ["deployed"],
  deployed: ["active"],
  active: ["paused", "completed"],
  paused: ["active", "completed"]
};
var SIGNAL_CAMPAIGN_TRANSITIONS = {
  draft: ["active"],
  active: ["paused", "archived"],
  paused: ["active", "archived"]
};
function parseJsonArray(value) {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
__name(parseJsonArray, "parseJsonArray");
function formatCampaignDetail(raw) {
  return {
    id: raw.id,
    name: raw.name,
    workspaceSlug: raw.workspaceSlug,
    type: raw.type,
    status: raw.status,
    channels: parseJsonArray(raw.channels) ?? ["email"],
    targetListName: raw.targetList?.name ?? null,
    leadsApproved: raw.leadsApproved,
    contentApproved: raw.contentApproved,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    description: raw.description,
    emailSequence: parseJsonArray(raw.emailSequence),
    linkedinSequence: parseJsonArray(raw.linkedinSequence),
    copyStrategy: raw.copyStrategy ?? null,
    targetListId: raw.targetListId,
    targetListPeopleCount: raw.targetList?._count.people ?? 0,
    leadsFeedback: raw.leadsFeedback,
    leadsApprovedAt: raw.leadsApprovedAt,
    contentFeedback: raw.contentFeedback,
    contentApprovedAt: raw.contentApprovedAt,
    emailBisonCampaignId: raw.emailBisonCampaignId,
    publishedAt: raw.publishedAt,
    deployedAt: raw.deployedAt,
    // Signal campaign fields
    icpCriteria: raw.icpCriteria ? (() => {
      try {
        return JSON.parse(raw.icpCriteria);
      } catch {
        return null;
      }
    })() : null,
    signalTypes: parseJsonArray(raw.signalTypes),
    dailyLeadCap: raw.dailyLeadCap,
    icpScoreThreshold: raw.icpScoreThreshold,
    signalEmailBisonCampaignId: raw.signalEmailBisonCampaignId,
    lastSignalProcessedAt: raw.lastSignalProcessedAt
  };
}
__name(formatCampaignDetail, "formatCampaignDetail");
var targetListInclude = {
  targetList: {
    select: {
      name: true,
      _count: {
        select: { people: true }
      }
    }
  }
};
async function createCampaign(params) {
  const {
    workspaceSlug,
    name,
    description,
    channels,
    targetListId,
    type,
    icpCriteria,
    signalTypes,
    dailyLeadCap,
    icpScoreThreshold
  } = params;
  const workspace = await prisma.workspace.findUnique({
    where: { slug: workspaceSlug },
    select: { slug: true }
  });
  if (!workspace) {
    throw new Error(`Workspace not found: '${workspaceSlug}'`);
  }
  const resolvedChannels = channels && channels.length > 0 ? channels : ["email"];
  const resolvedType = type ?? "static";
  const campaign = await prisma.campaign.create({
    data: {
      workspaceSlug,
      name,
      description,
      channels: JSON.stringify(resolvedChannels),
      targetListId: targetListId ?? null,
      type: resolvedType,
      ...resolvedType === "signal" && {
        icpCriteria: icpCriteria ?? null,
        signalTypes: signalTypes ?? null,
        ...dailyLeadCap !== void 0 && { dailyLeadCap },
        ...icpScoreThreshold !== void 0 && { icpScoreThreshold }
      }
    },
    include: targetListInclude
  });
  return formatCampaignDetail(campaign);
}
__name(createCampaign, "createCampaign");
async function getCampaign(id) {
  const campaign = await prisma.campaign.findUnique({
    where: { id },
    include: targetListInclude
  });
  if (!campaign) return null;
  return formatCampaignDetail(campaign);
}
__name(getCampaign, "getCampaign");
async function listCampaigns(workspaceSlug) {
  const campaigns = await prisma.campaign.findMany({
    where: { workspaceSlug },
    include: {
      targetList: {
        select: { name: true }
      }
    },
    orderBy: { updatedAt: "desc" }
  });
  return campaigns.map((c) => ({
    id: c.id,
    name: c.name,
    workspaceSlug: c.workspaceSlug,
    type: c.type,
    status: c.status,
    channels: parseJsonArray(c.channels) ?? ["email"],
    targetListName: c.targetList?.name ?? null,
    leadsApproved: c.leadsApproved,
    contentApproved: c.contentApproved,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt
  }));
}
__name(listCampaigns, "listCampaigns");
async function updateCampaign(id, params) {
  const { name, description, channels, targetListId } = params;
  const data = {};
  if (name !== void 0) data.name = name;
  if (description !== void 0) data.description = description;
  if (channels !== void 0) data.channels = JSON.stringify(channels);
  if (targetListId !== void 0) data.targetListId = targetListId;
  const campaign = await prisma.campaign.update({
    where: { id },
    data,
    include: targetListInclude
  });
  return formatCampaignDetail(campaign);
}
__name(updateCampaign, "updateCampaign");
async function updateCampaignStatus(id, newStatus) {
  const current = await prisma.campaign.findUnique({
    where: { id },
    select: { status: true, type: true }
  });
  if (!current) {
    throw new Error(`Campaign not found: '${id}'`);
  }
  const currentStatus = current.status;
  const isSignal = current.type === "signal";
  const transitions = isSignal ? SIGNAL_CAMPAIGN_TRANSITIONS : VALID_TRANSITIONS;
  if (newStatus !== "completed") {
    const allowedTransitions = transitions[currentStatus] ?? [];
    if (!allowedTransitions.includes(newStatus)) {
      throw new Error(
        `Invalid status transition: '${currentStatus}' -> '${newStatus}'. Allowed transitions from '${currentStatus}': ${allowedTransitions.length > 0 ? allowedTransitions.join(", ") : "none"}`
      );
    }
  }
  const campaign = await prisma.campaign.update({
    where: { id },
    data: { status: newStatus },
    include: targetListInclude
  });
  return formatCampaignDetail(campaign);
}
__name(updateCampaignStatus, "updateCampaignStatus");
async function deleteCampaign(id) {
  const current = await prisma.campaign.findUnique({
    where: { id },
    select: { status: true }
  });
  if (!current) {
    throw new Error(`Campaign not found: '${id}'`);
  }
  const deletableStatuses = ["draft", "internal_review"];
  if (!deletableStatuses.includes(current.status)) {
    throw new Error(
      `Cannot delete campaign in status '${current.status}'. Only campaigns in 'draft' or 'internal_review' can be deleted.`
    );
  }
  await prisma.campaign.delete({ where: { id } });
}
__name(deleteCampaign, "deleteCampaign");
async function publishForReview(id) {
  const current = await prisma.campaign.findUnique({
    where: { id },
    select: {
      status: true,
      emailSequence: true,
      linkedinSequence: true,
      targetListId: true
    }
  });
  if (!current) {
    throw new Error(`Campaign not found: '${id}'`);
  }
  if (current.status !== "internal_review") {
    throw new Error(
      `Cannot publish campaign in status '${current.status}'. Campaign must be in 'internal_review' status to publish for review.`
    );
  }
  const hasEmail = Boolean(
    current.emailSequence && parseJsonArray(current.emailSequence)?.length
  );
  const hasLinkedIn = Boolean(
    current.linkedinSequence && parseJsonArray(current.linkedinSequence)?.length
  );
  if (!hasEmail && !hasLinkedIn) {
    throw new Error(
      `Cannot publish campaign without content. At least one sequence (emailSequence or linkedinSequence) must be set before publishing.`
    );
  }
  if (!current.targetListId) {
    throw new Error(
      `Cannot publish campaign without a target list. Link a TargetList to this campaign before publishing for review.`
    );
  }
  const campaign = await prisma.campaign.update({
    where: { id },
    data: {
      status: "pending_approval",
      publishedAt: /* @__PURE__ */ new Date()
    },
    include: targetListInclude
  });
  return formatCampaignDetail(campaign);
}
__name(publishForReview, "publishForReview");
async function saveCampaignSequences(id, data) {
  const { emailSequence, linkedinSequence } = data;
  const updateData = {};
  if (emailSequence !== void 0) {
    updateData.emailSequence = JSON.stringify(emailSequence);
  }
  if (linkedinSequence !== void 0) {
    updateData.linkedinSequence = JSON.stringify(linkedinSequence);
  }
  if (data.copyStrategy !== void 0) {
    updateData.copyStrategy = data.copyStrategy;
  }
  const campaign = await prisma.campaign.update({
    where: { id },
    data: updateData,
    include: targetListInclude
  });
  return formatCampaignDetail(campaign);
}
__name(saveCampaignSequences, "saveCampaignSequences");
async function approveCampaignLeads(id) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.campaign.findUnique({
      where: { id },
      select: { contentApproved: true, status: true }
    });
    if (!current) throw new Error(`Campaign not found: '${id}'`);
    const updateData = {
      leadsApproved: true,
      leadsApprovedAt: /* @__PURE__ */ new Date(),
      leadsFeedback: null
      // clear previous feedback on approval
    };
    if (current.contentApproved && current.status === "pending_approval") {
      updateData.status = "approved";
    }
    const campaign = await tx.campaign.update({
      where: { id },
      data: updateData,
      include: targetListInclude
    });
    return formatCampaignDetail(campaign);
  });
}
__name(approveCampaignLeads, "approveCampaignLeads");
async function rejectCampaignLeads(id, feedback) {
  const campaign = await prisma.campaign.update({
    where: { id },
    data: {
      leadsApproved: false,
      leadsFeedback: feedback
    },
    include: targetListInclude
  });
  return formatCampaignDetail(campaign);
}
__name(rejectCampaignLeads, "rejectCampaignLeads");
async function approveCampaignContent(id) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.campaign.findUnique({
      where: { id },
      select: { leadsApproved: true, status: true }
    });
    if (!current) throw new Error(`Campaign not found: '${id}'`);
    const updateData = {
      contentApproved: true,
      contentApprovedAt: /* @__PURE__ */ new Date(),
      contentFeedback: null
    };
    if (current.leadsApproved && current.status === "pending_approval") {
      updateData.status = "approved";
    }
    const campaign = await tx.campaign.update({
      where: { id },
      data: updateData,
      include: targetListInclude
    });
    return formatCampaignDetail(campaign);
  });
}
__name(approveCampaignContent, "approveCampaignContent");
async function rejectCampaignContent(id, feedback) {
  const campaign = await prisma.campaign.update({
    where: { id },
    data: {
      contentApproved: false,
      contentFeedback: feedback
    },
    include: targetListInclude
  });
  return formatCampaignDetail(campaign);
}
__name(rejectCampaignContent, "rejectCampaignContent");
async function getCampaignLeadSample(targetListId, workspaceSlug, limit = 50) {
  const [members, totalCount] = await Promise.all([
    prisma.targetListPerson.findMany({
      where: { listId: targetListId },
      include: {
        person: {
          include: {
            workspaces: {
              where: { workspace: workspaceSlug },
              select: { icpScore: true }
            }
          }
        }
      }
    }),
    prisma.targetListPerson.count({ where: { listId: targetListId } })
  ]);
  const leads = members.map((m) => ({
    personId: m.person.id,
    firstName: m.person.firstName,
    lastName: m.person.lastName,
    jobTitle: m.person.jobTitle,
    company: m.person.company,
    location: m.person.location,
    linkedinUrl: m.person.linkedinUrl,
    icpScore: m.person.workspaces[0]?.icpScore ?? null
  })).sort((a, b) => (b.icpScore ?? -1) - (a.icpScore ?? -1)).slice(0, limit);
  return { leads, totalCount };
}
__name(getCampaignLeadSample, "getCampaignLeadSample");

export {
  createCampaign,
  getCampaign,
  listCampaigns,
  updateCampaign,
  updateCampaignStatus,
  deleteCampaign,
  publishForReview,
  saveCampaignSequences,
  approveCampaignLeads,
  rejectCampaignLeads,
  approveCampaignContent,
  rejectCampaignContent,
  getCampaignLeadSample
};
//# sourceMappingURL=chunk-NRC665OE.mjs.map
