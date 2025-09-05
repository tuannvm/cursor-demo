# TRD-to-GitHub-Issues Automation with Cursor CLI

This repository demonstrates how to use **Cursor CLI** in GitHub Actions to automate the conversion of Technical Requirements Documents (TRDs) into actionable GitHub issues and generate implementation code automatically.

## Overview

The system provides two main automation flows:

1. **TRD → Issues**: Cursor CLI analyzes TRD documents and creates structured GitHub issues
2. **Issue → PR**: Cursor CLI reads issue requirements and generates working code implementation

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

- **Cursor CLI Intelligence**: Uses `cursor-agent --model sonnet-4` for advanced document analysis and code generation
- **Smart TRD Detection**: Only processes `.md` and `.txt` files that changed in the PR
- **Comprehensive Analysis**: Cursor CLI creates issues for ALL requirements, not just samples
- **Full Shell Access**: Cursor CLI runs with `-f` flag for unrestricted command execution
- **AI-Powered Implementation**: Cursor CLI generates actual working code based on issue requirements
- **Proper Linking**: Issues and PRs are automatically linked with closing references

## Usage

1. **Create TRD**: Add/modify technical requirements documents in your PR
2. **Trigger Cursor Analysis**: Comment `/create-issues` on the PR
3. **Review AI-Generated Issues**: Cursor CLI creates detailed issues for each requirement
4. **Start AI Implementation**: Add `ready-to-implement` label to desired issues
5. **Get AI-Generated Code**: Cursor CLI automatically creates implementation PR with working code

## Cursor CLI Integration

The automation leverages Cursor CLI's powerful AI capabilities:

- **Document Analysis**: `cursor-agent` reads and understands TRD content contextually
- **Issue Generation**: Creates comprehensive GitHub issues with proper formatting
- **Code Implementation**: Generates actual working code files based on requirements
- **Full Autonomy**: Runs with `-f` flag allowing complete shell command access
- **Model Selection**: Uses `--model sonnet-4` for advanced reasoning capabilities

## Requirements

- `CURSOR_API_KEY` secret configured in repository
- GitHub token permissions: `contents: write`, `pull-requests: write`, `issues: write`