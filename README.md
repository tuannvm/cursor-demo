# TRD-to-GitHub-Issues Automation Demo

This repository demonstrates an automated GitHub Actions workflow that converts Technical Requirements Documents (TRDs) into actionable GitHub issues and generates pull requests using Cursor CLI.

## Overview

The system provides two main automation flows:

1. **TRD → Issues**: Convert TRD documents from pull requests into GitHub issues
2. **Issue → PR**: Generate pull requests when issues are labeled for implementation

## Workflow Architecture

```mermaid
sequenceDiagram
    participant Dev as Developer
    participant PR as Pull Request
    participant GHA1 as trd-to-issue.yml
    participant Cursor1 as Cursor CLI
    participant Issues as GitHub Issues
    participant GHA2 as issue-to-pr.yml
    participant Cursor2 as Cursor CLI
    participant NewPR as Implementation PR

    Dev->>PR: Create PR with TRD files
    Dev->>PR: Comment '/create-issues'
    PR->>GHA1: Trigger workflow
    GHA1->>Cursor1: Analyze TRD files
    Cursor1->>Cursor1: Read modified .md/.txt files
    Cursor1->>Issues: Create issues via gh CLI
    Issues->>PR: Comment with issue links
    
    Note over Issues: Issues labeled 'trd-generated'
    
    Dev->>Issues: Add 'ready-to-implement' label
    Issues->>GHA2: Trigger workflow
    GHA2->>Cursor2: Read issue requirements
    Cursor2->>Cursor2: Generate code implementation
    Cursor2->>NewPR: Create PR via gh CLI
    NewPR->>Issues: Link with 'Closes #issue'
```

## Components

### Workflows

- **`.github/workflows/trd-to-issue.yml`**: Triggered by `/create-issues` comment on PRs containing TRD files
- **`.github/workflows/issue-to-pr.yml`**: Triggered when issues are labeled `ready-to-implement`

### Configuration

- **`.github/labels.yml`**: Predefined labels for workflow automation
- **`.github/ISSUE_TEMPLATE/`**: Templates for consistent issue formatting

### Key Features

- **Smart TRD Detection**: Only processes `.md` and `.txt` files that changed in the PR
- **Comprehensive Analysis**: Creates issues for ALL requirements, not just samples
- **Full Automation**: Cursor CLI has full shell command access with `-f` flag
- **Proper Linking**: Issues and PRs are automatically linked with closing references

## Usage

1. **Create TRD**: Add/modify technical requirements documents in your PR
2. **Trigger Analysis**: Comment `/create-issues` on the PR
3. **Review Issues**: GitHub Action creates issues for each requirement
4. **Start Implementation**: Add `ready-to-implement` label to desired issues
5. **Get PR**: GitHub Action automatically creates implementation PR

## Requirements

- `CURSOR_API_KEY` secret configured in repository
- GitHub token permissions: `contents: write`, `pull-requests: write`, `issues: write`