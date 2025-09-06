import { CommandCategorizer } from '../../src/command/CommandCategorizer';

describe('CommandCategorizer', () => {
  let categorizer: CommandCategorizer;

  beforeEach(() => {
    categorizer = new CommandCategorizer();
  });

  describe('Command Analysis', () => {
    test('should categorize file system read commands correctly', () => {
      const testCases = [
        { cmd: 'ls', args: ['-la'], expectedCategory: 'file-system-read' },
        { cmd: 'cat', args: ['file.txt'], expectedCategory: 'file-system-read' },
        { cmd: 'grep', args: ['pattern', 'file.txt'], expectedCategory: 'file-system-read' },
        { cmd: 'find', args: ['.', '-name', '*.js'], expectedCategory: 'file-system-read' }
      ];

      testCases.forEach(({ cmd, args, expectedCategory }) => {
        const analysis = categorizer.analyzeCommand(cmd, args);
        expect(analysis.category.name).toBe(expectedCategory);
        expect(analysis.category.riskLevel).toBe('low');
        expect(analysis.category.requiresConfirmation).toBe(false);
        expect(analysis.category.allowedInSandbox).toBe(true);
        expect(analysis.confidence).toBeGreaterThan(0.8);
      });
    });

    test('should categorize file system write commands correctly', () => {
      const testCases = [
        { cmd: 'mkdir', args: ['test-dir'], expectedCategory: 'file-system-write' },
        { cmd: 'touch', args: ['newfile.txt'], expectedCategory: 'file-system-write' },
        { cmd: 'cp', args: ['src.txt', 'dst.txt'], expectedCategory: 'file-system-write' },
        { cmd: 'mv', args: ['old.txt', 'new.txt'], expectedCategory: 'file-system-write' }
      ];

      testCases.forEach(({ cmd, args, expectedCategory }) => {
        const analysis = categorizer.analyzeCommand(cmd, args);
        expect(analysis.category.name).toBe(expectedCategory);
        expect(analysis.category.riskLevel).toBe('medium');
        expect(analysis.category.requiresConfirmation).toBe(true);
        expect(analysis.category.allowedInSandbox).toBe(true);
      });
    });

    test('should categorize system administration commands correctly', () => {
      const testCases = [
        { cmd: 'sudo', args: ['ls'], expectedCategory: 'system-admin' },
        { cmd: 'systemctl', args: ['restart', 'nginx'], expectedCategory: 'system-admin' },
        { cmd: 'chmod', args: ['777', 'file.txt'], expectedCategory: 'system-admin' },
        { cmd: 'chown', args: ['user:group', 'file.txt'], expectedCategory: 'system-admin' }
      ];

      testCases.forEach(({ cmd, args, expectedCategory }) => {
        const analysis = categorizer.analyzeCommand(cmd, args);
        expect(analysis.category.name).toBe(expectedCategory);
        expect(analysis.category.riskLevel).toBe('critical');
        expect(analysis.category.requiresConfirmation).toBe(true);
        expect(analysis.category.allowedInSandbox).toBe(false);
      });
    });

    test('should categorize network commands correctly', () => {
      const testCases = [
        { cmd: 'curl', args: ['https://api.example.com'], expectedCategory: 'network' },
        { cmd: 'wget', args: ['http://example.com/file.zip'], expectedCategory: 'network' },
        { cmd: 'ssh', args: ['user@server'], expectedCategory: 'network' },
        { cmd: 'ping', args: ['google.com'], expectedCategory: 'network' }
      ];

      testCases.forEach(({ cmd, args, expectedCategory }) => {
        const analysis = categorizer.analyzeCommand(cmd, args);
        expect(analysis.category.name).toBe(expectedCategory);
        expect(analysis.category.riskLevel).toBe('medium');
        expect(analysis.category.requiresConfirmation).toBe(true);
        expect(analysis.category.allowedInSandbox).toBe(true);
      });
    });

    test('should categorize development tools correctly', () => {
      const testCases = [
        { cmd: 'git', args: ['status'], expectedCategory: 'development' },
        { cmd: 'node', args: ['script.js'], expectedCategory: 'development' },
        { cmd: 'python', args: ['app.py'], expectedCategory: 'development' },
        { cmd: 'gcc', args: ['-o', 'app', 'main.c'], expectedCategory: 'development' }
      ];

      testCases.forEach(({ cmd, args, expectedCategory }) => {
        const analysis = categorizer.analyzeCommand(cmd, args);
        expect(analysis.category.name).toBe(expectedCategory);
        expect(analysis.category.riskLevel).toBe('low');
        expect(analysis.category.requiresConfirmation).toBe(false);
        expect(analysis.category.allowedInSandbox).toBe(true);
      });
    });

    test('should categorize package management commands correctly', () => {
      const testCases = [
        { cmd: 'npm', args: ['install'], expectedCategory: 'package-management' },
        { cmd: 'pip', args: ['install', 'requests'], expectedCategory: 'package-management' },
        { cmd: 'apt', args: ['update'], expectedCategory: 'package-management' },
        { cmd: 'brew', args: ['install', 'nodejs'], expectedCategory: 'package-management' }
      ];

      testCases.forEach(({ cmd, args, expectedCategory }) => {
        const analysis = categorizer.analyzeCommand(cmd, args);
        expect(analysis.category.name).toBe(expectedCategory);
        expect(analysis.category.riskLevel).toBe('medium');
        expect(analysis.category.requiresConfirmation).toBe(true);
        expect(analysis.category.allowedInSandbox).toBe(true);
      });
    });

    test('should provide analysis reasons and recommendations', () => {
      const analysis = categorizer.analyzeCommand('sudo', ['rm', '-rf', '/tmp/test']);
      
      expect(analysis.reasons).toBeDefined();
      expect(analysis.reasons.length).toBeGreaterThan(0);
      expect(analysis.recommendations).toBeDefined();
      expect(analysis.recommendations.length).toBeGreaterThan(0);
      
      expect(analysis.reasons[0]).toContain('privileges');
      expect(analysis.recommendations[0]).toContain('Verify');
    });

    test('should handle unknown commands with appropriate defaults', () => {
      const analysis = categorizer.analyzeCommand('unknowncommand123', ['arg1', 'arg2']);
      
      expect(analysis.category.name).toBe('development');
      expect(analysis.confidence).toBeLessThan(0.5);
      expect(analysis.reasons[0]).toContain('not recognized');
      expect(analysis.recommendations).toContain('Manual review recommended');
    });

    test('should handle empty arguments gracefully', () => {
      const analysis = categorizer.analyzeCommand('ls');
      
      expect(analysis.category.name).toBe('file-system-read');
      expect(analysis.confidence).toBeGreaterThan(0.8);
    });

    test('should be case insensitive', () => {
      const lowerCase = categorizer.analyzeCommand('git', ['status']);
      const upperCase = categorizer.analyzeCommand('GIT', ['STATUS']);
      const mixedCase = categorizer.analyzeCommand('Git', ['Status']);
      
      expect(lowerCase.category.name).toBe(upperCase.category.name);
      expect(lowerCase.category.name).toBe(mixedCase.category.name);
    });
  });

  describe('Category Management', () => {
    test('should provide list of all categories', () => {
      const categories = categorizer.getCategories();
      
      expect(categories.length).toBeGreaterThan(0);
      
      const categoryNames = categories.map(c => c.name);
      expect(categoryNames).toContain('file-system-read');
      expect(categoryNames).toContain('file-system-write');
      expect(categoryNames).toContain('system-admin');
      expect(categoryNames).toContain('network');
      expect(categoryNames).toContain('development');
      expect(categoryNames).toContain('package-management');
    });

    test('should have valid category properties', () => {
      const categories = categorizer.getCategories();
      
      categories.forEach(category => {
        expect(category.name).toBeDefined();
        expect(category.description).toBeDefined();
        expect(['low', 'medium', 'high', 'critical']).toContain(category.riskLevel);
        expect(typeof category.requiresConfirmation).toBe('boolean');
        expect(typeof category.allowedInSandbox).toBe('boolean');
      });
    });
  });

  describe('Edge Cases', () => {
    test('should handle commands with complex arguments', () => {
      const analysis = categorizer.analyzeCommand('find', [
        '/home/user',
        '-type', 'f',
        '-name', '*.js',
        '-exec', 'grep', '-l', 'TODO', '{}', ';'
      ]);
      
      expect(analysis.category.name).toBe('file-system-read');
      expect(analysis.confidence).toBeGreaterThan(0.7);
    });

    test('should handle piped commands in arguments', () => {
      const analysis = categorizer.analyzeCommand('bash', ['-c', 'cat file.txt | grep pattern']);
      
      expect(analysis.category).toBeDefined();
      expect(analysis.confidence).toBeGreaterThan(0);
    });

    test('should handle commands with special characters', () => {
      const analysis = categorizer.analyzeCommand('echo', ['Hello, World! & Special chars: @#$%']);
      
      expect(analysis.category.name).toBeDefined();
      expect(analysis.confidence).toBeGreaterThan(0);
    });
  });

  describe('Performance', () => {
    test('should analyze commands quickly', () => {
      const startTime = Date.now();
      
      // Analyze 100 commands
      for (let i = 0; i < 100; i++) {
        categorizer.analyzeCommand('ls', ['-la']);
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete 100 analyses in less than 1 second
      expect(duration).toBeLessThan(1000);
    });

    test('should be consistent in analysis results', () => {
      const command = 'git';
      const args = ['commit', '-m', 'test message'];
      
      const results = [];
      for (let i = 0; i < 10; i++) {
        results.push(categorizer.analyzeCommand(command, args));
      }
      
      // All results should be identical
      const firstResult = results[0];
      results.forEach(result => {
        expect(result.category.name).toBe(firstResult.category.name);
        expect(result.confidence).toBe(firstResult.confidence);
      });
    });
  });
});
