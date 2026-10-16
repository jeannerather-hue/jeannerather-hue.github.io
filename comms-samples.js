/* Communications work samples.
   ILLUSTRATIVE ONLY: every sample uses a fictional organization ("Harborline Group") and fictional numbers.
   None of this is work done for any employer, and none of it uses employer information.
   To edit: change the text below. Each sample has a list of sections; a section can hold
   p (paragraph), list, table { head, rows }, qa [{ q, a }], slides [{ title, points, note }], or checklist. */
window.COMMS_SAMPLES = {
  label: "Illustrative Work Sample",
  org: "Harborline Group (fictional organization)",
  disclaimer: "Illustrative work sample created for this portfolio. Harborline Group is fictional, and all names, dates, and figures are examples. This is not work completed for any employer and contains no employer information.",
  items: [
    {
      id: "erp-comms-plan",
      kind: "Communications plan",
      title: "Enterprise ERP Implementation Communications Plan",
      summary: "Who needs to hear what, through which channel, when, from whom, and how we'll know it landed, for a company-wide move to a new cloud ERP.",
      sections: [
        { label: "Context", p: ["Harborline Group (about 4,200 employees across 14 locations) is replacing three legacy finance, procurement, and HR systems with one cloud ERP. Go-live is planned for Week 0. Expense reports, purchase requests, timesheets, and approvals all change."] },
        { label: "Objectives", list: [
          "Every employee knows what changes for them, when, and where to get help before go-live.",
          "Managers can answer first-line questions and approve work in the new system on Day 1.",
          "Support volume after launch stays within what the help desk is staffed for.",
        ] },
        { label: "Key messages", list: [
          "Why: one system replaces three, so requests and approvals stop getting lost between them.",
          "What changes: where you submit expenses, purchase requests, and timesheets, and how you approve them.",
          "What doesn't change: your pay schedule, your manager, and the policies behind each request.",
          "What you need to do: finish the 45-minute training before your cutover date and check your approvals queue on Day 1.",
        ] },
        { label: "Stakeholder audiences", table: {
          head: ["Audience", "What changes for them", "What they need", "Message owner"],
          rows: [
            ["Executive leadership", "Sponsor visible change; decisions on scope and timing", "Readiness status, risks, decisions needed", "Program sponsor"],
            ["People managers (~520)", "Approve expenses, time, and purchases in the new system", "Talking points, early training, escalation path", "Change lead"],
            ["All employees", "Submit expenses, purchase requests, and timesheets differently", "What, when, how, where to get help", "Internal communications"],
            ["Finance & procurement", "New workflows, reports, and month-end close", "Role-based training, process guides, hypercare support", "Finance process owner"],
            ["IT service desk", "New ticket categories and higher volume after launch", "Known issues, scripts, escalation routes", "IT service lead"],
            ["Change champions (1 per team)", "Peer support during cutover", "Early access, FAQ, weekly huddle", "Change lead"],
          ],
        } },
        { label: "Channels and timing", table: {
          head: ["Communication", "Audience", "Channel", "Timing", "Owner"],
          rows: [
            ["Program announcement", "All employees", "Intranet article + leader email", "Week −8", "Executive sponsor"],
            ["Manager briefing", "People managers", "Live session + recording", "Week −7", "Change lead"],
            ["What's changing for you", "By role", "Intranet hub page", "Week −6", "Internal communications"],
            ["Training opens", "All employees", "Email + Teams post", "Week −5", "Training lead"],
            ["Readiness pulse survey", "All employees", "2-minute survey", "Week −3", "Change lead"],
            ["Go-live reminder and checklist", "All employees", "Email + intranet banner", "Week −1", "Internal communications"],
            ["Day 1 welcome and support", "All employees", "Intranet + Teams channel", "Week 0", "Program team"],
            ["Daily hypercare update", "Managers + champions", "Teams post", "Weeks 0–2", "Program team"],
            ["Lessons learned and thank-you", "All employees", "Intranet article", "Week +6", "Executive sponsor"],
          ],
        } },
        { label: "Feedback mechanisms", list: [
          "Readiness pulse survey at Week −3 and Week +4, with the same questions both times.",
          "A Teams channel for questions, monitored daily by champions and the program team.",
          "Weekly champion huddle to surface confusion before it shows up as tickets.",
          "Help desk ticket themes reviewed daily during hypercare and turned into FAQ updates.",
        ] },
        { label: "How we'll measure it", list: [
          "Training completion by cutover date (target: 90% of employees, 100% of managers).",
          "Pulse survey: share of employees who say they know what to do on Day 1.",
          "Share of expenses and approvals submitted in the new system in Week 1.",
          "Ticket volume and top ticket themes against the hypercare staffing plan.",
        ] },
      ],
    },
    {
      id: "intranet-announcement",
      kind: "Intranet article",
      title: "Internal Intranet Announcement",
      summary: "An employee-facing article announcing the ERP rollout: the change, why it matters, the timeline, and what each person needs to do.",
      sections: [
        { label: "Headline", p: ["One system for expenses, purchasing, and time: Harbor ERP arrives this spring"] },
        { label: "Summary", p: ["Starting in May, you'll submit expenses, purchase requests, and timesheets in one place instead of three. Here's what's changing, when, and how to get ready."] },
        { label: "A message from our Chief Financial Officer", p: ["\"Right now, a simple purchase request can pass through three systems before it's approved. That costs you time and makes it hard to see where a request stands. Harbor ERP puts it all in one place. I know any change to tools you use every week takes effort, so we've built in training, a support team, and champions on every team to help. Thank you for taking the time to get ready.\""] },
        { label: "What's changing", list: [
          "Expenses: submit receipts from your phone or laptop in Harbor ERP.",
          "Purchase requests: one form, with status you can track.",
          "Timesheets: enter time in Harbor ERP instead of the old time system.",
          "Approvals (managers): one queue for expenses, time, and purchases.",
        ] },
        { label: "Timeline", table: {
          head: ["When", "What happens"],
          rows: [
            ["March 3", "Training opens in the learning portal (45 minutes)"],
            ["April 21", "Last day to submit expenses in the old system"],
            ["May 5", "Harbor ERP goes live for everyone"],
            ["May 5–16", "Extra support: floor walkers, daily office hours, and a live help channel"],
          ],
        } },
        { label: "What it means for you", p: ["Your pay schedule, policies, and manager stay the same. What changes is where you go to submit and approve requests. Most people will spend less time on these tasks once they're used to the new system."] },
        { label: "Your next steps", list: [
          "Complete \"Harbor ERP Basics\" in the learning portal by April 30.",
          "Submit any open expenses in the old system by April 21.",
          "Find your team's change champion on the Harbor ERP hub page.",
        ] },
        { label: "Questions?", p: ["Visit the Harbor ERP hub page for FAQs and how-to guides, or post in the #harbor-erp-help channel."] },
      ],
    },
    {
      id: "exec-change-deck",
      kind: "Executive presentation",
      title: "Executive Change Management Presentation",
      summary: "A seven-slide steering committee briefing: why the change, who it affects, how we're communicating, where readiness stands, and what leaders need to decide.",
      sections: [
        { label: "Slides", slides: [
          { title: "Harbor ERP: Change Readiness Review", points: ["Steering committee · Week −4", "Decision needed today: confirm the May 5 go-live"], note: "Open with the decision so the discussion stays on it." },
          { title: "Why we're changing", points: ["Three disconnected systems for expenses, purchasing, and time", "Requests take an average of 9 days to approve; no single view of status", "Legacy time system loses vendor support next year"], note: "Keep the case in business terms; avoid system detail." },
          { title: "Who is affected", points: ["All employees (~4,200): new place to submit requests", "People managers (~520): new approval queue; highest impact", "Finance & procurement (~140): new workflows and month-end close", "IT service desk: higher volume in the first two weeks"], note: "Managers carry the most change and are the main channel to their teams." },
          { title: "Communications approach", points: ["Leaders first: managers briefed one week before employees", "Role-based \"what changes for you\" pages on the intranet", "One help channel, 30+ change champions, daily hypercare updates", "Two pulse surveys to measure understanding before and after"], note: "Single source of truth: the intranet hub page." },
          { title: "Readiness dashboard", bars: [
            { label: "Employee training complete", value: 62, target: 90 },
            { label: "Manager training complete", value: 81, target: 100 },
            { label: "Know what to do on Day 1 (pulse)", value: 71, target: 85 },
            { label: "Teams with a named champion", value: 94, target: 100 },
          ], points: ["Overall status: amber, trending green"], note: "In practice this view comes from a live readiness dashboard (Tableau or Power BI) refreshed from training and survey data." },
          { title: "Risks and mitigations", points: ["Finance month-end overlaps go-live → move close tasks two days earlier", "Low training completion at two sites → site leads run in-person sessions", "Help desk volume above staffing → add floor walkers for Weeks 0–2"], note: "Each risk has a named owner and date in the program RAID log." },
          { title: "Decisions and next steps", points: ["Decision: confirm May 5 go-live, or hold two weeks", "Ask: each executive sends the go-live email to their org in Week −1", "Next review: Week −1 go/no-go with final readiness data"], note: "Close on the ask so each leader leaves with one action." },
        ] },
      ],
    },
    {
      id: "readiness-toolkit",
      kind: "Employee toolkit",
      title: "Employee Change Readiness Toolkit",
      summary: "Everything managers and employees need for go-live: FAQ, manager talking points, the training announcement, a go-live checklist, and where to get help.",
      sections: [
        { label: "Employee FAQ", qa: [
          { q: "Why are we changing systems?", a: "To replace three separate systems with one, so requests are faster to submit, approve, and track." },
          { q: "Will this change my pay or benefits?", a: "No. Your pay schedule, benefits, and policies stay the same." },
          { q: "How long is the training?", a: "About 45 minutes, online, at your own pace. Managers have one extra 30-minute module on approvals." },
          { q: "What happens to requests I submitted in the old system?", a: "Anything submitted by April 21 will be processed there. After that, use Harbor ERP." },
          { q: "Where do I go if something doesn't work on Day 1?", a: "Post in #harbor-erp-help, ask your team's change champion, or open a ticket with the service desk." },
        ] },
        { label: "Manager talking points", list: [
          "Here's what changes for our team, and here's what stays the same.",
          "Please finish the training by April 30. It takes about 45 minutes.",
          "Our champion is [name]. They've had early access and can help.",
          "It's normal for the first week to feel slower. Tell me what's getting in your way so we can fix it.",
          "I'll be approving in the new system from Day 1, so submit there from May 5.",
        ] },
        { label: "Training announcement (email)", p: [
          "Subject: Harbor ERP training is open: 45 minutes to get ready",
          "Harbor ERP goes live on May 5. Before then, please complete \"Harbor ERP Basics\" in the learning portal. It takes about 45 minutes and covers submitting expenses, purchase requests, and timesheets. Managers will also see a short module on approvals. Please finish by April 30. If you have questions, your team's change champion can help.",
        ] },
        { label: "Go-live checklist", checklist: [
          "Complete Harbor ERP Basics training",
          "Submit open expenses in the old system by April 21",
          "Sign in to Harbor ERP once before May 5 to confirm access",
          "Bookmark the Harbor ERP hub page",
          "Managers: check your approvals queue on May 5 and May 6",
          "Know your champion and the #harbor-erp-help channel",
        ] },
        { label: "Support resources", table: {
          head: ["Need", "Where to go", "Available"],
          rows: [
            ["How-to guides and FAQ", "Harbor ERP hub page (intranet)", "Always"],
            ["Quick question", "#harbor-erp-help channel", "Monitored 7 a.m.–6 p.m., Weeks 0–2"],
            ["In-person help", "Floor walkers and team champions", "Weeks 0–2"],
            ["Live walkthrough", "Daily office hours (30 min)", "Weeks 0–2"],
            ["Access or system problem", "IT service desk ticket", "Always"],
          ],
        } },
      ],
    },
    {
      id: "comms-calendar",
      kind: "Communications calendar",
      title: "Organizational Change Communications Calendar",
      summary: "A 90-day calendar of communications before, during, and after launch, mapped to each audience and channel.",
      sections: [
        { label: "Phases", phases: [
          { name: "Pre-launch", span: "Days 1–42", weeks: 6 },
          { name: "Launch", span: "Days 43–56", weeks: 2 },
          { name: "Post-launch", span: "Days 57–90", weeks: 5 },
        ] },
        { label: "Calendar", table: {
          head: ["Days", "Phase", "Communication", "Audience", "Channel", "Owner"],
          rows: [
            ["1–7", "Pre-launch", "Program announcement from sponsor", "All employees", "Intranet article + email", "Executive sponsor"],
            ["1–7", "Pre-launch", "Leadership alignment briefing", "Executives", "Meeting + one-page brief", "Program lead"],
            ["8–14", "Pre-launch", "Manager briefing and talking points", "People managers", "Live session + toolkit", "Change lead"],
            ["8–14", "Pre-launch", "Champion kickoff", "Change champions", "Workshop", "Change lead"],
            ["15–21", "Pre-launch", "\"What changes for you\" pages by role", "All employees", "Intranet hub", "Internal communications"],
            ["22–28", "Pre-launch", "Training opens", "All employees", "Email + Teams", "Training lead"],
            ["29–35", "Pre-launch", "Readiness pulse survey", "All employees", "Survey", "Change lead"],
            ["36–42", "Pre-launch", "Go-live checklist and reminder", "All employees", "Email + intranet banner", "Internal communications"],
            ["36–42", "Pre-launch", "Go/no-go readiness review", "Steering committee", "Presentation", "Program lead"],
            ["43", "Launch", "Day 1 welcome and where to get help", "All employees", "Intranet + Teams", "Program team"],
            ["43–56", "Launch", "Daily hypercare update", "Managers + champions", "Teams post", "Program team"],
            ["43–56", "Launch", "FAQ updates from ticket themes", "All employees", "Intranet hub", "Internal communications"],
            ["50", "Launch", "Week 1 status to leadership", "Executives", "Email brief", "Program lead"],
            ["57–63", "Post-launch", "Tips and shortcuts series", "All employees", "Intranet + Teams", "Internal communications"],
            ["64–70", "Post-launch", "Follow-up pulse survey", "All employees", "Survey", "Change lead"],
            ["71–84", "Post-launch", "Adoption results and next improvements", "Executives + managers", "Presentation", "Program lead"],
            ["85–90", "Post-launch", "Lessons learned and thank-you", "All employees", "Intranet article", "Executive sponsor"],
          ],
        } },
      ],
    },
  ],
};
