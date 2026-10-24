# Karpathy Principles for Development

Adopted from `multica-ai/andrej-karpathy-skills`:

1. **Think Before Coding**:
   - Understand the existing code, types, and constraints before writing new code.
   - Clarify edge cases and do not make unwarranted assumptions.
   - Read relevant files completely rather than guessing their structure.

2. **Simplicity First**:
   - Write clear, idiomatic, minimal code.
   - Avoid speculative layers, over-engineered abstractions, and premature optimizations.
   - If 30 lines can achieve the goal reliably, do not write 300 lines.

3. **Surgical Changes**:
   - Touch only the files, functions, and lines relevant to the current task.
   - Never remove or rewrite working code, comments, or documentation outside the scope of changes.
   - Avoid unsolicited mass reformatting or refactoring of unrelated modules.

4. **Goal-Driven Execution**:
   - Verify every implementation with automated tests.
   - Ensure the code builds and passes linting before declaring completion.
   - Provide concrete proof of correctness in walkthroughs.
