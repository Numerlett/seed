---
description: Documentation maintenance instructions - loaded whenever code changes are made
applyTo: '**/*'
---

## Documentation Requirements

Whenever any changes are made to the codebase, documentation **must** be added or modified to reflect the change or addition. This includes:

### Required Actions

1. **New files/modules**: Add a doc comment or header describing the file's purpose.
2. **New functions/methods/classes**: Add documentation comments (JSDoc, docstrings, etc.) explaining purpose, parameters, return values, and usage.
3. **Modified functions/methods/classes**: Update existing documentation to reflect the new behavior.
4. **API changes**: Update any relevant API documentation or README sections.
5. **Configuration changes**: Document new or changed configuration options.
6. **New dependencies**: Document why the dependency was added and its purpose.
7. **Bug fixes**: Add inline comments if the fix addresses a non-obvious edge case.

### Documentation Locations

- **Inline**: Use language-appropriate doc comments directly in the code.
- **README.md**: Update the project README if the change affects setup, usage, or architecture.
- **Changelog**: Note significant changes for tracking purposes.
- **Dedicated docs folder**: Update any files in `/docs` or similar directories if they exist and are relevant.

### Guidelines

- Keep documentation concise, accurate, and up to date.
- Use clear language; avoid jargon unless it is standard for the project.
- Never leave new or modified code undocumented.

# Documentation Guidelines

## Purpose

This instruction file defines the documentation maintenance policy for the **seed** project. It ensures that documentation remains accurate and up-to-date as the codebase evolves.

## Usage

These instructions are automatically applied by GitHub Copilot when working within this repository. They guide AI-assisted development to maintain documentation integrity.

## Rules

### Code Removal & Documentation Sync

Whenever code is removed or significantly refactored, all related documentation—including inline comments, README sections, API docs, and usage examples—must be updated or removed accordingly. This prevents stale or misleading documentation from persisting in the project.

## Scope

This policy applies to all files and directories within the repository and is enforced through GitHub Copilot's instruction mechanism located at `.github/instructions/`.

- When removing code, remove or update the corresponding documentation.
