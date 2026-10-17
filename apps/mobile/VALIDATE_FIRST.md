# Validate Before Building

> **Complete this checklist BEFORE technical setup.**
> Full playbook: [docs/PMF_PLAYBOOK.md](./docs/PMF_PLAYBOOK.md)

---

## Phase 0: Idea Scoring (IDEAL Score)

Before deep validation, score your idea to prioritize what's worth researching.

### IDEAL Score Formula (Max 100)

| Factor | Weight | Max | Question |
|--------|--------|-----|----------|
| **Timing** | 25% | 25 | Why NOW? Recent disruption, backlash, or tech unlock? |
| **Market** | 20% | 20 | TAM size? Growth rate? People spending money? |
| **Execution** | 20% | 20 | Can YOU build it? Skills, stack, time? |
| **Advantage** | 15% | 15 | Moat? Unique angle? Why won't others copy instantly? |
| **Validation** | 10% | 10 | Evidence? Reddit upvotes, reviews, complaint threads? |
| **Tarpit Risk** | 10% | 10 | Lower = riskier. Network effects? Crowded market? |

### Score Interpretation

| Score | Action |
|-------|--------|
| **80-100** | Prioritize - Start validation immediately |
| **60-79** | Promising - Research more, find your wedge |
| **40-59** | Caution - Needs strong differentiation or niche |
| **0-39** | Avoid - Classic tarpit or saturated market |

### Quick Tarpit Check

These markets are graveyards - lower your tarpit score accordingly:
- Dating apps (network effects)
- Email clients (Sparrow, Mailbox, Inbox - all dead)
- Note apps (Notion/Obsidian won)
- Todo apps (saturated)
- CRM (Salesforce dominance)

### Example Scoring

**IdolSing** (K-pop romanized lyrics):
- Timing: 23/25 (AI ready, K-pop peak, Apple validated market)
- Market: 18/20 (150M fans, proven spend)
- Execution: 19/20 (Can build in weeks, clear tech path)
- Advantage: 14/15 (Niche expertise, culture fluency)
- Validation: 10/10 (500+ Spotify votes, competitor revenue)
- Tarpit: 9/10 (Low risk - specific niche, no network effects)
- **IDEAL Score: 93** → Build it

---

## Phase 1: Problem Discovery

### Complaint Mining
- [ ] Found 3+ complaint threads with 100+ upvotes/engagement
- [ ] Documented exact quotes (their words, not your summary)
- [ ] Complaints are recent (within last 12 months)
- [ ] Pattern: Multiple independent people saying the same thing

### Feature Request Mining
- [ ] Searched feedback forums of major players in this space (Canny, UserVoice, etc.)
- [ ] Found features with 500+ votes that have been ignored 2+ years
- [ ] Documented why the company won't/can't build it
- [ ] Verified no competitor has solved it yet
- [ ] Scored opportunity using the framework (10+ = strong signal)

### JTBD Statement
- [ ] Wrote job statement: **"When I ___, I want to ___, so I can ___"**
- [ ] Identified the trigger moment (what causes the need)
- [ ] Found the emotional core (what they REALLY want)

### Culture Immersion
- [ ] Lurked in community 2+ weeks
- [ ] Know insider vocabulary (what terms they use)
- [ ] Know cringe triggers (what would make them dismiss you)
- [ ] Identified where they hang out (Reddit, Discord, Twitter, etc.)

### Mom Test Conversations
- [ ] Had 10+ conversations about the problem (not your solution)
- [ ] Asked about past behavior, not hypothetical future
- [ ] Heard the same pain points repeated across conversations

---

## Phase 2: Market Validation

### Money Exists
- [ ] Found competitors with revenue (proves market exists)
- [ ] Know what people currently pay for alternatives
- [ ] ICP has budget for this category

### Gap Is Real
- [ ] Wrote gap statement: **"Nobody lets you [X] for [Y]"**
- [ ] Validated gap matters (asked in interviews, not assumed)
- [ ] Gap is high-importance + low-satisfaction

### Timing Is Right
- [ ] Tech is ready (APIs, infrastructure exist)
- [ ] Market is growing (not shrinking)
- [ ] No major blockers (regulatory, platform risk)

### ICP Defined
- [ ] Specific demographics (not "everyone")
- [ ] Know their current behavior and solutions
- [ ] Can actually reach them (accessible channels)
- [ ] They have high pain intensity

---

## Phase 3: Solution Validation

### Behavioral Proof (Pick One)

**Option A: Fake Door Test**
- [ ] Created landing page with CTA
- [ ] Got 10%+ email conversion rate
- [ ] Collected 100+ signups

**Option B: Pre-sales**
- [ ] Created landing page with price
- [ ] Got 20+ pre-orders with real payment
- [ ] Validated willingness to pay

**Option C: Concierge MVP**
- [ ] Manually delivered solution to 5-10 people
- [ ] They came back for more
- [ ] They referred others

### Commitment Ladder
- [ ] People gave email (level 1)
- [ ] People took follow-up calls (level 2)
- [ ] People pre-paid or referred friends (level 4-5)

---

## Decision Point

### Ready to Build?

| Signal | Status |
|--------|--------|
| Found real problem with evidence | Yes / No |
| Market has money | Yes / No |
| Gap validated (not assumed) | Yes / No |
| Behavioral proof (signups/pre-orders) | Yes / No |

**If all "Yes"** → Proceed to [PREFLIGHT.md](./PREFLIGHT.md) for technical setup

**If any "No"** → Go back and validate. Don't build yet.

---

## MVP Definition (Before Coding)

Complete this before writing any code:

**Core Hypothesis:**
> If we let users [action], they will [behavior] because [reason].

**MVP Must Include:**
1. ___
2. ___
3. ___

**MVP Must NOT Include (Yet):**
- ___
- ___
- ___

**Success Metrics:**
| Metric | Target | Timeframe |
|--------|--------|-----------|
| Signups | ___ | Week 1 |
| Day 7 retention | 25%+ | Month 1 |
| Sean Ellis score | 40%+ | Month 2-3 |

**Pivot Trigger:**
> If [metric] is below [threshold] after [timeframe], we will [action].

---

## Quick Reference: Key Benchmarks

| Metric | Good | Great |
|--------|------|-------|
| Landing page → email | 10% | 15%+ |
| Day 1 retention | 40% | 60%+ |
| Day 7 retention | 20% | 35%+ |
| Sean Ellis "very disappointed" | 40% | 50%+ |

---

## Next Steps

1. Complete all checkboxes above
2. Fill in MVP definition
3. Then proceed to **[PREFLIGHT.md](./PREFLIGHT.md)** for technical setup
