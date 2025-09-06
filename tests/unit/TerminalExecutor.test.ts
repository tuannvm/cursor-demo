import { TerminalExecutor, CommandExecution } from '../../src/terminal/TerminalExecutor';

describe('TerminalExecutor', () => {
  let executor: TerminalExecutor;

  beforeEach(() => {
    executor = new TerminalExecutor({ timeout: 5000 });
  });

  afterEach(async () => {
    // Clean up any active executions
    const activeExecutions = executor.getActiveExecutions();
    activeExecutions.forEach(id => executor.terminateExecution(id));
  });

  describe('Command Execution', () => {
    test('should execute simple commands successfully', async () => {
      const execution = await executor.executeCommand('echo', ['hello world']);
      
      expect(execution.exitCode).toBe(0);
      expect(execution.stdout.trim()).toBe('hello world');
      expect(execution.stderr).toBe('');
      expect(execution.endTime).toBeDefined();
      expect(execution.duration).toBeGreaterThan(0);
    });

    test('should handle command failures', async () => {
      await expect(executor.executeCommand('nonexistentcommand123')).rejects.toThrow();
    });

    test('should capture stdout and stderr', async () => {
      // Test stderr capture with a command that writes to stderr
      try {
        await executor.executeCommand('node', ['-e', 'console.error("test error"); process.exit(1)']);
      } catch (error) {
        // Expected to fail
      }

      const history = executor.getExecutionHistory();
      const lastExecution = history[history.length - 1];
      expect(lastExecution.stderr).toContain('test error');
    });

    test('should handle timeouts', async () => {
      const shortTimeoutExecutor = new TerminalExecutor({ timeout: 100 });
      
      await expect(
        shortTimeoutExecutor.executeCommand('sleep', ['1'])
      ).rejects.toThrow('timeout');
    });

    test('should track execution metrics', async () => {
      const startTime = Date.now();
      const execution = await executor.executeCommand('echo', ['test']);
      
      expect(execution.id).toMatch(/^exec_\d+_[a-z0-9]+$/);
      expect(execution.startTime.getTime()).toBeGreaterThanOrEqual(startTime);
      expect(execution.endTime!.getTime()).toBeGreaterThanOrEqual(execution.startTime.getTime());
      expect(execution.duration).toBeGreaterThan(0);
    });
  });

  describe('Risk Assessment', () => {
    test('should assess low risk for safe commands', async () => {
      const execution = await executor.executeCommand('echo', ['test']);
      expect(execution.riskLevel).toBe('low');
    });

    test('should assess high risk for dangerous commands', async () => {
      try {
        await executor.executeCommand('sudo', ['echo', 'test']);
      } catch (error) {
        // Expected to potentially fail
      }
      
      const history = executor.getExecutionHistory();
      const lastExecution = history[history.length - 1];
      expect(['high', 'critical']).toContain(lastExecution.riskLevel);
    });

    test('should assess medium risk for potentially dangerous commands', async () => {
      const execution = await executor.executeCommand('git', ['status']);
      expect(['medium', 'low']).toContain(execution.riskLevel);
    });
  });

  describe('Execution Management', () => {
    test('should track active executions', async () => {
      const activeCount = executor.getActiveExecutions().length;
      
      // Start a command that takes some time
      const executionPromise = executor.executeCommand('sleep', ['0.1']);
      
      expect(executor.getActiveExecutions().length).toBe(activeCount + 1);
      
      await executionPromise;
      
      expect(executor.getActiveExecutions().length).toBe(activeCount);
    });

    test('should maintain execution history', async () => {
      const initialHistoryLength = executor.getExecutionHistory().length;
      
      await executor.executeCommand('echo', ['test1']);
      await executor.executeCommand('echo', ['test2']);
      
      const history = executor.getExecutionHistory();
      expect(history.length).toBe(initialHistoryLength + 2);
      expect(history[history.length - 2].stdout.trim()).toBe('test1');
      expect(history[history.length - 1].stdout.trim()).toBe('test2');
    });

    test('should be able to terminate executions', (done) => {
      executor.executeCommand('sleep', ['5']).catch(() => {
        // Expected to be terminated
        done();
      });

      setTimeout(() => {
        const activeExecutions = executor.getActiveExecutions();
        expect(activeExecutions.length).toBe(1);
        
        const terminated = executor.terminateExecution(activeExecutions[0]);
        expect(terminated).toBe(true);
      }, 100);
    });
  });

  describe('Event Handling', () => {
    test('should emit stdout events', (done) => {
      executor.on('stdout', (executionId, data) => {
        expect(typeof executionId).toBe('string');
        expect(data.toString().trim()).toBe('test output');
        done();
      });

      executor.executeCommand('echo', ['test output']);
    });

    test('should emit completed events', (done) => {
      executor.on('completed', (execution) => {
        expect(execution.exitCode).toBe(0);
        expect(execution.command).toBe('echo');
        done();
      });

      executor.executeCommand('echo', ['test']);
    });
  });

  describe('Working Directory and Environment', () => {
    test('should respect working directory option', async () => {
      const execution = await executor.executeCommand('pwd', [], {
        workingDirectory: '/tmp'
      });
      
      expect(execution.stdout.trim()).toContain('/tmp');
    });

    test('should respect environment variables', async () => {
      const execution = await executor.executeCommand('node', ['-e', 'console.log(process.env.TEST_VAR)'], {
        environment: { TEST_VAR: 'test_value' }
      });
      
      expect(execution.stdout.trim()).toBe('test_value');
    });
  });
});
