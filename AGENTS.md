# Model Gallery project rules

- This is a personal archive of digital products the owner has used, preserving them as 3D models and memories. The library lists products, not every model file.
- Put accessories inside their owning product with `parentId`; retain existing asset URLs and accessory deep links. Use `active`, `retired`, or `unknown` for ownership status, displayed as 在役、已退役、状态待确认.
- Brand tags filter the device library together with ownership status and search. Accessories follow their owner's brand and are not counted separately.
- Record specifications for the exact owned variant with official source links and verification dates; do not list alternative colors, capacities, or assume bundled accessories match the owner's actual setup. Keep specifications collapsed by default and key ownership information visible. Ask for missing personal details; never invent purchase dates, capacity, status, or memories. Leave unknown fields explicitly pending.

- Make updates on a feature or fix branch; never commit or push updates directly to `main`.
- Complete local implementation and verification first. Create a pull request only when the user explicitly asks to submit a PR; an ordinary edit or update request is not permission to create one.
- After the user requests a PR, submit it to GitHub and request GitHub Codex Code Review. Wait for that review, address actionable findings, and obtain a new review if the fix changes the reviewed code.
- Merge into `main` only after Codex Code Review and the required build checks pass. Do not substitute a local self-review for the requested GitHub review or bypass unresolved review findings.
- After a successful merge, delete the merged feature branch remotely and locally, then return the local checkout to the updated `main`.
- Production deployments track `main`. Branch work may use local or preview deployments; do not publish unreviewed branch changes as production.
- Preserve original downloadable model files. Preview conversion and interface changes must not alter manufacturing geometry or model dimensions.
- Validate with `pnpm test` and `pnpm build`; for interface changes also check the affected desktop and mobile interactions.
