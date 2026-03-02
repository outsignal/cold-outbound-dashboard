/**
 * Seed script: Create a test campaign for the Outsignal workspace
 * to exercise the portal campaign approval flow.
 *
 * Usage: node scripts/seed-test-campaign.cjs
 *
 * Creates:
 *   - 10 Person records (realistic B2B leads)
 *   - PersonWorkspace links to "outsignal" with varied ICP scores
 *   - A TargetList linking all 10 people
 *   - A Campaign "Q2 SaaS Decision Makers" in pending_approval status
 */

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Sample people (realistic B2B SaaS decision makers)
// ---------------------------------------------------------------------------

const samplePeople = [
  {
    email: "sarah.mitchell@acmesaas.io",
    firstName: "Sarah",
    lastName: "Mitchell",
    company: "Acme SaaS",
    companyDomain: "acmesaas.io",
    jobTitle: "VP of Sales",
    location: "London, UK",
    linkedinUrl: "https://linkedin.com/in/sarah-mitchell-acme",
    icpScore: 92,
    icpReasoning: "Senior sales leader at mid-market SaaS company in UK. Perfect ICP match.",
    icpConfidence: "high",
  },
  {
    email: "james.chen@revscale.com",
    firstName: "James",
    lastName: "Chen",
    company: "RevScale",
    companyDomain: "revscale.com",
    jobTitle: "Head of Growth",
    location: "Manchester, UK",
    linkedinUrl: "https://linkedin.com/in/jameschen-revscale",
    icpScore: 87,
    icpReasoning: "Growth leader at scaling revenue tech company. Strong ICP fit.",
    icpConfidence: "high",
  },
  {
    email: "olivia.brooks@cloudpeak.co",
    firstName: "Olivia",
    lastName: "Brooks",
    company: "CloudPeak",
    companyDomain: "cloudpeak.co",
    jobTitle: "Chief Revenue Officer",
    location: "Bristol, UK",
    linkedinUrl: "https://linkedin.com/in/olivia-brooks-cloudpeak",
    icpScore: 95,
    icpReasoning: "C-level revenue leader at cloud infrastructure SaaS. Ideal decision maker.",
    icpConfidence: "high",
  },
  {
    email: "daniel.ward@nexuserp.com",
    firstName: "Daniel",
    lastName: "Ward",
    company: "Nexus ERP",
    companyDomain: "nexuserp.com",
    jobTitle: "Sales Director",
    location: "Birmingham, UK",
    linkedinUrl: "https://linkedin.com/in/daniel-ward-nexus",
    icpScore: 78,
    icpReasoning: "Sales director at ERP vendor. Good fit but niche vertical.",
    icpConfidence: "medium",
  },
  {
    email: "emma.taylor@prodfinity.io",
    firstName: "Emma",
    lastName: "Taylor",
    company: "Prodfinity",
    companyDomain: "prodfinity.io",
    jobTitle: "Director of Business Development",
    location: "Edinburgh, UK",
    linkedinUrl: "https://linkedin.com/in/emmataylor-prodfinity",
    icpScore: 71,
    icpReasoning: "BD leader at product analytics SaaS. Solid fit, slightly small headcount.",
    icpConfidence: "medium",
  },
  {
    email: "mark.robinson@dataflowai.com",
    firstName: "Mark",
    lastName: "Robinson",
    company: "DataFlow AI",
    companyDomain: "dataflowai.com",
    jobTitle: "Co-founder & CEO",
    location: "Leeds, UK",
    linkedinUrl: "https://linkedin.com/in/markrobinson-dataflow",
    icpScore: 62,
    icpReasoning: "Founder-led AI startup. Relevant vertical but early stage company.",
    icpConfidence: "medium",
  },
  {
    email: "rachel.green@paymentsync.co.uk",
    firstName: "Rachel",
    lastName: "Green",
    company: "PaymentSync",
    companyDomain: "paymentsync.co.uk",
    jobTitle: "VP Marketing",
    location: "London, UK",
    linkedinUrl: "https://linkedin.com/in/rachelgreen-paymentsync",
    icpScore: 55,
    icpReasoning: "Marketing leader at fintech. Adjacent role but not core sales buyer.",
    icpConfidence: "medium",
  },
  {
    email: "tom.harris@shiftlogistics.com",
    firstName: "Tom",
    lastName: "Harris",
    company: "Shift Logistics",
    companyDomain: "shiftlogistics.com",
    jobTitle: "Operations Manager",
    location: "Glasgow, UK",
    linkedinUrl: "https://linkedin.com/in/tomharris-shift",
    icpScore: 38,
    icpReasoning: "Operations role at logistics company. Low relevance to SaaS ICP.",
    icpConfidence: "low",
  },
  {
    email: "lisa.patel@greenhr.io",
    firstName: "Lisa",
    lastName: "Patel",
    company: "GreenHR",
    companyDomain: "greenhr.io",
    jobTitle: "People & Culture Lead",
    location: "Cardiff, UK",
    linkedinUrl: "https://linkedin.com/in/lisapatel-greenhr",
    icpScore: 31,
    icpReasoning: "HR role at small HR tech firm. Not a typical buyer persona.",
    icpConfidence: "low",
  },
  {
    email: "alex.nguyen@webcraft.dev",
    firstName: "Alex",
    lastName: "Nguyen",
    company: "WebCraft",
    companyDomain: "webcraft.dev",
    jobTitle: "Lead Developer",
    location: "Brighton, UK",
    linkedinUrl: "https://linkedin.com/in/alexnguyen-webcraft",
    icpScore: 22,
    icpReasoning: "Technical role at dev agency. Outside ICP for outbound services.",
    icpConfidence: "low",
  },
];

// ---------------------------------------------------------------------------
// Email sequence (3-step PVP framework, <70 words, merge tokens + spintax)
// ---------------------------------------------------------------------------

const emailSequence = [
  {
    position: 1,
    subjectLine: "{FIRSTNAME}, quick question about {COMPANYNAME}'s outbound",
    subjectVariantB: "Idea for {COMPANYNAME}'s pipeline",
    body: `Hi {FIRSTNAME},

{Noticed|Saw} that {COMPANYNAME} is {scaling quickly|growing fast} — congrats on the momentum.

Most B2B teams we {work with|partner with} are leaving 30-40% of their pipeline on the table because {their outbound isn't personalised|they're blasting generic sequences}.

Would it {make sense|be worth} a quick chat to see if we could help {COMPANYNAME} fill that gap?

{Happy to share|Can send over} a few examples of what's working right now.

{Best|Cheers},
Jonathan`,
    delayDays: 0,
    notes: "Opening email — PVP framework, soft CTA, spintax for variation",
  },
  {
    position: 2,
    subjectLine: "Re: {FIRSTNAME}, quick question about {COMPANYNAME}'s outbound",
    body: `{FIRSTNAME},

{Wanted to follow up|Circling back} on my last note.

One thing we've {seen work well|found effective} for companies like {COMPANYNAME} is combining {hyper-personalised email|targeted email outreach} with LinkedIn touchpoints — {it typically|this usually} doubles reply rates.

{Would love to|Happy to} walk you through a 2-minute example. Worth a look?

Jonathan`,
    delayDays: 3,
    notes: "Follow-up 1 — adds value, social proof hint",
  },
  {
    position: 3,
    subjectLine: "Re: {FIRSTNAME}, quick question about {COMPANYNAME}'s outbound",
    body: `Hi {FIRSTNAME},

{Last one from me|Final nudge} — {don't want to be a pest|I'll leave it here}.

If {COMPANYNAME} ever {wants to explore|is looking at} a done-for-you outbound approach that {actually gets replies|generates real conversations}, {we should talk|I'd love to connect}.

No pressure — {just reply "interested"|drop me a line} whenever the timing works.

{All the best|Cheers},
Jonathan`,
    delayDays: 4,
    notes: "Breakup email — soft close, low pressure",
  },
];

// ---------------------------------------------------------------------------
// LinkedIn sequence (blank connection + 2 follow-ups with merge tokens)
// ---------------------------------------------------------------------------

const linkedinSequence = [
  {
    position: 1,
    type: "connect",
    body: "",
    delayDays: 0,
    notes: "Blank connection request — higher acceptance rate than personalised",
  },
  {
    position: 2,
    type: "message",
    body: `Hey {FIRSTNAME}, thanks for connecting! Saw you're {leading|heading up} things at {COMPANYNAME} — impressive growth.

Quick question: are you {exploring|looking into} any new outbound channels this quarter? We help B2B teams like yours {generate qualified pipeline|book more meetings} through multichannel outreach.

Happy to share what's working if useful.`,
    delayDays: 2,
    notes: "Post-connection message — warm, conversational",
  },
  {
    position: 3,
    type: "message",
    body: `{FIRSTNAME}, {one more thought|just a quick follow-up} — I put together a short breakdown of how companies similar to {COMPANYNAME} are {generating 15-20 qualified conversations per month|filling their pipeline consistently}.

{Would it be helpful if I sent it over|Want me to share it}? No strings attached.`,
    delayDays: 4,
    notes: "Follow-up message — value offer, no pressure",
  },
];

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("--- Seed: Test Campaign for Outsignal ---\n");

  // 1. Upsert Person records (idempotent on email)
  const personIds = [];
  for (const p of samplePeople) {
    const person = await prisma.person.upsert({
      where: { email: p.email },
      update: {
        firstName: p.firstName,
        lastName: p.lastName,
        company: p.company,
        companyDomain: p.companyDomain,
        jobTitle: p.jobTitle,
        location: p.location,
        linkedinUrl: p.linkedinUrl,
      },
      create: {
        email: p.email,
        firstName: p.firstName,
        lastName: p.lastName,
        company: p.company,
        companyDomain: p.companyDomain,
        jobTitle: p.jobTitle,
        location: p.location,
        linkedinUrl: p.linkedinUrl,
        source: "manual",
      },
    });
    personIds.push({ id: person.id, name: `${p.firstName} ${p.lastName}`, icpScore: p.icpScore, icpReasoning: p.icpReasoning, icpConfidence: p.icpConfidence });
    console.log(`  Person: ${p.firstName} ${p.lastName} <${p.email}> -> ${person.id}`);
  }

  // 2. Upsert PersonWorkspace links with ICP scores
  for (const p of personIds) {
    await prisma.personWorkspace.upsert({
      where: {
        personId_workspace: { personId: p.id, workspace: "outsignal" },
      },
      update: {
        icpScore: p.icpScore,
        icpReasoning: p.icpReasoning,
        icpConfidence: p.icpConfidence,
        icpScoredAt: new Date(),
      },
      create: {
        personId: p.id,
        workspace: "outsignal",
        status: "new",
        icpScore: p.icpScore,
        icpReasoning: p.icpReasoning,
        icpConfidence: p.icpConfidence,
        icpScoredAt: new Date(),
      },
    });
    console.log(`  PersonWorkspace: ${p.name} -> outsignal (ICP: ${p.icpScore})`);
  }

  // 3. Create TargetList
  // Use upsert-like logic: delete existing list with same name, then create fresh
  const existingList = await prisma.targetList.findFirst({
    where: { workspaceSlug: "outsignal", name: "Q2 SaaS Decision Makers - Target List" },
  });
  if (existingList) {
    await prisma.targetListPerson.deleteMany({ where: { listId: existingList.id } });
    await prisma.targetList.delete({ where: { id: existingList.id } });
    console.log(`\n  Deleted existing target list: ${existingList.id}`);
  }

  const targetList = await prisma.targetList.create({
    data: {
      name: "Q2 SaaS Decision Makers - Target List",
      workspaceSlug: "outsignal",
      description: "Hand-picked SaaS decision makers in UK for Q2 outbound campaign",
    },
  });
  console.log(`\n  TargetList: ${targetList.name} -> ${targetList.id}`);

  // 4. Link people to target list
  for (const p of personIds) {
    await prisma.targetListPerson.create({
      data: {
        listId: targetList.id,
        personId: p.id,
      },
    });
  }
  console.log(`  Linked ${personIds.length} people to target list`);

  // 5. Delete existing campaign with same name (idempotent)
  const existingCampaign = await prisma.campaign.findUnique({
    where: { workspaceSlug_name: { workspaceSlug: "outsignal", name: "Q2 SaaS Decision Makers" } },
  });
  if (existingCampaign) {
    await prisma.campaign.delete({ where: { id: existingCampaign.id } });
    console.log(`\n  Deleted existing campaign: ${existingCampaign.id}`);
  }

  // 6. Create Campaign in pending_approval status
  const campaign = await prisma.campaign.create({
    data: {
      name: "Q2 SaaS Decision Makers",
      workspaceSlug: "outsignal",
      description: "Multichannel outbound targeting SaaS decision makers in the UK. Email + LinkedIn sequence with personalised messaging and spintax variation.",
      status: "pending_approval",
      channels: JSON.stringify(["email", "linkedin"]),
      targetListId: targetList.id,
      emailSequence: JSON.stringify(emailSequence),
      linkedinSequence: JSON.stringify(linkedinSequence),
      leadsApproved: false,
      contentApproved: false,
      publishedAt: new Date(),
    },
  });

  console.log(`\n  Campaign: ${campaign.name}`);
  console.log(`    ID:       ${campaign.id}`);
  console.log(`    Status:   ${campaign.status}`);
  console.log(`    Channels: ${campaign.channels}`);
  console.log(`    Leads approved:   ${campaign.leadsApproved}`);
  console.log(`    Content approved: ${campaign.contentApproved}`);

  // 7. Verify by querying back
  console.log("\n--- Verification ---\n");

  const verify = await prisma.campaign.findUnique({
    where: { id: campaign.id },
    include: {
      targetList: {
        include: {
          _count: { select: { people: true } },
        },
      },
    },
  });

  if (!verify) {
    console.error("FAILED: Campaign not found after creation!");
    process.exit(1);
  }

  console.log(`  Campaign found: ${verify.name} (${verify.id})`);
  console.log(`  Status: ${verify.status}`);
  console.log(`  Target list: ${verify.targetList?.name} (${verify.targetList?._count.people} people)`);
  console.log(`  Email steps: ${JSON.parse(verify.emailSequence || "[]").length}`);
  console.log(`  LinkedIn steps: ${JSON.parse(verify.linkedinSequence || "[]").length}`);
  console.log(`  Leads approved: ${verify.leadsApproved}`);
  console.log(`  Content approved: ${verify.contentApproved}`);

  console.log("\n--- Seed complete! Campaign ready for portal approval testing. ---");
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
