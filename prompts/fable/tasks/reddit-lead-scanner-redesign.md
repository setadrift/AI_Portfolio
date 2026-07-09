# Task: Reddit Lead Scanner Redesign

Review the evidence packet and redesign the broken Reddit lead scanner for Duncan's AI consulting business.

Important framing:
- Do not assume the current scanner architecture, scoring fields, queues, queries, digest shape, or admin workflow are worth preserving.
- Treat the current implementation as evidence of what failed, not as a design boundary.
- You may recommend replacing the current pipeline with a different Reddit-only product model if that is the best answer.
- You may also recommend killing parts of the current scanner entirely if they are structurally causing noise.
- Keep the solution practical for Codex to implement later, but do not overfit to the current functions, field names, or scoring abstractions.

Context:
- This task is Reddit-only. Do not solve this by adding job boards, n8n community, Upwork, marketplaces, or broad web search.
- The latest Reddit output is low quality. It promoted fiction, SEO/listicle content, generic thought leadership, product/builder posts, and a landlord complaint as "Reply Today" leads.
- Duncan wants leads who are likely real business operators or responsible team members with a problem where hiring an AI/workflow expert is plausible.
- The current scanner has recently been modified with buyer queues and business-buyer scoring, but the live output shows those gates are still weak. You should not treat those queues or scores as the correct abstraction unless you independently conclude they are.

Main decision question:

If you were designing the best Reddit-only lead-finding tool from first principles for Duncan, knowing the current tool is failing, what would you build and how should Codex migrate toward it?

Required output:

1. Verdict
- One paragraph on whether the current scanner should be tuned, partially rebuilt, redesigned around a different pipeline, or mostly replaced.

2. Root cause diagnosis
- Identify the highest-leverage reasons the latest Reddit results failed.
- Tie each reason to evidence from the packet.
- Focus especially on speaker identity, self-problem vs content-about-a-problem, seller/promoter detection, fiction/off-topic detection, and false explicit-hiring evidence.

3. Product definition
- Define the job-to-be-done for this tool in plain language.
- Define the user workflow Duncan should actually experience each time it runs.
- Define what should count as:
  - Contact Today
  - Comment Only
  - Watch / Market Intel
  - Reject
- Include the minimum evidence required for each queue.

4. Best-possible product architecture
- Propose the ideal Reddit-only system from first principles.
- Include how it should search, classify, learn from feedback, maintain state across days, and present results.
- Include hard reject stages, speaker classification, post-intent classification, business-problem classification, outreach suitability, and final queue assignment only if they belong in your ideal design.
- Make clear what should happen deterministically before any LLM call and what, if anything, should be delegated to an LLM.
- If a simpler non-LLM or mostly deterministic approach would be better, say so.

5. Decision model
- Design the decision model in operational terms. It does not need to be a 1-5 score if a score is the wrong abstraction.
- Say what evidence should be required, optional, ignored, or disqualifying.
- Include a rule that prevents keyword-density evidence from becoming buyer evidence.
- Explain how the model should handle ambiguous but potentially valuable posts without polluting the main queue.

6. Source and query strategy
- Recommend how Reddit search queries and subreddit sources should change.
- Include how to handle low-yield sources and sources that mostly produce content marketing or seller posts.
- Keep the system Reddit-only.

7. Output and admin UX
- Describe what the digest/admin board should show so Duncan can trust it quickly.
- Include what should happen when there are zero good leads.

8. Fixture and verification plan
- Provide at least 12 concrete fixture examples or fixture categories the implementation must pass.
- Include the latest false positives from the packet as required rejects.
- Include at least three positive examples that should remain Contact Today or Comment Only.

9. Migration plan
- Give a staged plan for Codex to move from the current tool to your ideal design.
- Start with the smallest change that would immediately prevent the latest class of false positives.
- Include later phases for deeper restructuring if needed.
- Do not write full code, but be specific enough that Codex can implement from it.

10. Missing evidence
- List only evidence that would materially improve the redesign.
- If the packet is enough to make the core redesign decision, say so.

Constraints:
- Do not propose automated outreach.
- Do not propose non-Reddit sources for this task.
- Do not optimize for volume.
- Do not keep weak leads in Reply Today to make the digest look useful.
- Do not trust "business", "company", "workflow", "AI", "spreadsheet", "CRM", or "dashboard" as buyer evidence unless tied to the poster's own problem or explicit request.
- Do not preserve a current abstraction merely because it exists in the packet.
