import { CommandAnalysis } from '../command/CommandCategorizer';

export interface SecurityCheck {
  name: string;
  description: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  passed: boolean;
  message: string;
}

export interface SecurityValidationResult {
  isValid: boolean;
  score: number; // 0-100, higher is better
  checks: SecurityCheck[];
  recommendations: string[];
}

export class SecurityValidator {
  private blacklistedCommands = new Set([
    'rm -rf /',
    'dd if=/dev/zero',
    'format c:',
    'mkfs.ext4',
    'fdisk /dev/sda',
    'shutdown -h now',
    'init 0',
    'halt',
    'reboot'
  ]);

  private suspiciousPatterns = [
    /curl.*\|.*sh/i,  // Pipe curl to shell
    /wget.*\|.*sh/i,  // Pipe wget to shell
    /eval.*\$/i,      // Dynamic evaluation
    /exec.*\$/i,      // Dynamic execution
    /\$\(.*\)/i,      // Command substitution
    /`.*`/i,          // Backtick command substitution
    /;\s*(rm|dd|format)/i, // Command chaining with dangerous commands
    /&&\s*(rm|dd|format)/i // Command chaining with dangerous commands
  ];

  validateCommand(command: string, args: string[], analysis: CommandAnalysis): SecurityValidationResult {
    const checks: SecurityCheck[] = [];
    const recommendations: string[] = [];
    
    const fullCommand = `${command} ${args.join(' ')}`.trim();

    // Check 1: Blacklisted commands
    const blacklistCheck = this.checkBlacklist(fullCommand);
    checks.push(blacklistCheck);
    if (!blacklistCheck.passed) {
      recommendations.push('This command is explicitly blacklisted due to high risk');
    }

    // Check 2: Suspicious patterns
    const suspiciousCheck = this.checkSuspiciousPatterns(fullCommand);
    checks.push(suspiciousCheck);
    if (!suspiciousCheck.passed) {
      recommendations.push('Command contains suspicious patterns that may indicate security risks');
    }

    // Check 3: Privilege escalation
    const privilegeCheck = this.checkPrivilegeEscalation(fullCommand);
    checks.push(privilegeCheck);
    if (!privilegeCheck.passed) {
      recommendations.push('Command attempts privilege escalation - verify necessity');
    }

    // Check 4: File system safety
    const fileSystemCheck = this.checkFileSystemSafety(fullCommand);
    checks.push(fileSystemCheck);
    if (!fileSystemCheck.passed) {
      recommendations.push('Command may modify critical system files');
    }

    // Check 5: Network security
    const networkCheck = this.checkNetworkSecurity(fullCommand);
    checks.push(networkCheck);
    if (!networkCheck.passed) {
      recommendations.push('Network command detected - verify destination safety');
    }

    // Check 6: Command injection
    const injectionCheck = this.checkCommandInjection(fullCommand);
    checks.push(injectionCheck);
    if (!injectionCheck.passed) {
      recommendations.push('Potential command injection detected');
    }

    // Calculate security score
    const passedChecks = checks.filter(check => check.passed).length;
    const totalChecks = checks.length;
    const baseScore = (passedChecks / totalChecks) * 100;
    
    // Apply category-based scoring
    const categoryMultiplier = this.getCategoryScoreMultiplier(analysis.category.riskLevel);
    const score = Math.round(baseScore * categoryMultiplier);

    const isValid = score >= 70 && !checks.some(check => check.severity === 'critical' && !check.passed);

    return {
      isValid,
      score,
      checks,
      recommendations
    };
  }

  private checkBlacklist(command: string): SecurityCheck {
    const isBlacklisted = Array.from(this.blacklistedCommands).some(blacklisted => 
      command.toLowerCase().includes(blacklisted.toLowerCase())
    );

    return {
      name: 'blacklist-check',
      description: 'Verify command is not explicitly blacklisted',
      severity: isBlacklisted ? 'critical' : 'info',
      passed: !isBlacklisted,
      message: isBlacklisted ? 'Command contains blacklisted patterns' : 'No blacklisted patterns detected'
    };
  }

  private checkSuspiciousPatterns(command: string): SecurityCheck {
    const matchedPatterns = this.suspiciousPatterns.filter(pattern => pattern.test(command));
    
    return {
      name: 'suspicious-patterns',
      description: 'Check for suspicious command patterns',
      severity: matchedPatterns.length > 0 ? 'warning' : 'info',
      passed: matchedPatterns.length === 0,
      message: matchedPatterns.length > 0 
        ? `Suspicious patterns detected: ${matchedPatterns.length} matches`
        : 'No suspicious patterns detected'
    };
  }

  private checkPrivilegeEscalation(command: string): SecurityCheck {
    const escalationKeywords = ['sudo', 'su -', 'doas', 'pkexec'];
    const hasEscalation = escalationKeywords.some(keyword => command.toLowerCase().includes(keyword));

    return {
      name: 'privilege-escalation',
      description: 'Check for privilege escalation attempts',
      severity: hasEscalation ? 'warning' : 'info',
      passed: !hasEscalation,
      message: hasEscalation ? 'Privilege escalation detected' : 'No privilege escalation detected'
    };
  }

  private checkFileSystemSafety(command: string): SecurityCheck {
    const dangerousPaths = ['/etc/', '/sys/', '/proc/', '/dev/', '/boot/', '/'];
    const criticalOperations = ['rm', 'rmdir', 'unlink', 'truncate'];
    
    const hasDangerousPath = dangerousPaths.some(path => command.includes(path));
    const hasCriticalOp = criticalOperations.some(op => command.includes(op));
    const isDangerous = hasDangerousPath && hasCriticalOp;

    return {
      name: 'filesystem-safety',
      description: 'Check for dangerous file system operations',
      severity: isDangerous ? 'error' : 'info',
      passed: !isDangerous,
      message: isDangerous 
        ? 'Potentially dangerous file system operation detected'
        : 'File system operations appear safe'
    };
  }

  private checkNetworkSecurity(command: string): SecurityCheck {
    const networkCommands = ['curl', 'wget', 'nc', 'telnet', 'ssh', 'scp'];
    const hasNetworkCommand = networkCommands.some(cmd => command.includes(cmd));
    
    // Check for insecure protocols or suspicious URLs
    const insecurePatterns = [
      /http:\/\/[^\/]*\.(tk|ml|ga|cf)/i,  // Suspicious TLDs
      /\d+\.\d+\.\d+\.\d+/,  // Raw IP addresses
      /localhost:\d+/i,      // Localhost with port
    ];
    
    const hasInsecurePattern = insecurePatterns.some(pattern => pattern.test(command));

    return {
      name: 'network-security',
      description: 'Check network command security',
      severity: hasNetworkCommand && hasInsecurePattern ? 'warning' : 'info',
      passed: !hasNetworkCommand || !hasInsecurePattern,
      message: hasNetworkCommand 
        ? (hasInsecurePattern ? 'Network command with suspicious destination' : 'Network command appears safe')
        : 'No network commands detected'
    };
  }

  private checkCommandInjection(command: string): SecurityCheck {
    // Look for command injection patterns
    const injectionPatterns = [
      /;[\s]*[rm|dd|format|shutdown]/i,
      /\|\|[\s]*[rm|dd|format]/i,
      /&&[\s]*[rm|dd|format]/i,
      /`[^`]*[rm|dd|format][^`]*`/i,
      /\$\([^)]*[rm|dd|format][^)]*\)/i
    ];

    const hasInjection = injectionPatterns.some(pattern => pattern.test(command));

    return {
      name: 'command-injection',
      description: 'Check for command injection attempts',
      severity: hasInjection ? 'error' : 'info',
      passed: !hasInjection,
      message: hasInjection ? 'Potential command injection detected' : 'No command injection detected'
    };
  }

  private getCategoryScoreMultiplier(riskLevel: string): number {
    switch (riskLevel) {
      case 'critical': return 0.5;
      case 'high': return 0.7;
      case 'medium': return 0.85;
      case 'low': return 1.0;
      default: return 0.8;
    }
  }
}
