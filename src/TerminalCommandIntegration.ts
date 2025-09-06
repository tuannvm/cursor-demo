import { TerminalExecutor, CommandExecution, ExecutionOptions } from './terminal/TerminalExecutor';
import { CommandCategorizer, CommandAnalysis } from './command/CommandCategorizer';
import { SecurityValidator, SecurityValidationResult } from './security/SecurityValidator';
import { ConfirmationUI, ConfirmationResult } from './ui/ConfirmationUI';
import { EventEmitter } from 'events';

export interface IntegrationConfig {
  requireConfirmation: boolean;
  enableSandbox: boolean;
  securityThreshold: number; // 0-100
  executionTimeout: number;
  maxConcurrentExecutions: number;
}

export interface ExecutionMetrics {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageExecutionTime: number;
  securityScore: number;
  userApprovalRate: number;
}

export class TerminalCommandIntegration extends EventEmitter {
  private executor: TerminalExecutor;
  private categorizer: CommandCategorizer;
  private securityValidator: SecurityValidator;
  private confirmationUI: ConfirmationUI;
  private metrics: ExecutionMetrics;

  constructor(private config: IntegrationConfig) {
    super();
    
    this.executor = new TerminalExecutor({
      timeout: config.executionTimeout,
      requireConfirmation: config.requireConfirmation,
      sandbox: config.enableSandbox
    });

    this.categorizer = new CommandCategorizer();
    this.securityValidator = new SecurityValidator();
    this.confirmationUI = new ConfirmationUI();

    this.metrics = {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      averageExecutionTime: 0,
      securityScore: 0,
      userApprovalRate: 0
    };

    this.setupEventHandlers();
  }

  async executeCommand(
    command: string, 
    args: string[] = [], 
    options: ExecutionOptions = {}
  ): Promise<CommandExecution> {
    this.emit('execution-started', { command, args });

    try {
      // Step 1: Analyze command
      const analysis = this.categorizer.analyzeCommand(command, args);
      this.emit('command-analyzed', analysis);

      // Step 2: Security validation
      const securityResult = this.securityValidator.validateCommand(command, args, analysis);
      this.emit('security-validated', securityResult);

      // Step 3: Check security threshold
      if (securityResult.score < this.config.securityThreshold) {
        throw new Error(`Command security score (${securityResult.score}) below threshold (${this.config.securityThreshold})`);
      }

      // Step 4: User confirmation if required
      let confirmationResult: ConfirmationResult | null = null;
      if (this.config.requireConfirmation && analysis.category.requiresConfirmation) {
        confirmationResult = await this.confirmationUI.requestConfirmation(
          command, args, analysis, securityResult
        );
        
        if (!confirmationResult.confirmed) {
          throw new Error('Command execution denied by user');
        }
      }

      // Step 5: Execute command
      const execution = await this.executor.executeCommand(command, args, options);
      
      // Update metrics
      this.updateMetrics(execution, securityResult);
      
      this.emit('execution-completed', { execution, analysis, securityResult, confirmationResult });
      
      return execution;

    } catch (error) {
      this.metrics.totalExecutions++;
      this.metrics.failedExecutions++;
      this.emit('execution-failed', { command, args, error });
      throw error;
    }
  }

  async executeCommandBatch(commands: Array<{ command: string; args: string[] }>): Promise<CommandExecution[]> {
    if (commands.length > this.config.maxConcurrentExecutions) {
      throw new Error(`Batch size (${commands.length}) exceeds maximum concurrent executions (${this.config.maxConcurrentExecutions})`);
    }

    const results: CommandExecution[] = [];
    
    for (const { command, args } of commands) {
      try {
        const execution = await this.executeCommand(command, args);
        results.push(execution);
      } catch (error) {
        // Continue with other commands even if one fails
        this.emit('batch-command-failed', { command, args, error });
      }
    }

    return results;
  }

  getMetrics(): ExecutionMetrics {
    // Update user approval rate from confirmation UI
    const confirmationStats = this.confirmationUI.getConfirmationStats();
    this.metrics.userApprovalRate = confirmationStats.approvalRate;

    return { ...this.metrics };
  }

  getExecutionHistory(): CommandExecution[] {
    return this.executor.getExecutionHistory();
  }

  getActiveExecutions(): string[] {
    return this.executor.getActiveExecutions();
  }

  terminateExecution(executionId: string): boolean {
    return this.executor.terminateExecution(executionId);
  }

  updateConfig(newConfig: Partial<IntegrationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.emit('config-updated', this.config);
  }

  private setupEventHandlers(): void {
    this.executor.on('stdout', (executionId, data) => {
      this.emit('stdout', executionId, data);
    });

    this.executor.on('stderr', (executionId, data) => {
      this.emit('stderr', executionId, data);
    });

    this.executor.on('completed', (execution) => {
      this.emit('executor-completed', execution);
    });

    this.executor.on('error', (executionId, error) => {
      this.emit('executor-error', executionId, error);
    });
  }

  private updateMetrics(execution: CommandExecution, securityResult: SecurityValidationResult): void {
    this.metrics.totalExecutions++;
    
    if (execution.exitCode === 0) {
      this.metrics.successfulExecutions++;
    } else {
      this.metrics.failedExecutions++;
    }

    // Update average execution time
    const currentAvg = this.metrics.averageExecutionTime;
    const newTime = execution.duration || 0;
    this.metrics.averageExecutionTime = 
      (currentAvg * (this.metrics.totalExecutions - 1) + newTime) / this.metrics.totalExecutions;

    // Update security score (running average)
    const currentSecurityScore = this.metrics.securityScore;
    this.metrics.securityScore = 
      (currentSecurityScore * (this.metrics.totalExecutions - 1) + securityResult.score) / this.metrics.totalExecutions;
  }
}
