# Design Brief

Visual direction: inspired by an award-winning previous hackathon project called "Beacon Night Shift". We borrow the design system, not the content.

- Palette (define as CSS variables): cream background ~#FFFDE7, deep forest green ~#04504A for dark sections, warm beige card ~#E3E1D0, lavender CTA ~#E9D5FF with 2px near-black border and a hard offset shadow, coral/ember status dot ~#F0583A, ink ~#1B1B1B.
- Typography: large serif display (EB Garamond or Cormorant Garamond) with key words in *italic*; clean sans for body (Inter or DM Sans); mono (JetBrains Mono or DM Mono) for live status, numbers and labels.
- Layout and components:
  - Thin dark-green top banner strip ("Built on AWS Strands Agents + Amazon Bedrock - live on AWS - v0.x - judge access in the submission")
  - Floating rounded nav pill with tabs (Home, Risk Board, Analytics, Plans, Crews, Audit, Report, Safety) plus a mono live-status line (live dot - region - version - clock)
  - Hero with serif headline and primary CTA + secondary "Watch the film" + "Code on GitHub"
  - Product mock preview card under the hero
  - Dark-green live-stats band (workers advised, cities covered, median lead time before a dangerous window, dangerous-exposure hours avoided)
  - "Built on" AWS service ticker
  - Side-by-side comparison ("A weather app says: hot day" vs "Chhaya says: ride 6-10 AM, rest 12-4 PM, mask at Anand Vihar")
  - Rounded beige feature cards titled "Built around how outdoor work works" (Numbers before the model, One plan per job type, In Hindi, Tamil and English, Works without Bedrock, Runs on your laptop too)
  - Two-panel FAQ (Is it safe? What can it change? What if Bedrock is down? Which parts are the model and which are code? Can I run it without an AWS account? What did it cost?)
  - Big wordmark footer with keyboard-shortcut hints; floating "?" help button; subtle cursor glow.
- Interaction principles: every claim on screen links to an evidence card; reads are public, writes need a passcode; keyboard shortcuts (g+b board, g+a analytics, etc).
