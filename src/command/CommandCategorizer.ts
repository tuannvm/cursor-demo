export interface CommandCategory {
  name: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  requiresConfirmation: boolean;
  allowedInSandbox: boolean;
  description: string;
}

export interface CommandAnalysis {
  category: CommandCategory;
  confidence: number;
  reasons: string[];
  recommendations: string[];
}

export class CommandCategorizer {
  private categories: Map<string, CommandCategory> = new Map();

  constructor() {
    this.initializeCategories();
  }

  private initializeCategories(): void {
    const categories: CommandCategory[] = [
      {
        name: 'file-system-read',
        riskLevel: 'low',
        requiresConfirmation: false,
        allowedInSandbox: true,
        description: 'Read-only file system operations'
      },
      {
        name: 'file-system-write',
        riskLevel: 'medium',
        requiresConfirmation: true,
        allowedInSandbox: true,
        description: 'File system modifications'
      },
      {
        name: 'system-admin',
        riskLevel: 'critical',
        requiresConfirmation: true,
        allowedInSandbox: false,
        description: 'System administration commands'
      },
      {
        name: 'network',
        riskLevel: 'medium',
        requiresConfirmation: true,
        allowedInSandbox: true,
        description: 'Network operations'
      },
      {
        name: 'development',
        riskLevel: 'low',
        requiresConfirmation: false,
        allowedInSandbox: true,
        description: 'Development tools and utilities'
      },
      {
        name: 'package-management',
        riskLevel: 'medium',
        requiresConfirmation: true,
        allowedInSandbox: true,
        description: 'Package installation and management'
      }
    ];

    categories.forEach(category => {
      this.categories.set(category.name, category);
    });
  }

  analyzeCommand(command: string, args: string[] = []): CommandAnalysis {
    const fullCommand = `${command} ${args.join(' ')}`.toLowerCase().trim();
    
    // File system read operations
    if (this.matchesPatterns(fullCommand, ['ls', 'cat', 'head', 'tail', 'grep', 'find', 'locate', 'which', 'pwd', 'wc', 'file', 'stat'])) {
      return this.createAnalysis('file-system-read', 0.9, 
        ['Command performs read-only file operations'],
        ['Safe to execute without confirmation']
      );
    }

    // File system write operations
    if (this.matchesPatterns(fullCommand, ['mkdir', 'touch', 'cp', 'mv', 'ln', 'echo >', 'tee'])) {
      return this.createAnalysis('file-system-write', 0.8,
        ['Command modifies file system'],
        ['Review destination paths', 'Ensure backup if needed']
      );
    }

    // System administration
    if (this.matchesPatterns(fullCommand, ['sudo', 'su', 'rm -rf', 'chmod 777', 'chown', 'systemctl', 'service', 'mount', 'umount', 'fdisk'])) {
      return this.createAnalysis('system-admin', 0.95,
        ['Command requires elevated privileges or modifies system'],
        ['Verify command necessity', 'Check for potential system impact']
      );
    }

    // Network operations
    if (this.matchesPatterns(fullCommand, ['curl', 'wget', 'ssh', 'scp', 'rsync', 'ping', 'netstat', 'nc', 'telnet'])) {
      return this.createAnalysis('network', 0.85,
        ['Command performs network operations'],
        ['Verify destination URLs/IPs', 'Check for sensitive data transmission']
      );
    }

    // Development tools
    if (this.matchesPatterns(fullCommand, ['git', 'node', 'python', 'java', 'gcc', 'make', 'cmake', 'mvn', 'gradle'])) {
      return this.createAnalysis('development', 0.8,
        ['Command uses development tools'],
        ['Review code changes if applicable']
      );
    }

    // Package management
    if (this.matchesPatterns(fullCommand, ['npm', 'yarn', 'pip', 'apt', 'yum', 'brew', 'cargo', 'composer'])) {
      return this.createAnalysis('package-management', 0.9,
        ['Command manages packages or dependencies'],
        ['Verify package sources', 'Check for version conflicts']
      );
    }

    // Default to development category for unknown commands
    return this.createAnalysis('development', 0.3,
      ['Command not recognized, defaulting to development category'],
      ['Manual review recommended', 'Verify command safety']
    );
  }

  private matchesPatterns(command: string, patterns: string[]): boolean {
    return patterns.some(pattern => 
      command.startsWith(pattern) || 
      command.includes(` ${pattern}`) ||
      command.includes(`${pattern} `)
    );
  }

  private createAnalysis(categoryName: string, confidence: number, reasons: string[], recommendations: string[]): CommandAnalysis {
    const category = this.categories.get(categoryName);
    if (!category) {
      throw new Error(`Unknown category: ${categoryName}`);
    }

    return {
      category,
      confidence,
      reasons,
      recommendations
    };
  }

  getCategories(): CommandCategory[] {
    return Array.from(this.categories.values());
  }
}
