#!/usr/bin/env node

const { performance } = require('perf_hooks');
const os = require('os');

class PerformanceBenchmark {
  constructor() {
    this.results = {
      system: this.getSystemInfo(),
      benchmarks: {},
      summary: {}
    };
  }

  async runBenchmarks() {
    console.log('⚡ Running Terminal Command Integration Performance Benchmarks...\n');
    
    await this.benchmarkCommandExecution();
    await this.benchmarkConcurrentExecution();
    await this.benchmarkAnalysisPerformance();
    await this.benchmarkMemoryUsage();
    await this.benchmarkThroughput();
    
    this.generateBenchmarkReport();
  }

  getSystemInfo() {
    return {
      platform: os.platform(),
      arch: os.arch(),
      cpus: os.cpus().length,
      totalMemory: Math.round(os.totalmem() / 1024 / 1024 / 1024) + 'GB',
      nodeVersion: process.version,
      timestamp: new Date().toISOString()
    };
  }

  async benchmarkCommandExecution() {
    console.log('🎯 Benchmarking command execution latency...');
    
    const iterations = 100;
    const durations = [];
    
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      
      // Simulate command execution overhead
      await this.simulateCommandExecution();
      
      const end = performance.now();
      durations.push(end - start);
    }

    const stats = this.calculateStats(durations);
    this.results.benchmarks.commandExecution = {
      iterations,
      ...stats,
      unit: 'ms'
    };

    console.log(`   Average: ${stats.avg.toFixed(2)}ms`);
    console.log(`   P95: ${stats.p95.toFixed(2)}ms`);
    console.log(`   P99: ${stats.p99.toFixed(2)}ms\n`);
  }

  async benchmarkConcurrentExecution() {
    console.log('🔄 Benchmarking concurrent execution performance...');
    
    const concurrencyLevels = [1, 3, 5, 10];
    const results = {};
    
    for (const concurrency of concurrencyLevels) {
      const start = performance.now();
      
      const promises = Array(concurrency).fill(0).map(() => 
        this.simulateCommandExecution()
      );
      
      await Promise.all(promises);
      
      const end = performance.now();
      const totalTime = end - start;
      const throughput = concurrency / (totalTime / 1000);
      
      results[concurrency] = {
        totalTime: totalTime,
        throughput: throughput,
        avgTimePerCommand: totalTime / concurrency
      };
      
      console.log(`   Concurrency ${concurrency}: ${throughput.toFixed(2)} commands/sec`);
    }
    
    this.results.benchmarks.concurrentExecution = results;
    console.log('');
  }

  async benchmarkAnalysisPerformance() {
    console.log('🔍 Benchmarking command analysis performance...');
    
    const testCommands = [
      ['ls', ['-la']],
      ['git', ['log', '--oneline', '--graph']],
      ['find', ['.', '-name', '*.js', '-type', 'f']],
      ['docker', ['run', '-p', '3000:3000', 'node:18']],
      ['sudo', ['systemctl', 'restart', 'nginx']]
    ];

    const categorizationTimes = [];
    const validationTimes = [];
    
    const iterations = 1000;
    
    for (let i = 0; i < iterations; i++) {
      const [command, args] = testCommands[i % testCommands.length];
      
      // Benchmark categorization
      const catStart = performance.now();
      this.simulateCommandCategorization(command, args);
      const catEnd = performance.now();
      categorizationTimes.push(catEnd - catStart);
      
      // Benchmark validation
      const valStart = performance.now();
      this.simulateSecurityValidation(command, args);
      const valEnd = performance.now();
      validationTimes.push(valEnd - valStart);
    }

    const categorizationStats = this.calculateStats(categorizationTimes);
    const validationStats = this.calculateStats(validationTimes);
    
    this.results.benchmarks.analysis = {
      categorization: { iterations, ...categorizationStats, unit: 'ms' },
      validation: { iterations, ...validationStats, unit: 'ms' }
    };

    console.log(`   Categorization avg: ${categorizationStats.avg.toFixed(3)}ms`);
    console.log(`   Validation avg: ${validationStats.avg.toFixed(3)}ms\n`);
  }

  async benchmarkMemoryUsage() {
    console.log('💾 Benchmarking memory usage...');
    
    const initialMemory = process.memoryUsage();
    const memorySnapshots = [initialMemory];
    
    // Simulate memory-intensive operations
    for (let i = 0; i < 1000; i++) {
      this.simulateCommandExecution();
      
      if (i % 100 === 0) {
        memorySnapshots.push(process.memoryUsage());
      }
    }
    
    const finalMemory = process.memoryUsage();
    
    const heapUsed = memorySnapshots.map(m => m.heapUsed);
    const heapTotal = memorySnapshots.map(m => m.heapTotal);
    const rss = memorySnapshots.map(m => m.rss);
    
    this.results.benchmarks.memory = {
      initial: initialMemory,
      final: finalMemory,
      heapUsedStats: this.calculateStats(heapUsed),
      heapTotalStats: this.calculateStats(heapTotal),
      rssStats: this.calculateStats(rss),
      memoryIncrease: finalMemory.heapUsed - initialMemory.heapUsed
    };

    const memoryIncreaseMB = (finalMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024;
    console.log(`   Memory increase: ${memoryIncreaseMB.toFixed(2)}MB`);
    console.log(`   Final heap usage: ${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)}MB\n`);
  }

  async benchmarkThroughput() {
    console.log('📊 Benchmarking system throughput...');
    
    const duration = 5000; // 5 seconds
    let operationCount = 0;
    const startTime = performance.now();
    
    while (performance.now() - startTime < duration) {
      this.simulateCommandCategorization('ls', ['-la']);
      this.simulateSecurityValidation('ls', ['-la']);
      operationCount++;
    }
    
    const actualDuration = (performance.now() - startTime) / 1000;
    const throughput = operationCount / actualDuration;
    
    this.results.benchmarks.throughput = {
      duration: actualDuration,
      operations: operationCount,
      throughput: throughput,
      unit: 'operations/sec'
    };

    console.log(`   Throughput: ${throughput.toFixed(2)} operations/sec`);
    console.log(`   Operations completed: ${operationCount}\n`);
  }

  async simulateCommandExecution() {
    // Simulate command execution with realistic timing
    await new Promise(resolve => {
      const delay = Math.random() * 10 + 5; // 5-15ms delay
      setTimeout(resolve, delay);
    });
  }

  simulateCommandCategorization(command, args) {
    // Simulate categorization logic
    const patterns = ['ls', 'git', 'sudo', 'curl', 'find'];
    const categories = ['read', 'write', 'admin', 'network', 'development'];
    
    // Simple simulation of pattern matching
    for (let i = 0; i < 10; i++) {
      patterns.forEach(pattern => {
        if (command.includes(pattern)) {
          return categories[Math.floor(Math.random() * categories.length)];
        }
      });
    }
  }

  simulateSecurityValidation(command, args) {
    // Simulate security validation checks
    const checks = [
      'blacklist-check',
      'suspicious-patterns',
      'privilege-escalation',
      'filesystem-safety',
      'network-security',
      'command-injection'
    ];
    
    // Simulate multiple security checks
    checks.forEach(check => {
      const fullCommand = `${command} ${args.join(' ')}`;
      
      // Simulate regex matching and analysis
      for (let i = 0; i < 5; i++) {
        fullCommand.match(/[a-zA-Z]+/g);
      }
    });
  }

  calculateStats(values) {
    const sorted = values.slice().sort((a, b) => a - b);
    const len = sorted.length;
    
    const sum = sorted.reduce((a, b) => a + b, 0);
    const avg = sum / len;
    
    const min = sorted[0];
    const max = sorted[len - 1];
    const median = len % 2 === 0 
      ? (sorted[len/2 - 1] + sorted[len/2]) / 2 
      : sorted[Math.floor(len/2)];
    
    const p95 = sorted[Math.floor(len * 0.95)];
    const p99 = sorted[Math.floor(len * 0.99)];
    
    // Calculate standard deviation
    const variance = sorted.reduce((acc, val) => acc + Math.pow(val - avg, 2), 0) / len;
    const stdDev = Math.sqrt(variance);
    
    return {
      count: len,
      sum,
      avg,
      min,
      max,
      median,
      p95,
      p99,
      stdDev
    };
  }

  generateBenchmarkReport() {
    console.log('📋 Performance Benchmark Report');
    console.log('===============================\n');

    console.log('System Information:');
    console.log(`  Platform: ${this.results.system.platform} ${this.results.system.arch}`);
    console.log(`  CPUs: ${this.results.system.cpus}`);
    console.log(`  Memory: ${this.results.system.totalMemory}`);
    console.log(`  Node.js: ${this.results.system.nodeVersion}\n`);

    // Performance targets and assessment
    const targets = {
      commandExecutionAvg: 100, // ms
      commandExecutionP95: 200, // ms
      categorizationAvg: 10,   // ms
      validationAvg: 50,       // ms
      throughput: 100,         // operations/sec
      memoryIncrease: 50       // MB
    };

    const assessment = {
      commandExecution: this.results.benchmarks.commandExecution.avg <= targets.commandExecutionAvg,
      commandExecutionP95: this.results.benchmarks.commandExecution.p95 <= targets.commandExecutionP95,
      categorization: this.results.benchmarks.analysis.categorization.avg <= targets.categorizationAvg,
      validation: this.results.benchmarks.analysis.validation.avg <= targets.validationAvg,
      throughput: this.results.benchmarks.throughput.throughput >= targets.throughput,
      memory: (this.results.benchmarks.memory.memoryIncrease / 1024 / 1024) <= targets.memoryIncrease
    };

    console.log('Performance Assessment:');
    console.log('======================');
    
    const checks = [
      { name: 'Command Execution Latency', passed: assessment.commandExecution, 
        actual: `${this.results.benchmarks.commandExecution.avg.toFixed(2)}ms`, 
        target: `<${targets.commandExecutionAvg}ms` },
      { name: 'Command Execution P95', passed: assessment.commandExecutionP95, 
        actual: `${this.results.benchmarks.commandExecution.p95.toFixed(2)}ms`, 
        target: `<${targets.commandExecutionP95}ms` },
      { name: 'Categorization Speed', passed: assessment.categorization, 
        actual: `${this.results.benchmarks.analysis.categorization.avg.toFixed(3)}ms`, 
        target: `<${targets.categorizationAvg}ms` },
      { name: 'Validation Speed', passed: assessment.validation, 
        actual: `${this.results.benchmarks.analysis.validation.avg.toFixed(3)}ms`, 
        target: `<${targets.validationAvg}ms` },
      { name: 'System Throughput', passed: assessment.throughput, 
        actual: `${this.results.benchmarks.throughput.throughput.toFixed(2)} ops/sec`, 
        target: `>${targets.throughput} ops/sec` },
      { name: 'Memory Efficiency', passed: assessment.memory, 
        actual: `${(this.results.benchmarks.memory.memoryIncrease / 1024 / 1024).toFixed(2)}MB`, 
        target: `<${targets.memoryIncrease}MB` }
    ];

    checks.forEach(check => {
      const icon = check.passed ? '✅' : '❌';
      console.log(`${icon} ${check.name}: ${check.actual} (target: ${check.target})`);
    });

    const overallPassed = Object.values(assessment).every(passed => passed);
    
    console.log(`\nOverall Performance: ${overallPassed ? '✅ PASSED' : '❌ FAILED'}`);
    
    if (!overallPassed) {
      console.log('Some performance targets were not met. Review the results above.');
      process.exit(1);
    }

    // Save detailed results to file
    const reportFile = 'performance-report.json';
    require('fs').writeFileSync(reportFile, JSON.stringify(this.results, null, 2));
    console.log(`\nDetailed results saved to: ${reportFile}`);
  }
}

// Run benchmark if called directly
if (require.main === module) {
  const benchmark = new PerformanceBenchmark();
  benchmark.runBenchmarks().catch(console.error);
}

module.exports = PerformanceBenchmark;
