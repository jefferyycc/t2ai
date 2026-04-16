# t2ai Design Docs

This folder captures the current product and system design for `t2ai` before implementation.

Files:

- `product-overview.md`: product thesis, target user, core jobs, and scope boundaries
- `system-design.md`: top-level architecture, layer-by-layer design, Mermaid diagrams, data flow, stack choices, free/open resources, and source-backed pricing/licensing notes
- `ai-runtime-architecture.md`: provider-agnostic AI runtime design for Ollama, fixture mode, and later hosted frontier models

Current direction:

- `t2ai` is a portfolio-quality applied AI project
- primary wedge: a readiness-aware strength coach that tells the user what to do today
- AI is used for explanation, structured extraction, retrieval-backed reasoning, and feedback
- deterministic logic owns safety, scoring, and workout adaptation rules
- local development uses Ollama on a private Mac mini data plane, with explicit cloud provider opt-in
