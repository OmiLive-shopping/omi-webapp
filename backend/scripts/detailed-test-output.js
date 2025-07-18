#!/usr/bin/env node

const { execSync } = require('child_process');
const chalk = require('chalk');

// Run tests with JSON reporter to get detailed output
console.log(chalk.blue.bold('\n📊 Running tests with detailed output...\n'));

try {
  // Run vitest with json reporter
  execSync('npx vitest run --reporter=json --outputFile=test-results.json', {
    stdio: 'pipe',
  });
} catch (error) {
  // Tests might fail, but we still want to process the results
}

// Read and parse the results
const fs = require('fs');
const results = JSON.parse(fs.readFileSync('test-results.json', 'utf8'));

// Display detailed results
console.log(chalk.yellow.bold('\n' + '='.repeat(80)));
console.log(chalk.yellow.bold('TEST RESULTS SUMMARY'));
console.log(chalk.yellow.bold('='.repeat(80) + '\n'));

results.testResults.forEach(file => {
  console.log(chalk.cyan.bold(`\n📁 ${file.name}`));
  console.log(chalk.gray(`   Duration: ${file.duration}ms`));
  console.log(chalk.gray(`   Status: ${file.status}`));
  
  if (file.assertionResults) {
    file.assertionResults.forEach((test, index) => {
      const icon = test.status === 'passed' ? '✅' : '❌';
      const color = test.status === 'passed' ? chalk.green : chalk.red;
      
      console.log(`\n   ${icon} ${color.bold(test.title)}`);
      console.log(chalk.gray(`      Full Name: ${test.fullName}`));
      console.log(chalk.gray(`      Duration: ${test.duration}ms`));
      console.log(chalk.gray(`      Status: ${test.status}`));
      
      if (test.failureMessages && test.failureMessages.length > 0) {
        console.log(chalk.red(`      ❌ Error:`));
        test.failureMessages.forEach(msg => {
          console.log(chalk.red(`         ${msg}`));
        });
      }
      
      if (test.ancestorTitles && test.ancestorTitles.length > 0) {
        console.log(chalk.gray(`      Test Path: ${test.ancestorTitles.join(' > ')}`));
      }
    });
  }
});

// Summary
console.log(chalk.yellow.bold('\n' + '='.repeat(80)));
console.log(chalk.yellow.bold('SUMMARY'));
console.log(chalk.yellow.bold('='.repeat(80)));

const summary = results.success ? chalk.green.bold('✅ All tests passed!') : chalk.red.bold('❌ Some tests failed!');
console.log(`\n${summary}`);
console.log(`Total Test Suites: ${results.numTotalTestSuites}`);
console.log(`Passed: ${chalk.green(results.numPassedTestSuites)}`);
console.log(`Failed: ${chalk.red(results.numFailedTestSuites)}`);
console.log(`Total Tests: ${results.numTotalTests}`);
console.log(`Passed: ${chalk.green(results.numPassedTests)}`);
console.log(`Failed: ${chalk.red(results.numFailedTests)}`);
console.log(`Duration: ${results.startTime ? new Date(results.testResults[results.testResults.length - 1].endTime - results.startTime).getTime() : 0}ms\n`);

// Clean up
fs.unlinkSync('test-results.json');