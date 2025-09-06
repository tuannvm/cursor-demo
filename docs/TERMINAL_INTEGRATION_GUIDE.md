# Terminal Command Integration - User Guide

## Overview

The Terminal Command Integration system provides secure, AI-assisted command execution with comprehensive risk assessment, user confirmation workflows, and robust security measures. This guide covers installation, configuration, and usage for development teams.

## Table of Contents

1. [Installation](#installation)
2. [Quick Start](#quick-start)
3. [Configuration](#configuration)
4. [Security Features](#security-features)
5. [User Confirmation Workflow](#user-confirmation-workflow)
6. [Command Categorization](#command-categorization)
7. [Performance Monitoring](#performance-monitoring)
8. [Best Practices](#best-practices)
9. [Troubleshooting](#troubleshooting)
10. [API Reference](#api-reference)

## Installation

### Prerequisites

- Node.js 16 or higher
- TypeScript 4.5 or higher
- Git (for development workflows)

### Install Dependencies

```bash
npm install
```

### Install Development Dependencies

```bash
npm install --save-dev
```

### Run Tests

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:unit
npm run test:integration
npm run test:security
npm run test:performance
npm run test:e2e
```

## Quick Start

### Basic Usage

```typescript
import { TerminalCommandIntegration, IntegrationConfig } from './src/TerminalCommandIntegration';

// Configure the integration
const config: IntegrationConfig = {
  requireConfirmation: true,
  enableSandbox: true,
  securityThreshold: 85,
  executionTimeout: 10000,
  maxConcurrentExecutions: 3
};

// Create integration instance
const terminal = new TerminalCommandIntegration(config);

// Execute a command
try {
  const execution = await terminal.executeCommand('git', ['status']);
  console.log('Command output:', execution.stdout);
  console.log('Security score:', execution.riskLevel);
} catch (error) {
  console.error('Command failed:', error.message);
}
```

### Event Handling

```typescript
// Listen to execution events
terminal.on('execution-started', ({ command, args }) => {
  console.log(`Starting: ${command} ${args.join(' ')}`);
});

terminal.on('security-validated', (result) => {
  console.log(`Security score: ${result.score}/100`);
});

terminal.on('execution-completed', ({ execution }) => {
  console.log(`Completed in ${execution.duration}ms`);
});
```

## Configuration

### Basic Configuration Options

```typescript
interface IntegrationConfig {
  requireConfirmation: boolean;    // Enable user confirmation for risky commands
  enableSandbox: boolean;          // Enable sandbox isolation
  securityThreshold: number;       // Minimum security score (0-100)
  executionTimeout: number;        // Command timeout in milliseconds
  maxConcurrentExecutions: number; // Maximum concurrent commands
}
```

### Advanced Configuration

```typescript
// Update configuration at runtime
terminal.updateConfig({
  securityThreshold: 90,
  executionTimeout: 15000
});

// Configure execution environment
const execution = await terminal.executeCommand('node', ['app.js'], {
  workingDirectory: '/path/to/project',
  environment: { NODE_ENV: 'production' },
  timeout: 30000
});
```

## Security Features

### Multi-Layer Security Validation

1. **Blacklist Checking**: Blocks explicitly dangerous commands
2. **Suspicious Pattern Detection**: Identifies potential security threats
3. **Privilege Escalation Prevention**: Blocks unauthorized privilege changes
4. **File System Protection**: Protects critical system directories
5. **Network Security**: Validates network destinations
6. **Command Injection Prevention**: Prevents injection attacks

### Security Score Calculation

Commands are assigned security scores based on:

- Command category and risk level
- Pattern matching results
- Security check outcomes
- Historical behavior analysis

### Example Security Validation

```typescript
// High-security command (score: 95+)
await terminal.executeCommand('ls', ['-la']);        // ✅ Auto-approved

// Medium-security command (score: 70-94)
await terminal.executeCommand('git', ['push']);      // ⚠️ May require confirmation

// Low-security command (score: <70)
await terminal.executeCommand('sudo', ['rm', '/']);  // ❌ Blocked
```

## User Confirmation Workflow

### Confirmation Triggers

User confirmation is requested when:

- Command risk level is 'high' or 'critical'
- Security score falls below configured threshold
- Command category requires confirmation
- Manual override is configured

### Confirmation Process

1. **Risk Assessment**: System analyzes command safety
2. **Information Display**: Shows command details, category, and risks
3. **Security Recommendations**: Provides actionable security advice
4. **User Decision**: User approves, denies, or requests details
5. **Execution**: Proceeds based on user choice

### Confirmation UI Example

```
🤖 Terminal Command Execution Request
=====================================
Command: sudo systemctl restart nginx
Category: system-admin
Risk Level: CRITICAL
Security Score: 45/100

⚠️ Security Recommendations:
  • Command requires elevated privileges - verify necessity
  • System service modification detected - check for impact

🔍 Security Checks:
  ❌ privilege-escalation: Privilege escalation detected
  ✅ filesystem-safety: File system operations appear safe
  ❌ blacklist-check: Command contains high-risk patterns

🎯 Do you want to execute this command?
Options: (y)es, (n)o, (d)etails, (s)kip future confirmations
```

## Command Categorization

### Category Types

| Category | Risk Level | Confirmation Required | Sandbox Safe | Examples |
|----------|------------|----------------------|--------------|-----------|
| file-system-read | Low | No | Yes | `ls`, `cat`, `grep`, `find` |
| file-system-write | Medium | Yes | Yes | `mkdir`, `cp`, `mv`, `touch` |
| system-admin | Critical | Yes | No | `sudo`, `chmod 777`, `systemctl` |
| network | Medium | Yes | Yes | `curl`, `wget`, `ssh`, `ping` |
| development | Low | No | Yes | `git`, `npm`, `node`, `python` |
| package-management | Medium | Yes | Yes | `npm install`, `pip`, `apt` |

### Custom Categorization

```typescript
// Command analysis
const categorizer = new CommandCategorizer();
const analysis = categorizer.analyzeCommand('docker', ['run', '-p', '3000:3000', 'node']);

console.log(analysis.category.name);        // 'development'
console.log(analysis.category.riskLevel);   // 'medium'
console.log(analysis.confidence);           // 0.85
console.log(analysis.recommendations);      // ['Review container security', ...]
```

## Performance Monitoring

### Execution Metrics

```typescript
const metrics = terminal.getMetrics();

console.log('Performance Metrics:');
console.log(`Total executions: ${metrics.totalExecutions}`);
console.log(`Success rate: ${(metrics.successfulExecutions/metrics.totalExecutions)*100}%`);
console.log(`Average execution time: ${metrics.averageExecutionTime}ms`);
console.log(`Security score: ${metrics.securityScore}/100`);
console.log(`User approval rate: ${metrics.userApprovalRate}%`);
```

### Performance Targets

- **Command Execution Latency**: <100ms average, <200ms P95
- **Command Categorization**: <10ms average
- **Security Validation**: <50ms average
- **System Throughput**: >100 operations/second
- **Memory Efficiency**: <50MB increase per 1000 operations

### Monitoring Dashboard

```typescript
// Real-time performance monitoring
terminal.on('execution-completed', ({ execution }) => {
  if (execution.duration > 1000) {
    console.warn(`Slow command detected: ${execution.command} (${execution.duration}ms)`);
  }
});

// Security monitoring
terminal.on('security-validated', (result) => {
  if (result.score < 70) {
    console.warn(`Low security score: ${result.score}`);
  }
});
```

## Best Practices

### Security Best Practices

1. **Set Appropriate Thresholds**: Use security threshold ≥85 for production
2. **Enable Confirmations**: Require confirmation for medium+ risk commands
3. **Use Sandboxing**: Enable sandbox for untrusted command sources
4. **Monitor Security Scores**: Track and investigate low security scores
5. **Regular Updates**: Keep security patterns and rules updated

### Performance Best Practices

1. **Batch Operations**: Use `executeCommandBatch()` for multiple commands
2. **Set Reasonable Timeouts**: Balance responsiveness with completion time
3. **Limit Concurrency**: Don't exceed system capabilities
4. **Monitor Memory**: Watch for memory leaks in long-running processes
5. **Cache Analysis**: Reuse analysis results when possible

### Development Workflow Integration

```typescript
// AI-assisted development workflow
async function aiDevelopmentWorkflow(commands: string[]) {
  const results = [];
  
  for (const commandString of commands) {
    const [command, ...args] = commandString.split(' ');
    
    try {
      const execution = await terminal.executeCommand(command, args);
      
      results.push({
        command: commandString,
        success: true,
        output: execution.stdout,
        securityLevel: execution.riskLevel
      });
    } catch (error) {
      results.push({
        command: commandString,
        success: false,
        error: error.message
      });
    }
  }
  
  return results;
}
```

## Troubleshooting

### Common Issues

#### Command Execution Failures

**Issue**: Commands fail with security errors
```
Error: Command security score (45) below threshold (85)
```

**Solution**:
1. Review command necessity
2. Lower security threshold if appropriate
3. Use confirmation workflow for manual override
4. Check for command injection patterns

#### Performance Issues

**Issue**: Slow command execution
```
Command taking >5 seconds to complete
```

**Solution**:
1. Check system resources
2. Increase execution timeout
3. Reduce concurrent execution limit
4. Profile command execution

#### Confirmation Workflow Problems

**Issue**: Confirmation prompts not appearing
```
Commands executing without expected confirmation
```

**Solution**:
1. Verify `requireConfirmation: true`
2. Check command risk level
3. Ensure category requires confirmation
4. Review security threshold settings

### Debug Mode

```typescript
// Enable verbose logging
const terminal = new TerminalCommandIntegration({
  ...config,
  debug: true
});

// Monitor all events
terminal.on('*', (event, data) => {
  console.log(`Event: ${event}`, data);
});
```

### Health Checks

```typescript
// System health verification
async function healthCheck() {
  try {
    // Test basic functionality
    await terminal.executeCommand('echo', ['health check']);
    
    // Verify security system
    const testAnalysis = categorizer.analyzeCommand('ls', ['-la']);
    const testValidation = validator.validateCommand('ls', ['-la'], testAnalysis);
    
    console.log('✅ System healthy');
    console.log(`Security validation working: ${testValidation.score > 0}`);
    
  } catch (error) {
    console.error('❌ System health check failed:', error);
  }
}
```

## API Reference

### TerminalCommandIntegration

#### Constructor
```typescript
new TerminalCommandIntegration(config: IntegrationConfig)
```

#### Methods

**executeCommand(command: string, args: string[], options?: ExecutionOptions): Promise<CommandExecution>**
- Executes a single command with full security validation

**executeCommandBatch(commands: Array<{command: string, args: string[]}>): Promise<CommandExecution[]>**
- Executes multiple commands efficiently

**updateConfig(newConfig: Partial<IntegrationConfig>): void**
- Updates configuration at runtime

**getMetrics(): ExecutionMetrics**
- Returns comprehensive execution metrics

**getExecutionHistory(): CommandExecution[]**
- Returns detailed execution history

**terminateExecution(executionId: string): boolean**
- Terminates active command execution

#### Events

- `execution-started`: Command execution begins
- `command-analyzed`: Command categorization complete
- `security-validated`: Security validation complete
- `execution-completed`: Command execution finished
- `execution-failed`: Command execution failed
- `config-updated`: Configuration changed

### CommandCategorizer

#### Methods

**analyzeCommand(command: string, args: string[]): CommandAnalysis**
- Analyzes and categorizes a command

**getCategories(): CommandCategory[]**
- Returns all available command categories

### SecurityValidator

#### Methods

**validateCommand(command: string, args: string[], analysis: CommandAnalysis): SecurityValidationResult**
- Performs comprehensive security validation

## Support and Contributing

### Getting Help

1. Check this documentation
2. Review test examples
3. Check GitHub issues
4. Run security and performance scans

### Contributing

1. Follow security best practices
2. Add comprehensive tests
3. Update documentation
4. Run all test suites before submitting

### Security Reporting

Report security vulnerabilities through appropriate channels, not public issues.
