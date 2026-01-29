# Domain-focused AI model feasibility notes

## Feasibility summary

It is feasible to build a domain-focused AI model by sourcing a reasonably coherent,
externally available dataset for that domain, but success depends on data quality,
coverage, and licensing. Smaller, well-scoped domains lower the data and compute
requirements compared to general-purpose models.

## Key requirements

- **Data quality and consistency**: A clean, well-labeled dataset aligned to the
  target domain yields better results than a large but noisy corpus.
- **Licensing/usage rights**: External datasets must allow training and the intended
  use (personal vs. commercial).
- **Model size fit**: A smaller model or a fine-tuned base model often performs
  better for a narrow domain than training a large model from scratch.
- **Evaluation loop**: Domain-specific tests are required to verify accuracy and
  safety for real usage.

## Practical approach

1. Start with a base model and perform supervised fine-tuning (SFT) or LoRA on the
   domain dataset.
2. Add retrieval (RAG) if the domain has large or frequently changing facts.
3. Validate on a held-out test set and real user prompts to reduce hallucinations.

