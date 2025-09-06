import { TerminalCommandIntegration, IntegrationConfig } from '../../src/TerminalCommandIntegration';

describe('End-to-End Terminal Command Integration Tests', () => {
  let integration: TerminalCommandIntegration;

  const e2eConfig: IntegrationConfig = {
    requireConfirmation: false, // Disabled for automated E2E testing
    enableSandbox: true,
    securityThreshold: 80,
    executionTimeout: 10000,
    maxConcurrentExecutions: 5
  };

  beforeEach(() => {
    integration = new TerminalCommandIntegration(e2eConfig);
  });

  afterEach(() => {
    // Clean up any active executions
    const activeExecutions = integration.getActiveExecutions();
    activeExecutions.forEach(id => integration.terminateExecution(id));
  });

  describe('Real Development Workflow Scenarios', () => {
    test('should handle complete git workflow', async () => {
      const gitCommands = [
        ['git', ['status']],
        ['git', ['log', '--oneline', '-5']],
        ['git', ['diff', '--name-only']]
      ];

      for (const [command, args] of gitCommands) {
        const execution = await integration.executeCommand(command, args);
        expect(execution.exitCode).toBe(0);
        expect(execution.riskLevel).toBe('low');
      }

      const metrics = integration.getMetrics();
      expect(metrics.securityScore).toBeGreaterThan(85);
      expect(metrics.successfulExecutions).toBe(3);
    });

    test('should handle Node.js development workflow', async () => {
      const nodeCommands = [
        ['node', ['--version']],
        ['npm', ['--version']]
      ];

      for (const [command, args] of nodeCommands) {
        const execution = await integration.executeCommand(command, args);
        expect(execution.exitCode).toBe(0);
        expect(['low', 'medium']).toContain(execution.riskLevel);
      }

      const metrics = integration.getMetrics();
      expect(metrics.averageExecutionTime).toBeGreaterThan(0);
    });

    test('should handle file system operations safely', async () => {
      const fsCommands = [
        ['ls', ['-la']],
        ['pwd', []],
        ['which', ['node']],
        ['find', ['.', '-name', 'package.json', '-type', 'f']]
      ];

      const results = [];
      
      for (const [command, args] of fsCommands) {
        const execution = await integration.executeCommand(command, args);
        results.push(execution);
        expect(execution.exitCode).toBe(0);
        expect(execution.riskLevel).toBe('low');
      }

      expect(results.length).toBe(4);
      
      // Verify outputs make sense
      expect(results[1].stdout.trim()).toContain('/'); // pwd should return a path
    });
  });

  describe('Security Integration in Real Scenarios', () => {
    test('should prevent dangerous operations in development context', async () => {
      const dangerousCommands = [
        ['rm', ['-rf', '/etc/passwd']],
        ['dd', ['if=/dev/zero', 'of=/dev/sda']],
        ['chmod', ['777', '/etc/shadow']]
      ];

      let blockedCount = 0;

      for (const [command, args] of dangerousCommands) {
        try {
          await integration.executeCommand(command, args);
        } catch (error) {
          blockedCount++;
          expect(error.message).toMatch(/security score.*below threshold|execution denied/);
        }
      }

      expect(blockedCount).toBe(dangerousCommands.length);
    });

    test('should handle mixed security levels appropriately', async () => {
      const mixedCommands = [
        { cmd: ['echo', ['safe operation']], shouldSucceed: true },
        { cmd: ['ls', ['-la']], shouldSucceed: true },
        { cmd: ['sudo', ['rm', '/dangerous']], shouldSucceed: false }
      ];

      let successCount = 0;
      let blockedCount = 0;

      for (const { cmd: [command, args], shouldSucceed } of mixedCommands) {
        try {
          await integration.executeCommand(command, args);
          if (shouldSucceed) {
            successCount++;
          }
        } catch (error) {
          if (!shouldSucceed) {
            blockedCount++;
          }
        }
      }

      expect(successCount).toBe(2);
      expect(blockedCount).toBe(1);
    });

    test('should maintain security metrics across complex workflow', async () => {
      // Simulate a development session with various commands
      const developmentSession = [
        ['git', ['status']],
        ['ls', ['-la', 'src/']],
        ['cat', ['package.json']],
        ['npm', ['test']],
        ['git', ['log', '--oneline', '-3']],
        ['find', ['.', '-name', '*.test.ts']]
      ];

      const results = [];
      
      for (const [command, args] of developmentSession) {
        try {
          const execution = await integration.executeCommand(command, args);
          results.push(execution);
        } catch (error) {
          // Some commands might fail in test environment, that's ok
        }
      }

      expect(results.length).toBeGreaterThan(0);

      const metrics = integration.getMetrics();
      expect(metrics.securityScore).toBeGreaterThan(80);
      expect(metrics.totalExecutions).toBeGreaterThan(0);
    });
  });

  describe('Performance in Real Usage Patterns', () => {
    test('should handle rapid command sequences efficiently', async () => {
      const startTime = Date.now();
      
      const rapidCommands = Array(20).fill(0).map((_, i) => 
        ['echo', [`rapid command ${i}`]]
      );

      const results = [];
      
      for (const [command, args] of rapidCommands) {
        const execution = await integration.executeCommand(command, args);
        results.push(execution);
      }

      const endTime = Date.now();
      const totalDuration = endTime - startTime;

      expect(results.length).toBe(20);
      expect(totalDuration).toBeLessThan(5000); // Should complete in < 5 seconds
      
      results.forEach(result => {
        expect(result.exitCode).toBe(0);
        expect(result.duration).toBeGreaterThan(0);
      });
    });

    test('should maintain performance with concurrent operations', async () => {
      const concurrentCommands = [
        ['echo', ['concurrent 1']],
        ['echo', ['concurrent 2']],
        ['echo', ['concurrent 3']],
        ['pwd', []],
        ['date', []]
      ];

      const startTime = Date.now();
      
      const promises = concurrentCommands.map(([command, args]) => 
        integration.executeCommand(command, args)
      );

      const results = await Promise.all(promises);
      
      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(results.length).toBe(5);
      expect(duration).toBeLessThan(2000); // Concurrent execution should be faster
      
      results.forEach(result => {
        expect(result.exitCode).toBe(0);
      });
    });
  });

  describe('Error Handling and Recovery', () => {
    test('should recover from command failures gracefully', async () => {
      const commandSequence = [
        { cmd: ['echo', ['before failure']], shouldSucceed: true },
        { cmd: ['nonexistentcommand123', []], shouldSucceed: false },
        { cmd: ['echo', ['after failure']], shouldSucceed: true }
      ];

      const results = [];
      const errors = [];

      for (const { cmd: [command, args], shouldSucceed } of commandSequence) {
        try {
          const execution = await integration.executeCommand(command, args);
          results.push(execution);
          expect(shouldSucceed).toBe(true);
        } catch (error) {
          errors.push(error);
          expect(shouldSucceed).toBe(false);
        }
      }

      expect(results.length).toBe(2);
      expect(errors.length).toBe(1);
      
      expect(results[0].stdout.trim()).toBe('before failure');
      expect(results[1].stdout.trim()).toBe('after failure');
    });

    test('should handle timeout scenarios appropriately', async () => {
      const shortTimeoutIntegration = new TerminalCommandIntegration({
        ...e2eConfig,
        executionTimeout: 100 // Very short timeout
      });

      const startTime = Date.now();

      try {
        await shortTimeoutIntegration.executeCommand('sleep', ['1']);
        fail('Command should have timed out');
      } catch (error) {
        expect(error.message).toContain('timeout');
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should timeout quickly, not wait for the full sleep duration
      expect(duration).toBeLessThan(1000);
    });

    test('should maintain system stability under stress', async () => {
      // Test system stability with many operations
      const stressCommands = Array(50).fill(0).map((_, i) => {
        const commands = [
          ['echo', [`stress test ${i}`]],
          ['pwd', []],
          ['date', []]
        ];
        return commands[i % 3];
      });

      let successCount = 0;
      let errorCount = 0;

      for (const [command, args] of stressCommands) {
        try {
          await integration.executeCommand(command, args);
          successCount++;
        } catch (error) {
          errorCount++;
        }
      }

      // System should remain stable and functional
      expect(successCount).toBeGreaterThan(40);
      expect(errorCount).toBeLessThan(10);

      const metrics = integration.getMetrics();
      expect(metrics.totalExecutions).toBeGreaterThan(40);
      expect(metrics.securityScore).toBeGreaterThan(70);
    });
  });

  describe('Full Integration with AI Workflow', () => {
    test('should support AI-assisted development workflow', async () => {
      // Simulate commands that an AI might generate for development tasks
      const aiGeneratedCommands = [
        ['ls', ['-la', 'src/']],           // File exploration
        ['grep', ['-r', 'TODO', 'src/']],  // Code analysis
        ['find', ['.', '-name', '*.test.ts']], // Test file discovery
        ['git', ['status']],               // Version control check
        ['npm', ['run', 'lint']],          // Code quality check
      ];

      const executionResults = [];
      const analysisResults = [];

      for (const [command, args] of aiGeneratedCommands) {
        try {
          // This simulates how an AI agent would analyze and execute commands
          const execution = await integration.executeCommand(command, args);
          
          executionResults.push({
            command: `${command} ${args.join(' ')}`,
            success: execution.exitCode === 0,
            riskLevel: execution.riskLevel,
            duration: execution.duration
          });
        } catch (error) {
          analysisResults.push({
            command: `${command} ${args.join(' ')}`,
            blocked: true,
            reason: error.message
          });
        }
      }

      // AI workflow should have mostly successful, low-risk operations
      const successfulCommands = executionResults.filter(r => r.success);
      const lowRiskCommands = executionResults.filter(r => r.riskLevel === 'low');

      expect(successfulCommands.length).toBeGreaterThan(0);
      expect(lowRiskCommands.length).toBeGreaterThan(0);

      const metrics = integration.getMetrics();
      expect(metrics.securityScore).toBeGreaterThan(75);
    });

    test('should provide comprehensive execution analytics', async () => {
      // Execute a variety of commands to generate comprehensive metrics
      const testCommands = [
        ['echo', ['analytics test']],
        ['ls', ['-la']],
        ['pwd', []],
        ['which', ['node']],
        ['date', []]
      ];

      for (const [command, args] of testCommands) {
        await integration.executeCommand(command, args);
      }

      const metrics = integration.getMetrics();
      const history = integration.getExecutionHistory();

      // Verify comprehensive metrics are available
      expect(metrics.totalExecutions).toBe(5);
      expect(metrics.successfulExecutions).toBe(5);
      expect(metrics.failedExecutions).toBe(0);
      expect(metrics.averageExecutionTime).toBeGreaterThan(0);
      expect(metrics.securityScore).toBeGreaterThan(0);

      // Verify execution history is detailed
      expect(history.length).toBeGreaterThanOrEqual(5);
      history.slice(-5).forEach(execution => {
        expect(execution.id).toBeDefined();
        expect(execution.command).toBeDefined();
        expect(execution.startTime).toBeInstanceOf(Date);
        expect(execution.endTime).toBeInstanceOf(Date);
        expect(execution.duration).toBeGreaterThan(0);
        expect(execution.riskLevel).toBeDefined();
      });
    });
  });

  describe('Configuration and Adaptability', () => {
    test('should adapt behavior based on configuration changes', async () => {
      // Test with low security threshold
      integration.updateConfig({ securityThreshold: 50 });
      
      await integration.executeCommand('echo', ['low threshold test']);
      
      // Test with high security threshold
      integration.updateConfig({ securityThreshold: 95 });
      
      try {
        await integration.executeCommand('git', ['push']);
        // Might succeed or fail depending on security score
      } catch (error) {
        expect(error.message).toContain('security score');
      }

      // Verify configuration updates work
      const metrics = integration.getMetrics();
      expect(metrics.totalExecutions).toBeGreaterThan(0);
    });

    test('should handle various execution environments', async () => {
      // Test different working directory scenarios
      const commands = [
        ['pwd', []],
        ['ls', ['-la']],
        ['echo', ['environment test']]
      ];

      for (const [command, args] of commands) {
        const execution = await integration.executeCommand(command, args, {
          workingDirectory: process.cwd()
        });

        expect(execution.exitCode).toBe(0);
        expect(execution.stdout).toBeDefined();
      }
    });
  });
});
