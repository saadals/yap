import type { Product } from "@/lib/types";
import { at } from "@/lib/clock";

export const products: Product[] = [
  {
    id: "p-daftar-invoices",
    businessId: "b-daftar",
    name: "Daftar Invoices",
    oneLiner: "Make and send an invoice over WhatsApp in about 10 seconds.",
    description:
      "Daftar Invoices replaces the notebook behind the counter. Type an amount or pick items, tap send, and your customer gets a clean invoice on WhatsApp with a pay link. Daftar keeps track of who has paid and sends polite reminders on its own, so you never have to ask twice.",
    website: "daftar.app/invoices",
    niche: "fintech",
    surfaces: ["ios", "android", "web"],
    audience:
      "Owners of small shops and home businesses in Canada and the US, 25–55: corner stores, phone-repair counters, tailors, nail salons, home bakers. They run the business from their phone and WhatsApp, not from finance software, and many still keep a paper notebook of who owes what.",
    problem:
      "They lose money and patience chasing customers who 'will pay tomorrow'. Asking for money feels awkward, the notebook gets messy, and at the end of the month they honestly don't know who still owes them.",
    features: [
      "Create an invoice in about 10 seconds and send it straight to WhatsApp",
      "Payment reminders that send themselves, politely, on a schedule you pick",
      "One screen that shows who owes you and how much",
      "Pay link so customers can pay by card on the spot",
      "Invoices in English, French, Spanish and Arabic, sales-tax ready",
    ],
    tone: ["Casual", "Warm", "Straight-talking"],
    dos: [
      "Film at a real counter or kitchen, with a real-looking customer chat",
      "Show the WhatsApp send moment early and long enough to read",
      "Talk about getting paid and skipping the awkward conversation",
    ],
    donts: [
      "Don't say 'accounting', 'bookkeeping' or 'ERP'",
      "Don't speed up the screen recording",
      "Don't show or mention other apps",
    ],
    cta: "Download Daftar and send your first invoice free",
    brandColor: "#0F7A5C",
    assets: [
      { id: "as-di-1", name: "daftar-logo-pack.zip", kind: "logo", size: "2.4 MB" },
      { id: "as-di-2", name: "invoices-app-screens-2026.zip", kind: "screens", size: "18.6 MB" },
      {
        id: "as-di-3",
        name: "Demo account login (shop: Danforth Phone Repair)",
        kind: "demo-account",
        size: "Login details",
      },
      { id: "as-di-4", name: "daftar-brand-guide-2026.pdf", kind: "brand-guide", size: "6.1 MB" },
      { id: "as-di-5", name: "daftar-explainer-60s.mp4", kind: "footage", size: "42 MB" },
    ],
    // Exactly four: the core-loop QA flow adds a fifth and checks "5 learnings".
    learnings: [
      {
        id: "ln-1",
        text: "Show the WhatsApp send moment within the first 5 seconds. It's the hook that converts.",
        sourceCommissionId: "c-198",
        creatorId: "cr-layla",
        createdAt: at(-44, "11:30"),
      },
      {
        id: "ln-2",
        text: "Keep screen recordings at real speed or slower; viewers missed the scan step at 1.5x.",
        sourceCommissionId: "c-198",
        creatorId: "cr-layla",
        createdAt: at(-38, "15:05"),
      },
      {
        id: "ln-3",
        text: "Say 'getting paid', never 'accounting'. Shop owners scroll past anything that sounds like finance, in any language.",
        sourceCommissionId: "c-203",
        creatorId: "cr-hana",
        createdAt: at(-26, "12:10"),
      },
      {
        id: "ln-4",
        text: "Shop-counter setting outperformed home-office setting 2:1 on watch-through.",
        sourceCommissionId: "c-203",
        creatorId: "cr-hana",
        createdAt: at(-15, "10:40"),
      },
    ],
    updatedAt: at(-6, "09:10"),
  },
  {
    id: "p-daftar-stock",
    businessId: "b-daftar",
    name: "Daftar Stock",
    oneLiner: "Count your whole shop with your phone camera.",
    description:
      "Daftar Stock turns your phone into a barcode scanner. Walk the shelves, scan, and the count goes up. Set a minimum for each item and Daftar tells you on WhatsApp before you run out. Items sold through Daftar Invoices come off your stock automatically.",
    website: "daftar.app/stock",
    niche: "fintech",
    surfaces: ["ios", "android"],
    audience:
      "Owners and staff of corner stores and small markets in Canada and the US who count stock by hand once a month, or only when something runs out.",
    problem:
      "Counting stock takes a whole Sunday with a clipboard and still ends up wrong. They only notice an item is out when a customer asks for it.",
    features: [
      "Scan barcodes with the phone camera to count stock",
      "Low-stock alerts on WhatsApp",
      "Works offline in the stockroom and syncs later",
      "Sold items come off stock automatically with Daftar Invoices",
    ],
    tone: ["Calm", "Clear", "Practical"],
    dos: [
      "Show the count going up with each scan",
      "Use a real small shop or stockroom, slightly messy is fine",
      "Explain it like you would to your uncle who runs a corner store",
    ],
    donts: [
      "Don't say 'SKU', 'inventory valuation' or other jargon",
      "Don't use warehouse stock footage",
    ],
    cta: "Try Daftar Stock free for 30 days",
    brandColor: "#0F7A5C",
    assets: [
      { id: "as-ds-1", name: "stock-app-screens.zip", kind: "screens", size: "11.2 MB" },
      {
        id: "as-ds-2",
        name: "Demo account login (shop: Kensington Corner Market)",
        kind: "demo-account",
        size: "Login details",
      },
    ],
    learnings: [],
    updatedAt: at(-1, "08:50"),
  },
  {
    id: "p-roundleaf",
    businessId: "b-roundleaf",
    name: "Roundleaf",
    oneLiner: "Round up every card payment and save the change.",
    description:
      "Roundleaf rounds up every card payment to the next dollar and moves the difference into a savings pot. Set a goal, watch it fill, and move money out whenever you need it. No minimums, no lock-in.",
    website: "roundleaf.money",
    niche: "fintech",
    surfaces: ["ios", "android"],
    audience:
      "Salaried 22–35 year-olds in US and Canadian cities who earn decently but never seem to have anything left by the end of the month.",
    problem:
      "Saving feels like a big decision they keep putting off. By the 25th the money is gone and they can't say where.",
    features: [
      "Automatic round-ups on every card payment",
      "Savings goals with a progress bar",
      "Weekly 'where did it go' spending summary",
      "Withdraw any time, no fees",
    ],
    tone: ["Friendly", "Light", "Honest"],
    dos: [
      "Use real, modest numbers (a coffee, a ride home, groceries)",
      "Show the round-up notification",
      "Keep it relatable: payday, the end of the month",
    ],
    donts: [
      "Don't promise returns or 'getting rich'",
      "Don't shame people about spending",
      "Don't show real bank cards",
    ],
    cta: "Start saving your change with Roundleaf",
    brandColor: "#6D28D9",
    assets: [
      { id: "as-rl-1", name: "roundleaf-logo-kit.zip", kind: "logo", size: "1.8 MB" },
      { id: "as-rl-2", name: "roundleaf-app-screens-2026.zip", kind: "screens", size: "14.9 MB" },
      { id: "as-rl-3", name: "roundleaf-brand-voice.pdf", kind: "brand-guide", size: "3.2 MB" },
    ],
    learnings: [],
    updatedAt: at(-7, "09:20"),
  },
  {
    id: "p-tablecrew",
    businessId: "b-tablecrew",
    name: "Tablecrew",
    oneLiner: "Build the week's schedule in minutes and stop answering 'when am I on?'",
    description:
      "Tablecrew replaces the schedule photo in the staff group chat. Managers build the week by dragging names onto shifts, staff see their shifts in the app and swap with each other in one tap, and managers approve swaps with a thumbs up.",
    website: "tablecrew.app",
    niche: "b2b",
    surfaces: ["ios", "android", "web"],
    audience:
      "Owners and managers of cafés and small restaurants in the US and Canada with 5–30 staff, mostly part-timers and students.",
    problem:
      "The schedule lives in a photo in the group chat that gets buried. Every day someone asks when they're on, swaps happen in private messages, and nobody shows up for the closing shift.",
    features: [
      "Drag-and-drop weekly schedule",
      "Staff see their shifts and get reminders",
      "One-tap shift swaps with manager approval",
      "Hours summary ready for payroll",
    ],
    tone: ["Funny", "Warm", "Relatable"],
    dos: [
      "Show a real café behind the counter, not an office",
      "Make the group-chat chaos instantly recognizable",
      "Show a swap being approved",
    ],
    donts: ["Don't make staff look lazy", "Don't use 'workforce management' language"],
    cta: "Try Tablecrew free with your team",
    brandColor: "#B4232A",
    assets: [
      { id: "as-tc-1", name: "tablecrew-logo.zip", kind: "logo", size: "980 KB" },
      { id: "as-tc-2", name: "Demo café account (Café Logan)", kind: "demo-account", size: "Login details" },
    ],
    learnings: [
      {
        id: "ln-5",
        text: "Open on the group-chat notification sound. Café owners recognize it instantly.",
        sourceCommissionId: "c-303",
        creatorId: "cr-layla",
        createdAt: at(-11, "13:00"),
      },
    ],
    updatedAt: at(-2, "11:00"),
  },
  {
    id: "p-qalamy",
    businessId: "b-qalamy",
    name: "Qalamy",
    oneLiner: "An AI writing assistant that writes well in English and Arabic.",
    description:
      "Qalamy drafts, rewrites and fixes your writing in English and Arabic: work emails, messages, posts and CVs. It keeps your tone, explains its grammar fixes, and can turn an English draft into natural Arabic, or the other way round, without it sounding machine-translated.",
    website: "qalamy.ai",
    niche: "ai",
    surfaces: ["ios", "android", "web"],
    audience:
      "Professionals and students, 20–40, who write at work in English and Arabic, or in their second language, and find it slow to get the tone right.",
    problem:
      "A careful work email takes them three times as long as it should, and most AI tools give them text that sounds stiff or machine-translated.",
    features: [
      "Draft from a one-line prompt in English or Arabic",
      "Rewrite in a different tone (formal, friendly, short)",
      "Grammar and spelling fixes with explanations",
      "Works inside documents and email on the web",
    ],
    tone: ["Smart", "Playful", "Confident"],
    dos: [
      "Show a real, relatable writing moment (an email to a manager, landlord or client)",
      "Show the before and after text on screen",
      "Keep on-screen text readable for at least 2 seconds",
    ],
    donts: [
      "Don't say it replaces writers or teachers",
      "Don't mention other AI tools by name",
      "Don't show students using it to cheat on exams",
    ],
    cta: "Write your first draft free on Qalamy",
    brandColor: "#1D1D6B",
    assets: [
      { id: "as-qa-1", name: "qalamy-logo-pack.zip", kind: "logo", size: "2.1 MB" },
      { id: "as-qa-2", name: "qalamy-screens-web-mobile.zip", kind: "screens", size: "22.4 MB" },
      { id: "as-qa-3", name: "qalamy-brand-guide.pdf", kind: "brand-guide", size: "4.8 MB" },
    ],
    learnings: [],
    updatedAt: at(-1, "15:30"),
  },
  {
    id: "p-notewren",
    businessId: "b-notewren",
    name: "Notewren",
    oneLiner: "An AI note-taker that writes up every meeting, so you can just talk.",
    description:
      "Notewren joins your video calls, with everyone's knowledge, and writes clear notes as you talk: what was decided, who's doing what, and by when. After the call you can ask your notes a question, like 'what did we agree on pricing?', and share a summary with the team in one tap.",
    website: "notewren.app",
    niche: "ai",
    surfaces: ["web", "ios", "android"],
    audience:
      "Team leads, founders and freelancers, 24–40, who spend half the day on video calls and the other half trying to remember what was decided.",
    problem:
      "They leave every call with a vague sense of what was agreed and no notes, then lose an hour a week asking 'wait, who was doing that?'",
    features: [
      "Joins your calls and writes notes as you talk",
      "Action items with an owner and a date",
      "Ask your notes a question after the call",
      "One-tap summary to share with the team",
    ],
    tone: ["Warm", "Reassuring", "Clear"],
    dos: [
      "Admit you were a bad note-taker before",
      "Show the action items and one question asked of your notes",
      "Make it clear everyone on the call knows Notewren is there",
    ],
    donts: [
      "Don't show or record anyone who hasn't agreed to be in the video",
      "Don't claim the notes are perfect or replace listening",
      "Don't name other meeting or AI tools",
    ],
    cta: "Try Notewren free on your next meeting",
    brandColor: "#1F4FD1",
    assets: [
      { id: "as-nw-1", name: "notewren-logo.zip", kind: "logo", size: "1.1 MB" },
      { id: "as-nw-2", name: "notewren-app-screens.zip", kind: "screens", size: "9.7 MB" },
    ],
    learnings: [
      {
        id: "ln-6",
        text: "Viewers trusted the 'I never take notes either' confession more than any feature list.",
        sourceCommissionId: "c-304",
        creatorId: "cr-layla",
        createdAt: at(-60, "10:00"),
      },
    ],
    updatedAt: at(-1, "12:00"),
  },
  {
    id: "p-wayfolk",
    businessId: "b-wayfolk",
    name: "Wayfolk",
    oneLiner: "Plan a group trip, split the costs, keep one itinerary.",
    description:
      "Wayfolk gives every group trip one shared plan: dates everyone can make, a vote on where to stay, a single itinerary, and costs split automatically so nobody has to chase anyone for their share.",
    website: "wayfolk.travel",
    niche: "consumer",
    surfaces: ["ios", "android"],
    audience:
      "Friends and cousins, 20–35, in the US and Canada who plan weekend trips, cabin rentals and road trips in group chats.",
    problem:
      "Group trips die in the group chat: nobody agrees on dates, one person pays for everything, and the money conversation afterwards gets awkward.",
    features: [
      "Date poll that finds when everyone is free",
      "Vote on places to stay",
      "Shared day-by-day itinerary",
      "Automatic cost splitting with reminders",
    ],
    tone: ["Fun", "Energetic", "Casual"],
    dos: [
      "Show a group chat that's going nowhere",
      "Use realistic trips (a cabin weekend, a road trip)",
      "Show the split-the-cost screen",
    ],
    donts: ["Don't show alcohol or nightlife", "Don't show real hotel or airline brands"],
    cta: "Plan your next trip on Wayfolk",
    brandColor: "#C2410C",
    assets: [
      { id: "as-wf-1", name: "wayfolk-logo.zip", kind: "logo", size: "1.4 MB" },
      { id: "as-wf-2", name: "wayfolk-screens.zip", kind: "screens", size: "16.0 MB" },
      { id: "as-wf-3", name: "Demo trip: 'Cabin weekend'", kind: "demo-account", size: "Login details" },
    ],
    learnings: [],
    updatedAt: at(-3, "17:00"),
  },
  {
    id: "p-wasla",
    businessId: "b-wasla",
    name: "Wasla",
    oneLiner: "Plan the day's delivery route in one tap.",
    description:
      "Wasla takes a list of drop-offs, even messy addresses typed by customers, and orders them into the fastest route. Drivers get turn-by-turn directions and customers get a WhatsApp message when the courier is close.",
    website: "wasla.app",
    niche: "b2b",
    surfaces: ["android", "web"],
    audience:
      "Owners of small courier and delivery teams with 2–15 drivers in cities where addresses are messy, from Riyadh to Cairo to Lagos. Many deliver for Instagram shops.",
    problem:
      "Routes are planned in the owner's head every morning. Drivers zigzag across the city, call customers for directions, and deliver 20 orders when they could do 30.",
    features: [
      "Paste a list of addresses, get an ordered route",
      "Understands landmark-style addresses ('behind the blue pharmacy')",
      "Customer gets a WhatsApp 'courier nearby' message",
      "Daily summary of deliveries per driver",
    ],
    tone: ["Straight-talking", "Practical", "Local"],
    dos: [
      "Show a real street and a driver's phone, parked",
      "Use landmark addresses like real customers do",
    ],
    donts: ["Don't show phone use while driving", "Don't name real courier companies"],
    cta: "Try Wasla free for your first 100 drops",
    brandColor: "#334155",
    assets: [{ id: "as-wa-1", name: "wasla-screens-en-ar.zip", kind: "screens", size: "7.3 MB" }],
    learnings: [],
    updatedAt: at(-5, "14:00"),
  },
  {
    id: "p-souqly",
    businessId: "b-souqly",
    name: "Souqly",
    oneLiner: "Turn your Instagram shop into a real online store in one evening.",
    description:
      "Souqly builds a simple online store from your Instagram posts. Customers see prices, sizes and delivery fees, check out by card or cash on delivery, and you get the order on WhatsApp instead of answering the same DM fifty times.",
    website: "souqly.shop",
    niche: "ecommerce",
    surfaces: ["ios", "android", "web"],
    audience:
      "People selling clothes, jewellery, candles, baked goods or accessories through Instagram DMs, mostly women 20–40, in Egypt and, from December, in Canada and the US.",
    problem:
      "They spend hours a day answering 'how much?', 'is it available?' and 'delivery?' in DMs, and lose orders when they can't reply fast enough.",
    features: [
      "Import products from Instagram posts",
      "Prices, sizes and stock on one page",
      "Card and cash-on-delivery checkout",
      "Orders arrive on WhatsApp",
    ],
    tone: ["Funny", "Warm", "Encouraging"],
    dos: ["Show the DM chaos honestly", "Show a real product being added", "Show the store link in the bio"],
    donts: ["Don't mock customers", "Don't show real Instagram accounts or usernames"],
    cta: "Open your Souqly store free tonight",
    brandColor: "#BE185D",
    assets: [
      { id: "as-sq-1", name: "souqly-logo.zip", kind: "logo", size: "1.6 MB" },
      { id: "as-sq-2", name: "souqly-screens-en-ar.zip", kind: "screens", size: "19.1 MB" },
      { id: "as-sq-3", name: "Demo store (Bint Al-Souq)", kind: "demo-account", size: "Login details" },
    ],
    learnings: [],
    updatedAt: at(0, "08:20"),
  },
  {
    id: "p-brindle",
    businessId: "b-brindle",
    name: "Brindle Ring",
    oneLiner: "A sleep and recovery ring that tells you each morning how ready you are for the day.",
    description:
      "Brindle Ring tracks your sleep, resting heart rate and recovery overnight, and the companion app turns it into one morning readiness score with a plain-English reason. A wind-down reminder nudges you to bed on time, and the battery lasts a week.",
    website: "brindlering.app",
    niche: "health",
    surfaces: ["ios", "android"],
    audience:
      "Busy 25–45 year-olds who train a few times a week, sleep badly more often than they'd like, and want to know why some mornings feel terrible.",
    problem:
      "They wake up tired without knowing why, try a new sleep tip every week, and can't tell what actually helps.",
    features: [
      "Morning readiness score with the reason behind it",
      "Sleep stages and a wind-down reminder",
      "Seven-day battery, full charge in an hour",
      "Companion app with a demo mode and a sample week of data",
    ],
    tone: ["Reassuring", "Warm", "Simple"],
    dos: [
      "Film with your own ring, or use the companion app's demo mode (we can't ship rings through Yapp)",
      "Show your real morning score, even a bad one",
      "Show the ring on your hand for at least two seconds",
    ],
    donts: [
      "No medical claims: it doesn't diagnose, treat or prevent anything",
      "Don't show anyone else's health data",
      "Don't promise weight loss or better performance",
    ],
    cta: "Try Brindle Ring for 60 nights",
    brandColor: "#0E7490",
    assets: [
      { id: "as-br-1", name: "brindle-logo.zip", kind: "logo", size: "1.2 MB" },
      { id: "as-br-2", name: "brindle-screens.zip", kind: "screens", size: "12.6 MB" },
    ],
    learnings: [],
    updatedAt: at(-4, "10:00"),
  },
  {
    id: "p-pixel",
    businessId: "b-pixel",
    name: "Pixel Party",
    oneLiner: "Party games your whole group plays on the phones they already have.",
    description:
      "Pixel Party is a pack of twelve quick party games, from Sketch Sprint, a drawing race, to Fib Finder, a bluffing game. One person starts a game, everyone else joins with a four-letter code in their browser, and a round takes about three minutes. Family mode keeps the prompts clean.",
    website: "pixelarcade.games",
    niche: "gaming",
    surfaces: ["ios", "android"],
    audience: "Friends and families, 16–35, who end up scrolling on their phones at get-togethers anyway.",
    problem:
      "They get together and everyone ends up on their own phone, or someone spends twenty minutes explaining a board game nobody wants to learn.",
    features: [
      "Twelve party games, from drawing races to bluffing",
      "Guests join with a four-letter code, no download",
      "Rounds take about three minutes",
      "Family mode with clean prompts",
    ],
    tone: ["Playful", "Friendly", "Energetic"],
    dos: [
      "Film a real group playing, with real reactions",
      "Show someone joining with the code",
      "Show at least one full round, start to finish",
    ],
    donts: [
      "Don't show anyone under 16 on camera",
      "Don't show alcohol or drinking games",
      "Don't name other games or consoles",
    ],
    cta: "Start a free game night on Pixel Party",
    brandColor: "#4338CA",
    assets: [{ id: "as-px-1", name: "pixel-screens.zip", kind: "screens", size: "8.4 MB" }],
    learnings: [],
    updatedAt: at(-3, "15:00"),
  },
  {
    id: "p-wrenlow",
    businessId: "b-wrenlow",
    name: "Wrenlow Buds",
    oneLiner: "Wireless earbuds that tune themselves to your ears in 30 seconds.",
    description:
      "Wrenlow Buds run a 30-second hearing check in the companion app and tune the sound to your ears. Noise cancelling has a street mode that lets traffic through, a charge lasts eight hours (32 with the case), and if you lose one, the app shows where it was last connected.",
    website: "wrenlowaudio.co.uk",
    niche: "gadgets",
    surfaces: ["ios", "android"],
    audience:
      "Commuters, walkers and runners, 20–40, in busy cities, who've lost a bud on the bus at least once and want sound that fits their ears.",
    problem:
      "Most earbuds sound the same for everyone. Either the music is so loud they miss their stop, or the noise cancelling is so strong they don't hear a bike coming.",
    features: [
      "30-second hearing check that tunes the sound to your ears",
      "Noise cancelling with a one-tap street mode",
      "Eight hours per charge, 32 with the case",
      "Find-my-buds map in the app",
    ],
    tone: ["Honest", "Light", "Confident"],
    dos: [
      "Film with your own pair, or use the companion app's demo mode (we can't ship earbuds through Yapp)",
      "Show the hearing check",
      "Wear them outside, where the real noise is",
    ],
    donts: [
      "No hearing-health or medical claims",
      "Don't name or show other earbud brands",
      "Don't show anyone wearing them while driving or cycling in traffic",
    ],
    cta: "Try Wrenlow Buds for 30 days, with free returns",
    brandColor: "#B45309",
    assets: [
      { id: "as-wl-1", name: "wrenlow-logo.zip", kind: "logo", size: "1.0 MB" },
      { id: "as-wl-2", name: "wrenlow-screens.zip", kind: "screens", size: "10.8 MB" },
    ],
    learnings: [],
    updatedAt: at(-2, "16:30"),
  },
];
