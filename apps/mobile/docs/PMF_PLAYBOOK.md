# PMF Discovery Playbook

> **Purpose:** A repeatable framework for finding product-market fit. Use this BEFORE writing code.

---

## The Core Philosophy

**Don't invent problems. Find where people are already screaming, then build the obvious solution nobody's built yet.**

The best product ideas feel obvious in hindsight because the demand was always there. Your job is discovery, not invention.

---

## Tools

- **[IDEA_TRACKER.html](IDEA_TRACKER.html)** - Interactive idea scoring tool using the IDEAL framework (Timing 25%, Market 20%, Execution 20%, Advantage 15%, Validation 10%, Tarpit Risk 10%). Open in browser to prioritize ideas before validation.

---

## The Framework (4 Phases)

```
PHASE 1: DISCOVER THE PROBLEM
├── Complaint Mining
├── Job Narrowing (JTBD)
├── Culture Immersion
└── Mom Test Conversations

PHASE 2: VALIDATE THE MARKET
├── Money Validation
├── Gap Analysis + Validation
├── Timing Check
└── ICP Segmentation

PHASE 3: VALIDATE THE SOLUTION
├── Behavioral Test (Fake Door / Pre-sales / Concierge)
├── Willingness to Pay Testing
└── Commitment Ladder

PHASE 4: BUILD & MEASURE
├── Define MVP
├── Launch to ICP
├── Sean Ellis 40% Test
├── Retention Tracking
└── Iterate or Pivot
```

---

# PHASE 1: DISCOVER THE PROBLEM

## 1.1 Complaint Mining

**Goal:** Find where people are actively frustrated, not where YOU think there's a problem.

### Where to Look

| Source | What to Search | Signal Strength |
|--------|----------------|-----------------|
| Reddit | "[topic] frustrating", "I wish", "why can't" | HIGH if 100+ upvotes |
| App Store reviews | 1-3 star reviews of competitors | HIGH - paying users complaining |
| G2/Capterra | Negative reviews, "cons" sections | HIGH - B2B buyers |
| Twitter/X | Complaints, rants, quote tweets | MEDIUM - emotional but fleeting |
| Forums | Long-form frustration posts | HIGH - dedicated users |
| YouTube comments | On competitor product videos | MEDIUM |
| HackerNews | "Ask HN" threads about problems | HIGH for dev tools |

### Threshold for "Real Problem"

- **100+ upvotes/likes** on a complaint = validated frustration
- **500+ votes** on feature request = strong demand signal
- **Multiple independent complaints** saying the same thing = pattern

---

## 1.2 Feature Request Mining

**Goal:** Find features users have begged for that big companies ignore. These are pre-validated product ideas.

### The Strategy

Big companies have blind spots. They can't or won't build everything users want. Features that:
- Have 500+ votes on feedback forums
- Have been ignored for 2+ years
- Keep getting re-requested

...represent validated demand with built-in distribution (the existing frustrated user base).

### Where to Mine

| Platform | How to Access | Gold Standard |
|----------|---------------|---------------|
| Canny boards | `[product] canny.io` or feedback.product.com | 500+ votes, years old |
| Feature request forums | `[product] feature request` | Highly upvoted, no response |
| UserVoice | `[product] uservoice` | "Under review" for 3+ years |
| GitHub Issues | Filter by thumbs-up reactions, oldest | 100+ reactions, years open |
| Reddit threads | `[product] feature request` | Same request appearing yearly |
| Product Hunt comments | Comments on competitor launches | "I wish it had..." patterns |

### Scoring Framework

| Factor | Points | Why It Matters |
|--------|--------|----------------|
| 500+ votes | +3 | Strong demand signal |
| 1000+ votes | +5 | Exceptional demand |
| 2+ years ignored | +3 | Company can't/won't build it |
| 5+ years ignored | +5 | Permanent gap - they'll never do it |
| Recent activity | +2 | Still actively wanted |
| Cross-platform complaints | +3 | Not just one vocal minority |
| Company gave non-answer | +2 | "We'll consider it" = no |
| Technical moat possible | +3 | You can build what they can't |

**Score 10+** = Strong opportunity worth exploring

### Example Research Process

1. **Pick a category** (fitness apps, project management, social media, etc.)
2. **List major players** (Spotify, Notion, Strava, etc.)
3. **Find their feedback channels:**
   - Search: `[product] canny`
   - Search: `[product] feature request forum`
   - Search: `[product] uservoice`
   - Check: feedback.product.com, community.product.com
4. **Sort by votes, filter by oldest**
5. **Document opportunities:**
   - Feature requested
   - Vote count
   - Age of request
   - Company response (or lack thereof)
   - Why they might not build it

### Why Companies Don't Build Requested Features

Understanding WHY they won't helps you see the opportunity:

| Reason | Your Opportunity |
|--------|------------------|
| **Doesn't fit business model** | Build focused alternative |
| **Cannibalizes existing product** | They can't, you can |
| **Too niche for their scale** | Perfect for focused indie |
| **Legacy tech debt** | Start fresh |
| **Organizational politics** | No politics as solo/small team |
| **Not enough scale** | Enough for indie, not for enterprise |

### Validation Steps After Finding Feature

1. **Verify current state** - Is it still not built?
2. **Check for competitors** - Has someone else built it?
3. **Size the audience** - Are there enough potential users?
4. **Test feasibility** - Can you actually build it?
5. **Run Mom Test** - Talk to people who upvoted

### Template: Feature Request Opportunity Log

```markdown
## [Feature Name]

**Source:** [Link to feature request]
**Product:** [Which company's product]
**Votes:** [Number]
**First Requested:** [Date]
**Last Activity:** [Date]
**Company Response:** [Quote or "None"]

**Why they won't build it:**
- [ ] Doesn't fit business model
- [ ] Would cannibalize existing product
- [ ] Too niche for their scale
- [ ] Technical debt prevents it
- [ ] Other: ___

**Score:** ___/20

**Notes:**
___
```

### What to Capture

For each complaint, document:
1. **Exact quote** (their words, not your summary)
2. **Platform + link** (for credibility)
3. **Engagement** (upvotes, replies, shares)
4. **Date** (recent = active problem)
5. **Sentiment intensity** (mild annoyance vs. rage)

---

## 1.2 Job Narrowing (JTBD)

**Goal:** Find the trigger moment and core need. Strip away features until you hit the essence.

### The JTBD Interview Questions

1. "Walk me through the last time you experienced [problem]"
2. "What were you doing right before?"
3. "What did you try first?"
4. "Why didn't that work?"
5. "What would success look like?"

### The Timeline Map

```
[Trigger Event] → [First Thought] → [Search Behavior] → [Solution Attempt] → [Frustration Point] → [Desired Outcome]
```

### Job Statement Format

**When I** [trigger/situation], **I want to** [motivation], **so I can** [desired outcome].

### Narrowing Exercise

Keep asking "but what do they ACTUALLY want?" until you hit the irreducible core:

```
Build [feature]
  ↓ but what do they actually want?
Get [capability]
  ↓ but what do they actually want?
Do [action]
  ↓ but what do they actually want?
FEEL [emotion] / ACHIEVE [outcome]
```

---

## 1.3 Culture Immersion

**Goal:** Learn to speak like them, think like them, know what makes them cringe.

### What to Learn

| Category | Questions to Answer |
|----------|---------------------|
| Vocabulary | What terms do insiders use? What's outdated? |
| Values | What do they care about? What's sacred? |
| Inside Jokes | What memes do they all know? |
| Status Symbols | What shows you're a "real" member? |
| Cringe Triggers | What would make them dismiss you as fake? |
| Communities | Where do they gather? Who are the influencers? |

### How to Learn

1. **Lurk for 2+ weeks** - Read without posting
2. **Note repeated phrases** - If you see it 5+ times, it matters
3. **Follow influencers** - Who do they listen to?
4. **Watch content** - YouTube, TikTok, podcasts they consume
5. **Read FAQs/glossaries** - Community-made guides are gold

---

## 1.4 Mom Test Conversations

**Goal:** Get truth, not validation. Talk about their life, not your idea.

### The Rules

1. **Talk about their life, not your idea**
   - BAD: "Would you use an app that..."
   - GOOD: "Tell me about the last time you [had problem]"

2. **Ask about specifics in the past, not opinions about the future**
   - BAD: "Would you pay $5/month for this?"
   - GOOD: "Have you ever paid for a [category] app? Which one? How much?"

3. **Talk less, listen more**
   - You should be speaking <30% of the time

### Questions That Get Truth

| Type | Example |
|------|---------|
| Past behavior | "What did you do the last time you had this problem?" |
| Current solutions | "What are you using now? How did you find it?" |
| Money | "Have you ever paid for something like this? How much?" |
| Time | "How much time do you spend on [workaround] per week?" |
| Emotion | "What's the most frustrating part?" |

### Red Flags (They're Being Polite, Not Honest)

- "That sounds cool" (no commitment)
- "I'd probably use that" (hypothetical)
- "You should talk to my friend" (deflection)
- "Let me know when it's ready" (no urgency)

### Green Flags (Real Interest)

- They describe the problem in detail (without prompting)
- They've tried multiple solutions
- They've spent money on alternatives
- They ask when they can use it
- They offer to introduce you to others with same problem

### Number of Conversations

- **Minimum:** 10 conversations
- **Ideal:** 20-30 before building
- **Signal:** When you start hearing the same things repeated, you have enough

---

# PHASE 2: VALIDATE THE MARKET

## 2.1 Money Validation

**Goal:** Prove people already spend money on this category of problem.

### What to Find

| Evidence | Where to Look | What It Proves |
|----------|---------------|----------------|
| Competitor revenue | Crunchbase, press releases, app analytics | Market exists |
| Subscription prices | App stores, competitor websites | Price anchors |
| Adjacent spending | Industry reports, surveys | Budget exists |
| Funding rounds | TechCrunch, Crunchbase | Investors believe |

### Revenue Proxies If Not Public

- **App store rankings** - Top 100 = significant revenue
- **Employee count** - More employees = more revenue
- **Advertising spend** - Can reverse-engineer from ad volume
- **User reviews** - 10,000+ reviews = substantial user base

---

## 2.2 Gap Analysis + Validation

**Goal:** Find what nobody does, then verify the gap actually matters.

### Step 1: Competitor Map

| Competitor | What They Do | What They DON'T Do |
|------------|--------------|---------------------|
| [Name] | [Features] | [Gaps] |

### Step 2: Find the Gap Statement

Complete this sentence:
**"Nobody lets you [specific action] for [specific audience]."**

### Step 3: Validate the Gap Matters

**WARNING:** Many gaps exist because they're not valuable. Validate before assuming.

Ask in interviews:
- "Have you ever wished you could [gap]?"
- "What would you do if you could [gap]?"
- "How much time/money would that save you?"

Survey method (JTBD):
- List 5-10 jobs the product could do
- Ask users to rank: Importance (1-5) AND Satisfaction with current solutions (1-5)
- **Real gap = High importance + Low satisfaction**

---

## 2.3 Timing Check

**Goal:** Confirm the moment is right. Good ideas at wrong times fail.

### Timing Signals

| Signal | What to Look For | Where to Find It |
|--------|------------------|------------------|
| Tech readiness | APIs, infrastructure now possible | Developer docs, GitHub |
| Big tech entering | Validates market, creates awareness | Tech news, WWDC/Google I/O |
| Market growth | Audience expanding | Industry reports, trends data |
| Regulatory changes | New opportunities or threats | News, policy updates |
| Cultural moment | Mainstream attention on the space | Social media, news |

---

## 2.4 ICP Segmentation

**Goal:** Define exactly who you're building for. "[Broad category]" is too broad.

### ICP Definition Framework

| Attribute | Be Specific |
|-----------|-------------|
| Demographics | Age, gender, location |
| Behavior | What they do, how often |
| Current solutions | What they use now |
| Budget | What they spend on similar |
| Pain intensity | How much does this bother them? |
| Accessibility | Can you reach them? |

### The "High-Expectation Customer"

From Superhuman's PMF engine: Focus on the segment that would be MOST disappointed if your product went away.

Don't build for the average user. Build for the user who NEEDS this most.

---

# PHASE 3: VALIDATE THE SOLUTION

## 3.1 Behavioral Test

**Goal:** See if people will actually DO something, not just say they're interested.

### Option A: Fake Door Test

Create a "door" that looks real but doesn't exist. Track who walks through.

**Setup:**
1. Landing page describing your solution
2. CTA button ("Get Started", "Try Free", etc.)
3. After click: "Thanks! We're launching soon. Enter email for early access."
4. Track: Page visitors → Button clicks → Email signups

**Benchmarks:**
- Landing page conversion to email: 10%+ is good (6.6% average)
- Button click rate: 15-30% of page visitors

### Option B: Pre-sales Test

Same as fake door, but with payment intent.

**Setup:**
1. Landing page with compelling offer
2. Price displayed ($X/month or $Y/year)
3. "Get Early Access" button
4. Payment form (Stripe Checkout)
5. After payment: "Thanks! We're finishing development. You'll get access in [X] weeks."

**Why it works:** People saying they'd pay vs. actually entering credit card = completely different signal.

**Refund policy:** Offer full refunds, be transparent you're validating. Most people don't ask for refunds.

### Option C: Concierge MVP

Manually deliver the solution. You are the product.

**Setup:**
1. Find 5-10 people with the problem
2. Offer to solve it for them (free or paid)
3. Do the work manually
4. Observe: Do they come back? Do they refer others?

### Which Test to Use?

| Test | Best When | Effort | Signal Quality |
|------|-----------|--------|----------------|
| Fake Door | High traffic source available | Low | Medium |
| Pre-sales | Confident in value prop | Medium | HIGH |
| Concierge | Uncertain what solution should be | High | HIGH |

---

## 3.2 Willingness to Pay Testing

**Goal:** Find the right price before building.

### Van Westendorp Method

Ask 4 questions:
1. "At what price would this be too expensive to consider?" (too expensive)
2. "At what price would this be so cheap you'd question quality?" (too cheap)
3. "At what price does this start to seem expensive but still worth it?" (expensive)
4. "At what price is this a great deal?" (bargain)

Plot responses. Optimal price = where "too cheap" and "too expensive" lines cross.

### Gabor-Granger Method

Simpler. Show price, ask yes/no.

"Would you buy this at $X?"
- If yes, ask at $X+2
- If no, ask at $X-2
- Continue until you find threshold

---

## 3.3 Commitment Ladder

**Goal:** Track escalating commitment signals.

### The Ladder

| Level | Commitment Type | Signal Strength |
|-------|-----------------|-----------------|
| 1 | Gave email | Low |
| 2 | Took follow-up call | Medium |
| 3 | Introduced to friend with same problem | High |
| 4 | Pre-ordered or paid deposit | Very High |
| 5 | Became beta tester, gave detailed feedback | Very High |

If people give email but never respond to follow-up, interest was shallow.
If people introduce friends or pre-pay, you have something real.

---

# PHASE 4: BUILD & MEASURE

## 4.1 Define MVP

**Goal:** Build the minimum version that tests your core hypothesis.

### MVP Principles

1. **One feature, done well** - Not 10 features done poorly
2. **Tests the riskiest assumption** - What must be true for this to work?
3. **Can be used by real users** - Not just a demo
4. **Generates measurable data** - Usage, retention, feedback

### MVP Definition Exercise

Complete this:
- **Core hypothesis:** If we let users [action], they will [behavior] because [reason].
- **MVP must include:** [minimum features to test hypothesis]
- **MVP must NOT include:** [everything else]

---

## 4.2 Launch to ICP

**Goal:** Get your product to high-expectation customers, not the general public.

### Where to Launch

| Channel | Best For | How |
|---------|----------|-----|
| Reddit communities | Niche products | Genuine participation, then share |
| Twitter/X | Tech, creator tools | Build in public, engage influencers |
| Discord servers | Gaming, communities | Be a member first |
| Product Hunt | Dev tools, SaaS | Prepare launch day strategy |
| TikTok | Consumer, viral potential | Create native content |
| Direct outreach | B2B, high-value users | Personal emails/DMs |

### Launch Checklist

- [ ] Know exactly where ICP hangs out
- [ ] Have been active in community before launching
- [ ] Have 10-20 beta users ready to give feedback
- [ ] Have feedback mechanism built into product
- [ ] Have analytics tracking key metrics

---

## 4.3 Sean Ellis 40% Test

**Goal:** Quantify if you have product-market fit.

### The Question

Ask users who have experienced the core product at least twice:

**"How would you feel if you could no longer use [product]?"**

Options:
- Very disappointed
- Somewhat disappointed
- Not disappointed

### The Benchmark

- **<40% "Very disappointed"** = Keep iterating, don't scale
- **40%+ "Very disappointed"** = You have PMF, can focus on growth

### When to Run

- After 100+ active users
- Minimum 30 responses for directional data
- 100+ responses for confidence

### Improving Your Score

From Superhuman's playbook:
1. Segment by disappointment level
2. Find what "very disappointed" users have in common
3. Double down on what they love
4. Address objections from "somewhat disappointed" users
5. Re-run survey quarterly

---

## 4.4 Retention Tracking

**Goal:** Confirm users stick around, not just try once.

### Metrics to Track

| Metric | Target | Notes |
|--------|--------|-------|
| Day 1 retention | 40%+ | Come back day after first use |
| Week 1 retention | 25%+ | Use at least once in first week |
| Month 1 retention | 15-20%+ | Still using after 30 days |
| Cohort curve shape | Flattens | If it keeps declining, no PMF |

### The Cohort Curve

Good:
```
100% → 60% → 40% → 35% → 33% → 32% → 32% (flattens)
```

Bad:
```
100% → 50% → 25% → 12% → 6% → 3% → 1% (keeps declining)
```

If the curve never flattens, you have a "leaky bucket" - people try but don't stay.

---

## 4.5 Iterate or Pivot

**Goal:** Know when to keep going vs. change direction.

### Decision Framework

| Signal | Action |
|--------|--------|
| Sean Ellis <40%, retention declining | Major pivot needed |
| Sean Ellis 30-40%, retention flat | Keep iterating on current path |
| Sean Ellis 40%+, retention healthy | Focus on growth |

### Types of Pivots

| Pivot Type | When | Example |
|------------|------|---------|
| Customer segment | Right product, wrong audience | Slack: gaming → enterprise |
| Problem | Right audience, wrong problem | Notion: no-code → productivity |
| Solution | Right problem, wrong approach | YouTube: dating → video sharing |
| Channel | Right product, wrong distribution | - |
| Revenue model | Right product, wrong monetization | - |

### Pre-Define Your Pivot Triggers

Before launching, decide:
- "If [metric] is below [threshold] after [timeframe], we will [action]."

Example:
- "If Sean Ellis <30% after 500 users, we will interview churned users and pivot solution."
- "If conversion <2% after 1000 landing page visitors, we will test different positioning."

---

# Appendix: Key Benchmarks Reference

## Conversion Rates

| Type | Average | Good | Great |
|------|---------|------|-------|
| Landing page → email | 6.6% | 10% | 15%+ |
| Email → active user | 20% | 30% | 50%+ |
| Free → paid | 2-3% | 5% | 10%+ |
| Trial → paid | 15% | 25% | 40%+ |

## Retention Rates

| Type | Floor | Good | Great |
|------|-------|------|-------|
| Day 1 (consumer) | 25% | 40% | 60%+ |
| Day 7 (consumer) | 10% | 20% | 35%+ |
| Day 30 (consumer) | 5% | 10% | 20%+ |
| Month 1 (SaaS) | 80% | 90% | 95%+ |

## PMF Indicators

| Metric | Threshold |
|--------|-----------|
| Sean Ellis "very disappointed" | 40%+ |
| DAU/MAU (consumer) | 20%+ |
| NPS | 50+ |
| Organic growth % | 30%+ of new users |

---

# Appendix: Sources

**Frameworks:**
- Sean Ellis 40% Test
- Superhuman PMF Engine (Rahul Vohra, First Round Review)
- Y Combinator validation principles
- Lean Startup (Eric Ries)
- The Mom Test (Rob Fitzpatrick)
- Jobs to Be Done (Clayton Christensen)
- Customer Development (Steve Blank)

**Case Studies:**
- Airbnb PMF story
- Stripe early user monitoring
- Notion pivot to productivity
- Dropbox video validation
