---
name: Auth privacy model
description: Role and contact-visibility decisions for the school portal
---

Student accounts should only receive their own student record and should not receive other students' phone numbers, emails, parent contacts, or addresses. Principal accounts can manage the full register and see private contact fields. Role detection currently relies on Clerk metadata or an approved school email domain. Teacher accounts should be granted a teacherId in Clerk metadata; attendance access is limited to the assigned homeroom sections.

**Why:** The school explicitly requires student contact and address privacy while keeping full office visibility for the principal.

**How to apply:** Keep the server-side role check authoritative; UI hiding alone is not sufficient. Any future student directory or export endpoint must reuse the same access rules.