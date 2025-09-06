import { TerminalCommandIntegration, IntegrationConfig } from '../../src/TerminalCommandIntegration';

describe('TerminalCommandIntegration', () => {
  let integration: TerminalCommandIntegration;
  
  const defaultConfig: IntegrationConfig = {
    requireConfirmation: false, // Disabled for automated testing
    enableSandbox: false,
    securityThreshold: 70,
    executionTimeout: 5000,
    maxConcurrentExecutions: 3
  };

  beforeEach(() => {
    integration = new TerminalCommandIntegration(defaultConfig);
  });

  afterEach(() => {
    // Clean up any active executions
    const activeExecutions = integration.getActiveExecutions();
    activeExecutions.forEach(id => integration.terminateExecution(id));
  });

  describe('End-to-End Command Execution', () => {
    test('should execute safe commands successfully', async () => {
      const execution = await integration.executeCommand('echo', ['Hello Integration Test']);
      
      expect(execution.exitCode).toBe(0);
      expect(execution.stdout.trim()).toBe('Hello Integration Test');
      expect(execution.riskLevel).toBe('low');
      
      const metrics = integration.getMetrics();
      expect(metrics.totalExecutions).toBeGreaterThan(0);
      expect(metrics.successfulExecutions).toBeGreaterThan(0);
    });

    test('should reject commands below security threshold', async () => {
      const highThresholdConfig = { ...defaultConfig, securityThreshold: 95 };
      const strictIntegration = new TerminalCommandIntegration(highThresholdConfig);
      
      await expect(
        strictIntegration.executeCommand('sudo', ['echo', 'test'])
      ).rejects.toThrow(/security score.*below threshold/);
    });

    test('should handle command failures gracefully', async () => {
      await expect(
        integration.executeCommand('nonexistentcommand789')
      ).rejects.toThrow();

      const metrics = integration.getMetrics();
      expect(metrics.failedExecutions).toBeGreaterThan(0);
    });

    test('should track comprehensive execution metrics', async () => {
      const initialMetrics = integration.getMetrics();
      
      // Execute multiple commands
      await integration.executeCommand('echo', ['test1']);
      await integration.executeCommand('echo', ['test2']);
      
      try {
        await integration.executeCommand('false'); // Command that exits with code 1
      } catch {
        // Expected to fail
      }

      const finalMetrics = integration.getMetrics();
      
      expect(finalMetrics.totalExecutions).toBe(initialMetrics.totalExecutions + 3);
      expect(finalMetrics.successfulExecutions).toBe(initialMetrics.successfulExecutions + 2);
      expect(finalMetrics.failedExecutions).toBe(initialMetrics.failedExecutions + 1);
      expect(finalMetrics.averageExecutionTime).toBeGreaterThan(0);
      expect(finalMetrics.securityScore).toBeGreaterThan(0);
    });
  });

  describe('Batch Command Execution', () => {
    test('should execute multiple commands in batch', async () => {
      const commands = [
        { command: 'echo', args: ['batch1'] },
        { command: 'echo', args: ['batch2'] },
        { command: 'pwd', args: [] }
      ];

      const results = await integration.executeCommandBatch(commands);
      
      expect(results.length).toBe(3);
      expect(results[0].stdout.trim()).toBe('batch1');
      expect(results[1].stdout.trim()).toBe('batch2');
      expect(results[2].stdout.trim()).toContain('/');
    });

    test('should respect max concurrent executions limit', async () => {
      const commands = Array(10).fill(0).map((_, i) => ({
        command: 'echo',
        args: [`test${i}`]
      }));

      await expect(
        integration.executeCommandBatch(commands)
      ).rejects.toThrow(/exceeds maximum concurrent executions/);
    });

    test('should continue batch execution even if some commands fail', async () => {
      const commands = [
        { command: 'echo', args: ['success1'] },
        { command: 'false', args: [] }, // This will fail
        { command: 'echo', args: ['success2'] }
      ];

      const results = await integration.executeCommandBatch(commands);
      
      // Should get results for successful commands only
      expect(results.length).toBe(2);
      expect(results[0].stdout.trim()).toBe('success1');
      expect(results[1].stdout.trim()).toBe('success2');
    });
  });

  describe('Configuration Management', () => {
    test('should allow runtime configuration updates', () => {
      const newConfig = {
        securityThreshold: 85,
        executionTimeout: 8000
      };

      integration.updateConfig(newConfig);
      
      // Configuration update should emit an event
      const eventPromise = new Promise<IntegrationConfig>((resolve) => {
        integration.once('config-updated', resolve);
      });

      integration.updateConfig({ requireConfirmation: true });
      
      return eventPromise.then(config => {
        expect(config.requireConfirmation).toBe(true);
        expect(config.securityThreshold).toBe(85);
        expect(config.executionTimeout).toBe(8000);
      });
    });

    test('should apply new configuration to subsequent executions', async () => {
      // Lower the security threshold
      integration.updateConfig({ securityThreshold: 30 });
      
      // Command that would normally fail security check should now pass
      await expect(
        integration.executeCommand('echo', ['test with low threshold'])
      ).resolves.toBeDefined();
    });
  });

  describe('Event System', () => {
    test('should emit execution lifecycle events', (done) => {
      const events: string[] = [];
      
      integration.on('execution-started', () => events.push('started'));
      integration.on('command-analyzed', () => events.push('analyzed'));
      integration.on('security-validated', () => events.push('validated'));
      integration.on('execution-completed', () => events.push('completed'));

      integration.executeCommand('echo', ['event test']).then(() => {
        expect(events).toEqual(['started', 'analyzed', 'validated', 'completed']);
        done();
      });
    });

    test('should emit stdout and stderr events', (done) => {
      let stdoutReceived = false;
      
      integration.on('stdout', (executionId, data) => {
        expect(typeof executionId).toBe('string');
        expect(data.toString().trim()).toBe('stdout event test');
        stdoutReceived = true;
      });

      integration.executeCommand('echo', ['stdout event test']).then(() => {
        expect(stdoutReceived).toBe(true);
        done();
      });
    });

    test('should emit failure events', (done) => {
      integration.on('execution-failed', (data) => {
        expect(data.command).toBe('invalidcommand123');
        expect(data.error).toBeDefined();
        done();
      });

      integration.executeCommand('invalidcommand123').catch(() => {
        // Expected to fail
      });
    });
  });

  describe('Security Integration', () => {
    test('should integrate command categorization and security validation', async () => {
      const execution = await integration.executeCommand('git', ['status']);
      
      // Should be categorized as development tool
      expect(execution.riskLevel).toBe('low');
      
      const metrics = integration.getMetrics();
      expect(metrics.securityScore).toBeGreaterThan(70);
    });

    test('should handle high-risk commands appropriately', async () => {
      // Enable confirmation for this test
      const confirmationIntegration = new TerminalCommandIntegration({
        ...defaultConfig,
        requireConfirmation: true,
        securityThreshold: 50
      });

      // Mock the confirmation to auto-approve
      jest.spyOn(confirmationIntegration as any, 'requestUserConfirmation')
        .mockResolvedValue(true);

      await expect(
        confirmationIntegration.executeCommand('sudo', ['echo', 'test'])
      ).rejects.toThrow(/security score.*below threshold/);
    });

    test('should maintain security scores across multiple executions', async () => {
      // Execute a mix of safe and potentially risky commands
      await integration.executeCommand('ls', ['-la']);
      await integration.executeCommand('echo', ['safe command']);
      await integration.executeCommand('git', ['log', '--oneline']);

      const metrics = integration.getMetrics();
      expect(metrics.securityScore).toBeGreaterThan(80);
      expect(metrics.totalExecutions).toBe(3);
    });
  });

  describe('Performance and Reliability', () => {
    test('should handle rapid consecutive executions', async () => {
      const startTime = Date.now();
      
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(integration.executeCommand('echo', [`test${i}`]));
      }

      const results = await Promise.all(promises);
      const endTime = Date.now();
      
      expect(results.length).toBe(10);
      results.forEach((result, index) => {
        expect(result.stdout.trim()).toBe(`test${index}`);
        expect(result.exitCode).toBe(0);
      });
      
      // Should complete reasonably quickly
      expect(endTime - startTime).toBeLessThan(5000);
    });

    test('should handle execution timeouts gracefully', async () => {
      const shortTimeoutIntegration = new TerminalCommandIntegration({
        ...defaultConfig,
        executionTimeout: 100
      });

      await expect(
        shortTimeoutIntegration.executeCommand('sleep', ['1'])
      ).rejects.toThrow(/timeout/);

      const metrics = shortTimeoutIntegration.getMetrics();
      expect(metrics.failedExecutions).toBeGreaterThan(0);
    });

    test('should maintain execution history correctly', async () => {
      const initialHistory = integration.getExecutionHistory().length;
      
      await integration.executeCommand('echo', ['history test 1']);
      await integration.executeCommand('echo', ['history test 2']);
      
      const history = integration.getExecutionHistory();
      expect(history.length).toBe(initialHistory + 2);
      
      const lastTwo = history.slice(-2);
      expect(lastTwo[0].stdout.trim()).toBe('history test 1');
      expect(lastTwo[1].stdout.trim()).toBe('history test 2');
    });
  });

  describe('Error Handling and Recovery', () => {
    test('should recover gracefully from command failures', async () => {
      // Execute a failing command
      try {
        await integration.executeCommand('exit', ['1']);
      } catch {
        // Expected to fail
      }

      // Should still be able to execute successful commands
      const execution = await integration.executeCommand('echo', ['recovery test']);
      expect(execution.exitCode).toBe(0);
      expect(execution.stdout.trim()).toBe('recovery test');
    });

    test('should handle malformed commands gracefully', async () => {
      const malformedCommands = [
        { cmd: '', args: [] },
        { cmd: 'command with spaces', args: [] },
        { cmd: 'cmd', args: ['arg with\nnewlines'] }
      ];

      for (const { cmd, args } of malformedCommands) {
        try {
          if (cmd) { // Skip empty command test as it would throw immediately
            await integration.executeCommand(cmd, args);
          }
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
        }
      }

      // System should still be functional
      const execution = await integration.executeCommand('echo', ['still working']);
      expect(execution.exitCode).toBe(0);
    });
  });
});
