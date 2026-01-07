# OpenFort Bounty Evaluation Framework

This document outlines the evaluation criteria used to assess bounty submissions across different bounty categories. All submissions must first meet the **stated bounty requirements** before being evaluated against these standards.

## Evaluation Philosophy

The OpenFort Bounty Program prioritizes **technical quality, educational value, and community impact** over superficial metrics. We're looking for work that helps builders learn, ship faster, and understand wallet infrastructure more deeply.

**Key Principles:**

- **Completeness First:** All stated bounty requirements must be fully met before evaluation begins
- **Quality Over Hype:** Technical correctness and practical usefulness matter more than polish alone
- **Builder Focus:** Content should help other developers build, not just consume
- **Honest Assessment:** We evaluate fairly and provide clear rationale for all decisions

## Bounty Categories

OpenFort bounties are organized into three primary tracks, each with its own evaluation criteria:

1. **Builder Track:** Code implementations, demos, sample apps, SDKs, and tools
2. **Video Track:** Video tutorials, explainers, walkthroughs, and technical demos
3. **Content Track:** Written guides, blog posts, technical articles, and documentation

## Builder Track Evaluation

**Builder Track** bounties focus on code implementation demos, sample applications, integrations, tools, or reusable patterns that showcase OpenFort infrastructure in action.

### Evaluation Criteria

#### 1. Technical Correctness (30%)

**What We Look For:**

- Correct usage of OpenFort APIs, SDKs, and authentication patterns
- Secure implementation (no hardcoded secrets, proper error handling, input validation)
- Clean, readable code that follows standard conventions
- Proper dependency management and package configurations
- Code that actually works as described

**Red Flags:**

- Hardcoded API keys or secrets committed to the repo
- Broken dependencies or missing configuration files
- Code that doesn't run or requires undocumented setup steps
- Security vulnerabilities (XSS, SQL injection, insecure auth flows)

#### 2. Clarity & Documentation (25%)

**What We Look For:**

- Clear README with setup instructions, prerequisites, and usage examples
- Easy to clone, install, and run locally
- Environment variable templates (`.env.example`)
- Code comments where logic isn't self-evident
- Troubleshooting tips or common gotchas documented

**Questions We Ask:**

- Can another developer clone this and get it running in under 10 minutes?
- Are the instructions clear and complete?
- Is the project structure easy to navigate?

#### 3. Usefulness (25%)

**What We Look For:**

- Solves a real problem or demonstrates a valuable pattern
- Code is reusable or adaptable for other projects
- Clear use case with practical applications
- Demonstrates best practices that others can learn from
- Good UX (if frontend is involved)

**Questions We Ask:**

- Would other builders find this helpful?
- Does this show something non-obvious or valuable?
- Can this be used as a starting point for similar projects?

#### 4. Polish & Developer Experience (10%)

**What We Look For:**

- Smooth onboarding and setup flows
- Helpful error messages and validation
- Consistent code style and project structure
- Basic testing or validation included
- Works across common development environments

**Nice to Have:**

- TypeScript types or JSDoc comments
- Linting/formatting configuration
- CI/CD setup or deployment guides
- Demo deployment or live preview

#### 5. Community Impact (10%)

**What We Look For:**

- GitHub stars, forks, or community engagement
- Quality of feedback from other developers
- Adoption or mentions in other projects
- Community contributions or issues opened

**Note:** This is evaluated post-submission based on organic traction. We don't expect overnight virality, but we do value work that resonates with the community.

## Video Track Evaluation

**Video Track** bounties focus on educational video content such as tutorials, walkthroughs, technical explainers, or demos that teach builders how to use OpenFort infrastructure.

### Evaluation Criteria

#### 1. Educational Value (30%)

**What We Look For:**

- Clear learning outcomes, what will viewers know after watching?
- Concrete, actionable takeaways (not just surface-level overviews)
- Structured progression from simple to complex concepts
- Real examples and hands-on demonstrations
- Concepts explained in a way that sticks

**Questions We Ask:**

- Does this teach something useful?
- Will a developer walk away knowing how to build something?
- Are the examples practical and relevant?

#### 2. Technical Accuracy (25%)

**What We Look For:**

- Correct usage of OpenFort APIs and SDKs
- Accurate explanations of concepts (no misinformation)
- Up-to-date code and configurations
- Proper terminology and clear definitions
- Acknowledgment of trade-offs or limitations

**Red Flags:**

- Deprecated APIs or outdated practices shown without context
- Misleading explanations or incorrect technical statements
- Skipped steps that would cause confusion
- Overgeneralized claims without nuance

#### 3. Clarity & Pacing (20%)

**What We Look For:**

- Good audio quality (clear voice, minimal background noise)
- Logical structure with clear sections or chapters
- Appropriate pacing, not too fast, not too slow
- Visual aids (slides, code highlighting, annotations) used effectively
- Easy to follow along without getting lost

**Questions We Ask:**

- Can viewers follow along without rewinding constantly?
- Is the audio clear and professional?
- Are visuals easy to read and understand?

#### 4. Implementation Depth (15%)

**What We Look For:**

- Code or configuration shown on-screen (not just talking)
- Step-by-step walkthroughs of actual implementation
- Explanation of why certain approaches are used
- Links to code repos or documentation in the description
- Practical examples that viewers can replicate

**Red Flags:**

- Pure theory with no code or practical examples
- Vague handwaving without showing actual implementation
- Missing context or setup steps

#### 5. Reach & Engagement (10%)

**What We Look For:**

- View count and watch time
- Quality of comments and discussion
- Shares, saves, or playlist additions
- Feedback from the developer community

**Note:** This is evaluated post-submission based on organic performance. We're looking for content that resonates, not just raw view counts.

## Content Track Evaluation

**Content Track** bounties focus on written content such as technical blog posts, guides, articles, tutorials, or documentation that help builders understand and use OpenFort infrastructure.

### Evaluation Criteria

#### 1. Depth & Correctness (35%)

**What We Look For:**

- Technically accurate and well-researched
- Goes beyond surface-level descriptions
- Explains the "why" behind the "how"
- Includes code snippets, configs, or examples
- No hand-waving or vague statements

**Red Flags:**

- Generic content copied from docs without added value
- Incorrect explanations or outdated information
- Lacks substance or depth

#### 2. Clarity for Builders (30%)

**What We Look For:**

- Easy to skim (headings, bullet points, code blocks)
- Logical structure and flow
- Clear writing with minimal jargon (or jargon explained)
- Examples are easy to understand and actionable
- Well-formatted with syntax highlighting and visual aids

**Questions We Ask:**

- Can a developer read this and immediately apply it?
- Is the article scannable and well-organized?
- Are code examples clear and correct?

#### 3. Originality (20%)

**What We Look For:**

- Based on your own experience building with OpenFort
- Unique insights, lessons learned, or gotchas
- Not just a regurgitation of existing docs
- Personal context or real-world use cases
- Fresh perspective or novel approach

**Red Flags:**

- Content that's just rephrased documentation
- Generic "how to" posts with no original thought
- Copy-pasted examples without context

#### 4. Reach & Traction (15%)

**What We Look For:**

- Engagement on social platforms (likes, reposts, shares)
- Comments, questions, or feedback from readers
- Backlinks or mentions from other developers
- Added to bookmarks, reading lists, or shared in communities

**Note:** This is evaluated post-submission based on organic traction. We value content that resonates and gets shared within the builder community.


## General Evaluation Standards

### Minimum Acceptance Bar

To be eligible for acceptance and payment, all submissions must:

1. **Meet all stated bounty requirements:** Partial or incomplete work is not eligible
2. **Be original work:** No plagiarism, copied content, or repackaged documentation
3. **Be technically accurate:** No misinformation or misleading explanations
4. **Align with bounty intent:** The submission must address the bounty's core objective
5. **Follow community guidelines:** No hype, scams, speculation, or non-technical content

### Disqualification Criteria

Submissions will be **automatically disqualified** if they:

- Contain hardcoded secrets or security vulnerabilities
- Include plagiarized or heavily copied content without attribution
- Promote scams, token pumps, or speculative financial content
- Are incomplete or do not meet the bounty requirements
- Use manipulated metrics (fake stars, paid views, bot engagement)

### Scoring & Acceptance

Each submission is scored overall based on the criteria above. **Acceptance is at the sole discretion of the OpenFort team**, and not all submissions will be accepted even if they meet the minimum bar.

**Important Notes:**

- Higher complexity bounties **(Medium, Hard)** are held to a higher evaluation standard
- If multiple valid submissions are received for the same bounty, only one will be rewarded
- Rationale for decisions will be shared to maintain transparency

## Revision & Appeals

### Feedback Loop

If a submission is close but not quite ready, the OpenFort team may provide feedback and allow for revisions within a reasonable timeframe. However, this is not guaranteed.

### No Formal Appeals Process

All decisions are final. However, if you believe there was a factual error in the evaluation (e.g., a feature was missed), you may request a re-review by commenting on the bounty issue or PR.


## Examples of Strong Submissions

### Builder Track Example

**Bounty:** Build a Next.js demo using OpenFort embedded wallets

**Strong Submission:**
- Clean Next.js app with proper project structure
- OpenFort SDK integrated correctly with secure authentication flow
- Working demo deployed on Vercel with public URL
- Clear README with setup steps and `.env.example`
- Code is readable, well-organized, and follows React best practices
- Includes basic error handling and loading states

### Video Track Example

**Bounty:** Create a tutorial on integrating OpenFort into a Unity game

**Strong Submission:**
- 8-12 minute video with clear audio and good pacing
- Step-by-step walkthrough showing actual Unity setup
- Explains why OpenFort is useful for game developers
- Code repo linked in description
- Demonstrates wallet creation and transaction signing
- Includes troubleshooting tips in the video or description

### Content Track Example

**Bounty:** Write a guide on using OpenFort with AI agents

**Strong Submission:**
- 1,500–2,000 word technical article
- Explains the problem: why AI agents need wallets
- Step-by-step guide with code snippets and configs
- Based on real implementation experience
- Includes gotchas and lessons learned
- Published on a public blog or dev.to with social sharing

## Conclusion

This evaluation framework is designed to ensure fairness, transparency, and consistency across all bounty submissions. Our goal is to reward high-quality work that benefits the OpenFort community and helps builders ship better products.

If you have questions about how your submission will be evaluated, feel free to ask in the bounty issue thread before starting work.

**Good luck building!**
