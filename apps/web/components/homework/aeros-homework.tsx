'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import '@/styles/homework.css'

const HOMEWORK_ID = 'aeros-website'
const SAVE_DEBOUNCE_MS = 1500

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

// ---------------------------------------------------------------------------
// Auto-growing textarea
// ---------------------------------------------------------------------------

function AutoTextarea({
  id,
  value,
  placeholder,
  onChange,
}: {
  id: string
  value: string
  placeholder?: string
  onChange: (id: string, value: string) => void
}) {
  const ref = useRef<HTMLTextAreaElement>(null)

  const resize = useCallback(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.max(el.scrollHeight, 80)}px`
  }, [])

  useEffect(() => {
    resize()
  }, [value, resize])

  return (
    <textarea
      ref={ref}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(id, e.target.value)}
      rows={3}
      className="hw-textarea"
    />
  )
}

// ---------------------------------------------------------------------------
// Save indicator
// ---------------------------------------------------------------------------

function SaveIndicator({ status }: { status: SaveStatus }) {
  if (status === 'idle') return null

  const label = {
    saving: 'Saving…',
    saved: 'Saved',
    error: 'Save failed',
  }[status]

  const color = {
    saving: '#64748b',
    saved: '#16a34a',
    error: '#dc2626',
  }[status]

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        background: '#fff',
        border: `1.5px solid ${color}`,
        color,
        fontSize: 13,
        fontWeight: 600,
        padding: '8px 16px',
        borderRadius: 8,
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        zIndex: 50,
        transition: 'opacity 0.2s',
      }}
    >
      {label}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Prompt card
// ---------------------------------------------------------------------------

function PromptCard({
  promptKey,
  question,
  hint,
  defaultText,
  value,
  onChange,
}: {
  promptKey: string
  question: string
  hint?: string
  defaultText?: string
  value: string
  onChange: (id: string, val: string) => void
}) {
  return (
    <div className="hw-prompt">
      <div className="hw-prompt-question">{question}</div>
      {hint && (
        <div
          className="hw-prompt-hint"
          dangerouslySetInnerHTML={{ __html: hint }}
        />
      )}
      <AutoTextarea
        id={promptKey}
        value={value}
        placeholder={defaultText ?? 'Write your answer here…'}
        onChange={onChange}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Section data types
// ---------------------------------------------------------------------------

interface PromptData {
  key: string
  question: string
  hint?: string
  defaultText?: string
}

interface SectionData {
  number: number
  title: string
  priority: 'high' | 'medium' | 'low'
  screenshotTitle: string
  screenshotCrop: string
  contextTitle?: string
  context: string
  assessment?: string
  homeworkTitle?: string
  tip?: string
  prompts: PromptData[]
}

// ---------------------------------------------------------------------------
// Section component
// ---------------------------------------------------------------------------

function Section({
  section,
  responses,
  onChange,
}: {
  section: SectionData
  responses: Record<string, string>
  onChange: (id: string, val: string) => void
}) {
  const priorityClass =
    section.priority === 'high'
      ? 'hw-priority-high'
      : section.priority === 'medium'
        ? 'hw-priority-medium'
        : 'hw-priority-low'

  const priorityLabel =
    section.priority === 'high'
      ? 'High Priority'
      : section.priority === 'medium'
        ? 'Medium'
        : 'Lower'

  return (
    <div className="hw-assignment">
      <div className="hw-assignment-header">
        <div className="hw-section-number">{section.number}</div>
        <h3>
          {section.title}{' '}
          <span className={`hw-priority ${priorityClass}`}>
            {priorityLabel}
          </span>
        </h3>
      </div>

      <div className="hw-screenshot-area">
        <div className="hw-screenshot-label">
          <svg viewBox="0 0 24 24" width={14} height={14}>
            <rect x="3" y="3" width="18" height="18" rx="2" fill="none" stroke="currentColor" strokeWidth={2} />
            <circle cx="8.5" cy="8.5" r="1.5" fill="none" stroke="currentColor" strokeWidth={2} />
            <path d="m21 15-5-5L5 21" fill="none" stroke="currentColor" strokeWidth={2} />
          </svg>
          CURRENT WEBSITE — INSERT SCREENSHOT
        </div>
        <div className="hw-screenshot-placeholder">
          <strong>{section.screenshotTitle}</strong>
          <div className="hw-crop-note">{section.screenshotCrop}</div>
        </div>
      </div>

      <div className="hw-context-box">
        <div className="hw-context-label">
          {section.contextTitle ?? 'What This Section Does'}
        </div>
        <p>{section.context}</p>
      </div>

      {section.assessment && (
        <div className="hw-assessment-box">
          <div className="hw-assessment-label">Our Assessment</div>
          <p dangerouslySetInnerHTML={{ __html: section.assessment }} />
        </div>
      )}

      <div className="hw-homework">
        <div className="hw-homework-title">
          <svg viewBox="0 0 24 24" width={18} height={18}>
            <path d="M12 20h9" fill="none" stroke="currentColor" strokeWidth={2} />
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" fill="none" stroke="currentColor" strokeWidth={2} />
          </svg>
          {section.homeworkTitle ?? 'Your Homework'}
        </div>

        {section.tip && (
          <div className="hw-tip">
            <div className="hw-tip-label">Why This Matters</div>
            <p>{section.tip}</p>
          </div>
        )}

        {section.prompts.map((p) => (
          <PromptCard
            key={p.key}
            promptKey={p.key}
            question={p.question}
            hint={p.hint}
            defaultText={p.defaultText}
            value={responses[p.key] ?? ''}
            onChange={onChange}
          />
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page divider
// ---------------------------------------------------------------------------

function PageDivider({
  label,
  title,
}: {
  label: string
  title: string
}) {
  return (
    <div className="hw-page-divider">
      <span className="hw-page-label">{label}</span>
      <h2>{title}</h2>
    </div>
  )
}

// ---------------------------------------------------------------------------
// All section data
// ---------------------------------------------------------------------------

const SECTIONS: SectionData[] = [
  {
    number: 1,
    title: 'Hero Section',
    priority: 'high',
    screenshotTitle: 'Main Page Screenshot — Top Section',
    screenshotCrop:
      'Crop from the navigation bar through the "Are you leaving Sleep Apnea revenue on the table?" headline, the supporting text, the two buttons, and the hospital building image on the right.',
    context:
      'This is the first thing anyone sees. A hospital executive decides in 3–5 seconds whether to keep reading or leave. The job of this section is to make them think: "This is about me. This is a problem I haven\'t solved."',
    assessment:
      'The headline is strong — financially framed and direct. The supporting text efficiently names the three forces creating urgency (CPAP decline, GLP-1s, neuromodulation). The two buttons give people a path whether they\'re ready to act or want to learn more. The hospital building image is fine but generic — a real photo of you would be stronger.',
    prompts: [
      {
        key: '1-1',
        question: 'Does this headline feel right to you?',
        hint: 'Read it out loud: "Are you leaving Sleep Apnea revenue on the table?" Does that capture the core question you want a hospital CEO to ask themselves? If you\'d phrase it differently — the way you\'d actually say it to a CEO sitting across from you — write that down.',
      },
      {
        key: '1-2',
        question: 'Is the supporting text accurate?',
        hint: 'Specifically: Is "CPAP compliance is collapsing" a claim you\'re comfortable making on your website? Is "own the market for the next decade" the right timeframe? Mark anything that feels overstated or understated and tell us how you\'d adjust it.',
      },
      {
        key: '1-3',
        question: 'What image would you want here?',
        hint: 'Options: (a) a professional photo of you, (b) your team in a working session, (c) an abstract/architectural image like what\'s there now, (d) something else. If you have photos available, send them our way.',
      },
    ],
  },
  {
    number: 2,
    title: 'Mission Statement Banner',
    priority: 'medium',
    screenshotTitle: 'Main Page Screenshot — White Centered Text Section',
    screenshotCrop:
      'Crop the white section with: "At Aeros, we help hospitals unify fragmented sleep specialties — ENT, Pulmonology, Sleep Medicine, Bariatrics — into a single, coordinated service line." and the line below it about outcomes.',
    context:
      "After the hero grabs attention with a question, this section answers it clearly: here's who we are and what we do, in one sentence. This is your elevator pitch — the version someone repeats when they tell a colleague about you.",
    assessment:
      'This is well-written. The specialty callouts demonstrate domain knowledge immediately. The supporting line hits three outcomes for three different executives: patient outcomes (CMO), referral networks (COO), profit center (CFO/CEO). Strong as-is.',
    prompts: [
      {
        key: '2-1',
        question: 'Are the right specialties listed?',
        hint: 'Currently names ENT, Pulmonology, Sleep Medicine, and Bariatrics. Should Dentistry be here? Primary Care? Others? List every specialty that Aeros brings into the integrated model.',
      },
      {
        key: '2-2',
        question: 'Are these the right three outcomes to promise?',
        hint: '"Better patient outcomes, stronger referral networks, and a high-margin profit center where a cost center used to be." If you could only promise a hospital CEO three things, are these the right three? Write down what you\'d promise.',
      },
    ],
  },
  {
    number: 3,
    title: '"Built on Clinical Experience" + Metrics',
    priority: 'high',
    screenshotTitle: 'Main Page Screenshot — Dark Navy Section with Image + Stats',
    screenshotCrop:
      'Crop the dark section with "Built on clinical experience, not theory," the hospital corridor image, and the three metrics below: 5,000+ / 3x / 30+',
    context:
      'This section answers: "Why should I trust you?" It uses a bold claim ("experience, not theory"), a credibility image, and three hard numbers. For a hospital CFO, those numbers are the most important content on the entire page.',
    assessment:
      'The headline is excellent. "Not theory" is a powerful differentiator against big-firm consultants. However, the three metrics are the make-or-break element here. <strong>These numbers must be real and defensible.</strong> A hospital CFO may ask you to back them up. If they\'re accurate, they\'re extremely compelling. If they\'re approximations, we need to adjust.',
    tip: "This is the most important homework item in this document. A hospital CFO lives in a world of numbers. Accurate, specific metrics are the single most powerful trust signal you can deploy. Vague or unverifiable numbers do the opposite — they raise red flags.",
    prompts: [
      {
        key: '3-1',
        question:
          '"5,000+ patient lives managed through integrated sleep programs." — Is this real?',
        hint: 'Where does this number come from? Your personal clinical career? A specific program you built? The combined team\'s experience? Be as specific as possible about the source.',
      },
      {
        key: '3-2',
        question:
          '"3x average revenue increase in restructured sleep service lines." — Can you back this up?',
        hint: 'Can you point to a specific instance? Example: "At [Hospital X], the sleep service line was generating $[Y] annually. After restructuring, it generated $[Z] within [timeframe]." If the 3x figure is directionally correct but you don\'t have exact data, tell us what you do have.',
      },
      {
        key: '3-3',
        question:
          '"30+ years of combined clinical and administrative experience." — What\'s the real number?',
        hint: "Add up the relevant years across your team. If it's actually 40+ or 50+, use the real number — bigger is better here. List each team member's relevant experience and we'll total it.",
      },
      {
        key: '3-4',
        question: 'Are there other numbers you could share?',
        hint: "Think about: number of hospitals you've worked with, procedures performed, referral networks built, patient satisfaction improvements — anything quantifiable. Write down every number, even rough ones. We'll pick the strongest three.",
      },
    ],
  },
  {
    number: 4,
    title: '"What We Do" — Methodology Grid',
    priority: 'medium',
    screenshotTitle: 'Main Page Screenshot — White Section with 6 Cards',
    screenshotCrop:
      'Crop the "What we do" heading through all six methodology cards: Service Line Assessment, Care Algorithm Design, Specialty Integration, Patient Education Platform, Administrative & Financial Structuring, Future-Proofing & Iteration.',
    context:
      'This is where a prospect learns how Aeros actually works. The six cards represent your methodology — the steps you take for a client, in a logical sequence. It turns the abstract promise ("we\'ll integrate your sleep program") into a concrete, repeatable process.',
    assessment:
      "This is well-structured and the descriptions are specific enough to feel substantive. The six steps cover the full scope. This section is in good shape — it just needs your expert eye to confirm accuracy and fill in any gaps.",
    prompts: [
      {
        key: '4-1',
        question:
          'Read each card description out loud. Is this actually what you do?',
        hint: "For each of the six cards, mark anything that's inaccurate, missing, or overstated. Cross out words that don't sound like you. Add anything that's missing.",
        defaultText: `Card 1 — Service Line Assessment:\n\nCard 2 — Care Algorithm Design:\n\nCard 3 — Specialty Integration:\n\nCard 4 — Patient Education Platform:\n\nCard 5 — Administrative & Financial Structuring:\n\nCard 6 — Future-Proofing & Iteration:`,
      },
      {
        key: '4-2',
        question: 'What does a "care algorithm" actually look like?',
        hint: "Not for the website — for us to understand. Is it a decision tree? A referral flowchart? A set of protocols? The more concretely you describe it, the better we can explain it to your audience.",
      },
      {
        key: '4-3',
        question: 'What does "breaking down silos" look like in practice?',
        hint: "Is it joint meetings? Shared EMR workflows? A committee structure? A single coordinator role? Give us a real-world example.",
      },
      {
        key: '4-4',
        question: 'Is "coding optimization" a major part of what you do?',
        hint: "Hospital CFOs will zero in on this because it directly impacts revenue. If you have specific expertise in sleep-related coding and billing, tell us — we should emphasize it more.",
      },
      {
        key: '4-5',
        question: 'Is the order right?',
        hint: "The cards tell a story: assess → design → integrate → educate → structure → evolve. Does that match the actual sequence of an Aeros engagement? If you'd reorder, tell us.",
      },
    ],
  },
  {
    number: 5,
    title: '"Why Aeros" — Differentiation',
    priority: 'high',
    screenshotTitle: 'Main Page Screenshot — Dark Section with Two Panels',
    screenshotCrop:
      'Crop the "Why Aeros" headline, the "Our Difference" left panel with four points, the teal-highlighted right panel with four points, and the Aeros logo in the center.',
    context:
      'This answers the question every buyer asks: "What makes you different from a general consultant, or from just hiring another sleep medicine physician?" The eight bullet points across two panels are the ammunition for that argument.',
    prompts: [
      {
        key: '5-1',
        question:
          '"Clinicians who have personally built and run sleep programs." — Expand on this.',
        hint: "This is your single most powerful differentiator. Which programs? At which institutions? What was the scale? We need the full story behind this claim so we can present it with maximum credibility.",
      },
      {
        key: '5-2',
        question:
          '"Measurable 12-month ROI." — Is 12 months the right number?',
        hint: 'If a hospital CEO asks "When will I see results?" — what\'s your honest answer? First signs in 3 months? Revenue movement in 6? Full ROI in 12? Give us the real timeline.',
      },
      {
        key: '5-3',
        question:
          'The 60-second pitch: Why hire Aeros instead of McKinsey, Huron, or a local sleep medicine consultant?',
        hint: "Don't think about the website. Just tell us what you'd actually say. A voice memo is perfect for this one.",
      },
    ],
  },
  {
    number: 6,
    title: 'Common Questions from Hospital Leaders',
    priority: 'medium',
    screenshotTitle: 'Main Page Screenshot — FAQ Accordion Section',
    screenshotCrop:
      'Crop the "Common questions from hospital leaders" heading and the four expandable question rows below it.',
    context:
      'FAQs preemptively answer objections that might stop someone from reaching out. The four questions here map to the four most common pushbacks: "Why now?", "We\'re already doing this," "How long?", and "What am I buying?"',
    assessment:
      'The questions are the right ones. Now we need your answers — written like you\'re actually talking to a CEO who just asked you directly.',
    homeworkTitle: 'Your Homework — Write the answer to each question',
    prompts: [
      {
        key: '6-1',
        question:
          '"What makes sleep apnea a strategic priority right now?"',
        hint: 'e3–5 sentences. Hit the key forces: CPAP decline, GLP-1/neuromodulation emergence, competitive window, financial opportunity. Use a specific data point if you have one.',
      },
      {
        key: '6-2',
        question:
          '"We already have a sleep lab. Why do we need Aeros?"',
        hint: 'This is the most important objection to handle well. Acknowledge the sleep lab. Then explain why a lab alone captures only a fraction of the opportunity. What\'s the difference between "having a sleep lab" and "having an integrated sleep service line"?',
      },
      {
        key: '6-3',
        question: '"How long does implementation typically take?"',
        hint: 'Give a real answer. Hospital executives like ranges: "Most engagements show measurable results within [X] months, with full service line maturity in [Y–Z] months."',
      },
      {
        key: '6-4',
        question: '"What does the engagement model look like?"',
        hint: 'Walk through what the first 30, 60, and 90 days look like. What do you deliver? How often are you on-site vs. remote? Is there a fixed fee, a retainer, or a performance component?',
      },
      {
        key: '6-5',
        question: 'Are there other questions you hear frequently?',
        hint: 'Think about your last 5 conversations with hospital executives or physician leaders. What did they ask? Add those questions and your answers.',
      },
    ],
  },
  {
    number: 7,
    title: 'Final Call to Action + Footer',
    priority: 'low',
    screenshotTitle: 'Main Page Screenshot — Bottom CTA Card + Footer',
    screenshotCrop:
      'Crop from the "Ready to turn sleep apnea into your next high-performing service line?" card through the footer with newsletter signup and links.',
    context:
      'The CTA card is the final conversion push for someone who scrolled the entire page. The footer provides navigation, a newsletter signup, and establishes professional completeness.',
    prompts: [
      {
        key: '7-1',
        question:
          '"Market Opportunity Audit" or "Market Opportunity Assessment"?',
        hint: '"Audit" implies thoroughness. "Assessment" is slightly softer. Pick one — we\'ll use it everywhere for consistency.',
      },
      {
        key: '7-2',
        question: 'What happens when someone clicks "Get Started"?',
        hint: 'Do they fill out a form? Schedule a call? Get an email? Walk us through the process so we can set the right expectation on the site.',
      },
      {
        key: '7-3',
        question: 'Rewrite the newsletter description in one sentence.',
        hint: 'Currently says: "Subscribe to our newsletter for marketing insights, trends, & growth strategies to scale your business." That sounds like a marketing agency, not a healthcare firm. What would a hospital executive actually want to receive from you by email?',
      },
      {
        key: '7-4',
        question: 'Do you plan to send a regular email?',
        hint: "If yes, how often? If no, we should remove the signup for now. A signup with no follow-through is worse than no signup.",
      },
    ],
  },
  // About page sections
  {
    number: 8,
    title: 'About Page Hero',
    priority: 'medium',
    screenshotTitle: 'About Page Screenshot — Top Section',
    screenshotCrop:
      'Crop from the navigation through the "Precision methodology, measurable outcomes." headline, the supporting text, and the wide conference-room team photo.',
    context:
      'Anyone who clicks "About" is trying to answer one question: "Who are these people, and should I trust them?" This first section sets the tone. It should feel more personal and human than the homepage — this is where you tell your story.',
    assessment:
      'The headline ("Precision methodology, measurable outcomes") is a tagline, not a story. It works on the homepage but feels impersonal here. The About page hero should lead with the team or the founder\'s story. The stock conference photo should be replaced with a real team photo when available.',
    prompts: [
      {
        key: '8-1',
        question: 'Which approach do you prefer for this section?',
        hint: '<strong>Option A:</strong> Lead with a personal statement. "I spent [X] years building integrated sleep programs inside hospital systems. I started Aeros because..."<br><br><strong>Option B:</strong> Lead with team identity. "Clinicians, educators, and health system operators with decades of frontline experience."<br><br><strong>Option C:</strong> Keep the current tagline approach and save personal story for below.<br><br>Pick one or tell us another direction.',
      },
      {
        key: '8-2',
        question: 'Do you have a real team photo?',
        hint: "Even a candid one from a meeting, conference, or office setting would be stronger than the stock image. If not, this is worth scheduling.",
      },
    ],
  },
  {
    number: 9,
    title: '"Clinical Credibility Meets Operational Rigor"',
    priority: 'medium',
    screenshotTitle: 'About Page Screenshot — Text Left / Photo Right Section',
    screenshotCrop:
      'Crop the "Clinical credibility meets operational rigor" headline, the body paragraph, the three checkmark bullet points, and the photo of two people in conversation.',
    context:
      'This bridges clinical expertise ("we know the medicine") with operational capability ("we know how hospitals work"). That bridge is the core of Aeros\'s value — most advisors have one or the other, not both.',
    assessment:
      '"Not observing from the outside" is a subtle but effective shot at traditional consultants. The three checkmarks hit clinical, operational, and financial dimensions. This section is close to final — just needs more specificity.',
    prompts: [
      {
        key: '9-1',
        question: 'Make each claim more specific.',
        hint: '<strong>"Clinical experts with decades in surgical and medical sleep care"</strong> — How many years, exactly? Which procedures? Which institutions?<br><br><strong>"Proven across employed-physician and private-practice models"</strong> — How many systems? In how many states or regions?<br><br><strong>"Fluent in payor dynamics, coding optimization, and health system finance"</strong> — Can you give an example of a coding or financial insight that surprised a client?',
      },
    ],
  },
  {
    number: 10,
    title: '"A Framework Built for Hospital Operations"',
    priority: 'low',
    screenshotTitle: 'About Page Screenshot — Image Left / Text Right Section',
    screenshotCrop:
      'Crop the abstract image on the left and the "A framework built for the realities of hospital operations" text with the three methodology items listed below.',
    context:
      "A condensed version of the methodology, presented in the context of \"we understand how hospitals actually work.\" Reinforces that Aeros's approach isn't theoretical — it's designed around real operational constraints.",
    prompts: [
      {
        key: '10-1',
        question:
          'What do hospital leaders most often say about why integration is hard?',
        hint: `Things like: "Our ENT and pulmonology departments don't talk to each other" or "We tried to build a sleep program but nobody owned it." Write down what you hear most. We'll weave it into this section.`,
      },
      {
        key: '10-2',
        question:
          'Give us two contrasting examples of how your approach adapts.',
        hint: 'E.g., "A 200-bed community hospital with no sleep lab needs X. A 600-bed academic medical center with a fragmented program needs Y." This makes the adaptability claim concrete.',
      },
    ],
  },
  {
    number: 11,
    title: '"The Forces Reshaping Sleep Medicine"',
    priority: 'medium',
    screenshotTitle: 'About Page Screenshot — Four Stacked Cards',
    screenshotCrop:
      'Crop "The forces reshaping sleep medicine" heading and all four cards: CPAP Compliance Crisis, GLP-1 Disruption, Neuromodulation Growth, Regulatory Pipeline.',
    context:
      'Positions Aeros as experts who understand the forces driving change. Educates the reader on "why now" — and implicitly says, "If you don\'t understand all four of these forces, you need an advisor who does."',
    assessment:
      'Excellent content. These four forces are the backbone of the Aeros thesis, explained concisely and accurately. Just needs your fact-check and any additional nuance.',
    homeworkTitle: 'Your Homework — Fact-check each card',
    prompts: [
      {
        key: '11-1',
        question:
          'CPAP Compliance Crisis: Is "below 50%" the right adherence number?',
        hint: "Do you have a source for this? A specific study or published figure? We'll cite it if we have one.",
      },
      {
        key: '11-2',
        question:
          'GLP-1 Disruption: Is the semaglutide/tirzepatide characterization accurate?',
        hint: 'Any nuance to add? Other GLP-1 agents worth naming? Anything overstated?',
      },
      {
        key: '11-3',
        question:
          'Neuromodulation Growth: Is "Inspire and successors" the right framing?',
        hint: 'Are there specific competing devices or next-gen technologies you\'d want to name?',
      },
      {
        key: '11-4',
        question: 'Regulatory Pipeline: What\'s coming that excites you most?',
        hint: 'Name specific therapies or devices. Specificity builds credibility — "multiple platforms approaching FDA approval" is fine, but naming them is better.',
      },
      {
        key: '11-5',
        question: 'Is there a 5th force you\'d add?',
        hint: 'Consider: value-based care incentives, home sleep testing, AI diagnostics, employer screening programs, direct-to-consumer awareness.',
      },
    ],
  },
  {
    number: 12,
    title: '"Meet Our Leadership" — Team Bios',
    priority: 'high',
    screenshotTitle: 'About Page Screenshot — Dark Leadership Section',
    screenshotCrop:
      'Crop the "Meet our leadership" heading and the empty/placeholder area below it.',
    context:
      "For a consulting firm, the team is the product. Hospital executives aren't buying a methodology — they're buying confidence in the people who will be in their boardroom. This section makes those people real, credible, and trustworthy.",
    assessment:
      "<strong>This is the biggest gap on the entire website.</strong> An empty leadership section on a consulting firm's About page is a red flag for any sophisticated buyer. Filling this section is the single highest-priority task in this entire document.",
    homeworkTitle: 'Your Homework — This is the #1 priority',
    tip: 'A prospect will visit this page, scroll to the team section, and make a judgment call on whether to reach out. If it\'s empty or vague, the answer is almost always no. Fill this section first, above everything else in this document.',
    prompts: [
      {
        key: '12-1',
        question: 'Your bio — answer each of these:',
        hint: "We'll take your answers and craft a polished bio. Just give us the raw material.",
        defaultText: `Full name and credentials (e.g., MD, FACS):\n\nHow many years in ENT / sleep medicine:\n\nInstitutions where you've held positions (name them):\n\nSpecific roles held (Chief, Director, Medical Director, etc.):\n\nClinical specialty and volume (procedures, patient counts):\n\nHave you built or run an integrated sleep program? Where? What happened?:\n\nPublished research (list most relevant):\n\nConference speaking (which ones?):\n\nIn one sentence — why did you start Aeros?:`,
      },
      {
        key: '12-2',
        question: 'Additional team members or consultants',
        hint: 'For each person who will appear on the site:',
        defaultText: `Name, title, credential:\n\nArea of expertise (clinical, educational, administrative):\n\n2–3 sentences on their relevant background:\n\nTheir single most impressive credential in this space:`,
      },
      {
        key: '12-3',
        question: 'Do you have professional headshots?',
        hint: "For yourself and any team members. If not, schedule a photo session — it's $500–$1,500 for a half-day with a local commercial photographer. This is non-negotiable for a consulting website.",
      },
    ],
  },
]

// Page grouping info
const PAGE_BREAKS = [
  { beforeSection: 1, label: 'Main Page', title: 'Homepage + Our Approach' },
  { beforeSection: 8, label: 'About Page', title: 'About — Team & Credibility' },
  { beforeSection: 13, label: 'General', title: 'Applies to the Whole Site' },
]

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function AerosHomework() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [responses, setResponses] = useState<Record<string, string>>({})
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [loaded, setLoaded] = useState(false)

  const respondentIdRef = useRef<string>('')
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const responsesRef = useRef(responses)
  responsesRef.current = responses

  // Initialize respondent ID from URL or generate one
  useEffect(() => {
    let rid = searchParams.get('r')
    if (!rid) {
      rid = crypto.randomUUID()
      router.replace(`?r=${rid}`, { scroll: false })
    }
    respondentIdRef.current = rid
  }, [searchParams, router])

  // Load existing responses
  useEffect(() => {
    const rid = searchParams.get('r')
    if (!rid) return

    async function load() {
      try {
        const res = await fetch(
          `/api/homework?homework_id=${HOMEWORK_ID}&respondent_id=${rid}`
        )
        if (res.ok) {
          const data = await res.json()
          if (data.responses && Object.keys(data.responses).length > 0) {
            setResponses(data.responses)
          }
        }
      } catch {
        // Silently fail — user can still fill out the form
      } finally {
        setLoaded(true)
      }
    }

    load()
  }, [searchParams])

  // Save function
  const save = useCallback(async () => {
    const rid = respondentIdRef.current
    if (!rid) return

    setSaveStatus('saving')
    try {
      const res = await fetch('/api/homework', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          homework_id: HOMEWORK_ID,
          respondent_id: rid,
          responses: responsesRef.current,
        }),
      })

      if (res.ok) {
        setSaveStatus('saved')
        setTimeout(() => setSaveStatus('idle'), 2000)
      } else {
        setSaveStatus('error')
        setTimeout(() => setSaveStatus('idle'), 3000)
      }
    } catch {
      setSaveStatus('error')
      setTimeout(() => setSaveStatus('idle'), 3000)
    }
  }, [])

  // Handle change with debounced save
  const handleChange = useCallback(
    (key: string, value: string) => {
      setResponses((prev) => ({ ...prev, [key]: value }))

      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
      }
      saveTimerRef.current = setTimeout(save, SAVE_DEBOUNCE_MS)
    },
    [save]
  )

  if (!loaded) {
    return (
      <div className="hw-loading">
        <div className="hw-loading-spinner" />
        Loading your homework…
      </div>
    )
  }

  return (
    <div className="hw-root">
      {/* Cover */}
      <div className="hw-cover">
        <div className="hw-cover-logo">Aeros Consulting</div>
        <h1>Website Homework</h1>
        <div className="hw-cover-subtitle">
          Your section-by-section guide to refining the copy, content, and
          credibility of the Aeros website.
        </div>
        <div className="hw-cover-meta">March 2026 &nbsp;·&nbsp; Confidential</div>
      </div>

      {/* Instructions */}
      <div className="hw-instructions">
        <h2>How This Works</h2>
        <p>
          Below you&apos;ll find <strong>every section of the Aeros website</strong>{' '}
          — both the Main Page and the About Page — with a picture showing
          exactly which part of the site we&apos;re talking about.
        </p>
        <p>
          For each section, you&apos;ll see <strong>what it does</strong> for the
          reader, <strong>our assessment</strong> of what&apos;s working and what
          isn&apos;t, and then <strong>your homework</strong> — specific questions
          and prompts for you to answer.
        </p>
        <p>
          <strong>Don&apos;t try to write marketing copy.</strong> Just answer the
          questions the way you&apos;d explain things to a colleague. We&apos;ll take
          your raw answers and turn them into polished website text that sounds
          like you.
        </p>
        <p>
          <strong>Voice memos are great.</strong> If writing feels like a chore,
          open the voice recorder on your phone, read the question, and just talk
          through your answer. Send us the audio — it works extremely well.
        </p>
        <p>
          Each section is marked with a priority:{' '}
          <span style={{ color: '#dc2626', fontWeight: 700 }}>HIGH</span> means
          we&apos;re blocked without your input,{' '}
          <span style={{ color: '#d97706', fontWeight: 700 }}>MEDIUM</span> means
          it significantly improves the site, and{' '}
          <span style={{ color: '#16a34a', fontWeight: 700 }}>LOWER</span> means
          it can wait for a second pass.
        </p>
        <p className="hw-instructions-autosave">
          Your answers are <strong>saved automatically</strong> as you type. You
          can close this page and come back using the same link to continue where
          you left off.
        </p>
      </div>

      {/* Sections */}
      {SECTIONS.map((section) => {
        const pageBreak = PAGE_BREAKS.find(
          (pb) => pb.beforeSection === section.number
        )
        return (
          <div key={section.number}>
            {pageBreak && (
              <PageDivider label={pageBreak.label} title={pageBreak.title} />
            )}
            <Section
              section={section}
              responses={responses}
              onChange={handleChange}
            />
          </div>
        )
      })}

      {/* General sections (non-interactive) */}
      <PageDivider label="General" title="Applies to the Whole Site" />

      <div className="hw-general-section">
        <h3>Photography</h3>
        <p>
          Real photos of you and your team are the{' '}
          <strong>single highest-impact improvement</strong> you can make to this
          site. Stock images are fine for backgrounds, but anywhere a visitor is
          evaluating who you are — the hero, the credibility section, the
          leadership section — real photos build trust in a way nothing else can.
        </p>
        <p>
          <strong>Action:</strong> Schedule a half-day professional photo session.
          You need a headshot, 2–3 environmental shots (hospital hallway,
          boardroom, conference setting), and similar for any team members.
          Budget: $500–$1,500.
        </p>
      </div>

      <div className="hw-general-section">
        <h3>Your Voice</h3>
        <p>
          Throughout this document, we&apos;ve asked you to write things &quot;the way
          you&apos;d actually say it.&quot; That&apos;s intentional. The best copy for Aeros
          will sound like you — your authority, your directness, your
          understanding of how hospitals work.
        </p>
        <p>
          <strong>Don&apos;t try to write marketing language.</strong> Just talk.
          We&apos;ll do the polishing.
        </p>
        <p>
          <strong>Voice memos work great.</strong> Open the voice recorder on
          your phone, read the question, and just answer it. Send us the audio
          files. We&apos;ll transcribe and shape them into copy. This method
          produces more authentic material than written responses.
        </p>
      </div>

      <div className="hw-general-section">
        <h3>Deadlines</h3>
        <table className="hw-deadline-table">
          <thead>
            <tr>
              <th>Deadline</th>
              <th>Sections</th>
              <th>What&apos;s Needed</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <strong>Week 1</strong>
              </td>
              <td>
                <span className="hw-section-ref">Sections 1, 3, 5, 12</span>
              </td>
              <td>
                Hero headline, metrics verification, differentiation pitch,
                team bios — the four areas we&apos;re blocked on without your input
              </td>
            </tr>
            <tr>
              <td>
                <strong>Week 2</strong>
              </td>
              <td>
                <span className="hw-section-ref">
                  Sections 2, 4, 6, 8, 9, 10, 11
                </span>
              </td>
              <td>
                Everything else — methodology cards, FAQ answers, About page
                refinements, trend fact-checks, photo planning
              </td>
            </tr>
          </tbody>
        </table>
        <p style={{ marginTop: 16 }}>
          Send your responses in <strong>whatever format is easiest</strong> —
          a marked-up printout, a Word doc, an email, voice memos, or a mix.
          There are no wrong answers.
        </p>
      </div>

      {/* Footer */}
      <div className="hw-footer">
        <p>
          Questions? Don&apos;t hesitate to reach out. There are no wrong answers
          here — just your expertise, which is exactly what we need to build
          this right.
        </p>
        <p style={{ marginTop: 12 }}>
          Aeros Consulting · Confidential · March 2026
        </p>
      </div>

      <SaveIndicator status={saveStatus} />
    </div>
  )
}
