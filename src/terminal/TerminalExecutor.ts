import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';

export interface CommandExecution {
  id: string;
  command: string;
  args: string[];
  startTime: Date;
  endTime?: Date;
  exitCode?: number;
  stdout: string;
  stderr: string;
  duration?: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface ExecutionOptions {
  timeout?: number;
  workingDirectory?: string;
  environment?: Record<string, string>;
  requireConfirmation?: boolean;
  sandbox?: boolean;
}

export class TerminalExecutor extends EventEmitter {
  private activeExecutions: Map<string, ChildProcess> = new Map();
  private executionHistory: CommandExecution[] = [];
  
  constructor(private options: ExecutionOptions = {}) {
    super();
  }

  async executeCommand(
    command: string, 
    args: string[] = [], 
    options: ExecutionOptions = {}
  ): Promise<CommandExecution> {
    const executionId = this.generateExecutionId();
    const mergedOptions = { ...this.options, ...options };
    
    const execution: CommandExecution = {
      id: executionId,
      command,
      args,
      startTime: new Date(),
      stdout: '',
      stderr: '',
      riskLevel: this.assessRiskLevel(command, args)
    };

    // User confirmation for high-risk commands
    if (mergedOptions.requireConfirmation && execution.riskLevel === 'high') {
      const confirmed = await this.requestUserConfirmation(command, args);
      if (!confirmed) {
        throw new Error('Command execution cancelled by user');
      }
    }

    return new Promise((resolve, reject) => {
      const childProcess = spawn(command, args, {
        cwd: mergedOptions.workingDirectory || process.cwd(),
        env: { ...process.env, ...mergedOptions.environment },
        timeout: mergedOptions.timeout || 30000
      });

      this.activeExecutions.set(executionId, childProcess);

      childProcess.stdout?.on('data', (data) => {
        execution.stdout += data.toString();
        this.emit('stdout', executionId, data.toString());
      });

      childProcess.stderr?.on('data', (data) => {
        execution.stderr += data.toString();
        this.emit('stderr', executionId, data.toString());
      });

      childProcess.on('close', (code) => {
        execution.endTime = new Date();
        execution.exitCode = code;
        execution.duration = execution.endTime.getTime() - execution.startTime.getTime();
        
        this.activeExecutions.delete(executionId);
        this.executionHistory.push(execution);
        
        this.emit('completed', execution);
        
        if (code === 0) {
          resolve(execution);
        } else {
          reject(new Error(`Command failed with exit code ${code}: ${execution.stderr}`));
        }
      });

      childProcess.on('error', (error) => {
        this.activeExecutions.delete(executionId);
        this.emit('error', executionId, error);
        reject(error);
      });

      // Handle timeout
      setTimeout(() => {
        if (this.activeExecutions.has(executionId)) {
          childProcess.kill('SIGTERM');
          reject(new Error(`Command timeout after ${mergedOptions.timeout}ms`));
        }
      }, mergedOptions.timeout || 30000);
    });
  }

  private generateExecutionId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private assessRiskLevel(command: string, args: string[]): 'low' | 'medium' | 'high' | 'critical' {
    const riskPatterns = {
      critical: ['rm -rf', 'dd if=', 'mkfs', 'fdisk', 'format', 'shutdown', 'reboot'],
      high: ['sudo', 'su', 'chmod 777', 'chown', 'rm', 'mv', 'cp /etc/'],
      medium: ['git push', 'npm publish', 'docker run', 'kubectl apply'],
      low: ['ls', 'cat', 'echo', 'pwd', 'which', 'grep', 'find']
    };

    const fullCommand = `${command} ${args.join(' ')}`.toLowerCase();

    for (const [level, patterns] of Object.entries(riskPatterns)) {
      if (patterns.some(pattern => fullCommand.includes(pattern))) {
        return level as any;
      }
    }

    return 'low';
  }

  private async requestUserConfirmation(command: string, args: string[]): Promise<boolean> {
    // In a real implementation, this would show a UI prompt
    // For testing, we'll use a simple console prompt
    console.log(`⚠️  High-risk command detected: ${command} ${args.join(' ')}`);
    return new Promise((resolve) => {
      // Simulate user confirmation - in real implementation would be UI based
      setTimeout(() => resolve(true), 1000);
    });
  }

  getExecutionHistory(): CommandExecution[] {
    return [...this.executionHistory];
  }

  getActiveExecutions(): string[] {
    return Array.from(this.activeExecutions.keys());
  }

  terminateExecution(executionId: string): boolean {
    const childProcess = this.activeExecutions.get(executionId);
    if (childProcess) {
      childProcess.kill('SIGTERM');
      this.activeExecutions.delete(executionId);
      return true;
    }
    return false;
  }
}
