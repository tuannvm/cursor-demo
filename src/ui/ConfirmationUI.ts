import { CommandAnalysis } from '../command/CommandCategorizer';
import { SecurityValidationResult } from '../security/SecurityValidator';

export interface ConfirmationOptions {
  timeout?: number;
  allowSkip?: boolean;
  showDetails?: boolean;
}

export interface ConfirmationResult {
  confirmed: boolean;
  skipFuture?: boolean;
  timestamp: Date;
  userResponse: 'approved' | 'denied' | 'timeout' | 'skip';
}

export class ConfirmationUI {
  private confirmationHistory: Array<{
    command: string;
    result: ConfirmationResult;
  }> = [];

  async requestConfirmation(
    command: string,
    args: string[],
    analysis: CommandAnalysis,
    securityResult: SecurityValidationResult,
    options: ConfirmationOptions = {}
  ): Promise<ConfirmationResult> {
    const fullCommand = `${command} ${args.join(' ')}`;
    
    console.log('🤖 Terminal Command Execution Request');
    console.log('=====================================');
    console.log(`Command: ${fullCommand}`);
    console.log(`Category: ${analysis.category.name}`);
    console.log(`Risk Level: ${analysis.category.riskLevel.toUpperCase()}`);
    console.log(`Security Score: ${securityResult.score}/100`);
    
    if (options.showDetails) {
      console.log('\n📋 Analysis Details:');
      analysis.reasons.forEach(reason => console.log(`  • ${reason}`));
      
      if (securityResult.recommendations.length > 0) {
        console.log('\n⚠️  Security Recommendations:');
        securityResult.recommendations.forEach(rec => console.log(`  • ${rec}`));
      }

      console.log('\n🔍 Security Checks:');
      securityResult.checks.forEach(check => {
        const icon = check.passed ? '✅' : '❌';
        console.log(`  ${icon} ${check.name}: ${check.message}`);
      });
    }

    console.log('\n🎯 Do you want to execute this command?');
    console.log('Options: (y)es, (n)o, (d)etails, (s)kip future confirmations');

    // In a real implementation, this would show an interactive UI
    // For testing purposes, we'll simulate user interaction
    const result = await this.simulateUserInteraction(securityResult, options);
    
    // Store confirmation history
    this.confirmationHistory.push({
      command: fullCommand,
      result
    });

    return result;
  }

  private async simulateUserInteraction(
    securityResult: SecurityValidationResult,
    options: ConfirmationOptions
  ): Promise<ConfirmationResult> {
    return new Promise((resolve) => {
      // Simulate user decision based on security score
      const timeout = setTimeout(() => {
        resolve({
          confirmed: false,
          timestamp: new Date(),
          userResponse: 'timeout'
        });
      }, options.timeout || 10000);

      // Auto-approve high security score commands, deny low security score
      setTimeout(() => {
        clearTimeout(timeout);
        
        if (securityResult.score >= 90) {
          resolve({
            confirmed: true,
            timestamp: new Date(),
            userResponse: 'approved'
          });
        } else if (securityResult.score < 50) {
          resolve({
            confirmed: false,
            timestamp: new Date(),
            userResponse: 'denied'
          });
        } else {
          // Medium security - simulate user approval 70% of the time
          resolve({
            confirmed: Math.random() > 0.3,
            timestamp: new Date(),
            userResponse: Math.random() > 0.3 ? 'approved' : 'denied'
          });
        }
      }, 1000); // 1 second delay to simulate user thinking
    });
  }

  getConfirmationHistory(): Array<{ command: string; result: ConfirmationResult }> {
    return [...this.confirmationHistory];
  }

  getConfirmationStats(): {
    total: number;
    approved: number;
    denied: number;
    timeout: number;
    approvalRate: number;
  } {
    const total = this.confirmationHistory.length;
    const approved = this.confirmationHistory.filter(h => h.result.userResponse === 'approved').length;
    const denied = this.confirmationHistory.filter(h => h.result.userResponse === 'denied').length;
    const timeout = this.confirmationHistory.filter(h => h.result.userResponse === 'timeout').length;
    
    return {
      total,
      approved,
      denied,
      timeout,
      approvalRate: total > 0 ? (approved / total) * 100 : 0
    };
  }
}
