import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

// Find all test files
const testFiles = execSync('find src -name "*.spec.ts" -o -name "*.test.ts"', { encoding: 'utf-8' })
  .split('\n')
  .filter(Boolean);

console.log(`${colors.blue}${colors.bright}📊 DETAILED TEST ANALYSIS${colors.reset}\n`);
console.log(`${colors.yellow}${'='.repeat(80)}${colors.reset}\n`);

testFiles.forEach(testFile => {
  const content = fs.readFileSync(testFile, 'utf-8');
  
  console.log(`${colors.cyan}${colors.bright}📁 ${testFile}${colors.reset}`);
  
  // Extract describe blocks
  const describeMatches = content.matchAll(/describe\(['"`](.*?)['"`]/g);
  for (const describeMatch of describeMatches) {
    const describeName = describeMatch[1];
    console.log(`\n  ${colors.yellow}📦 ${describeName}${colors.reset}`);
    
    // Extract it blocks and their content
    const itRegex = /it\(['"`](.*?)['"`][\s\S]*?\{([\s\S]*?)\}\s*\)/g;
    const itMatches = content.matchAll(itRegex);
    
    for (const itMatch of itMatches) {
      const testName = itMatch[1];
      const testBody = itMatch[2];
      
      console.log(`\n    ${colors.green}✓ ${testName}${colors.reset}`);
      
      // Extract expectations
      const expectMatches = testBody.matchAll(/expect\((.*?)\)\.(.*?)\((.*?)\)/g);
      let expectCount = 0;
      
      for (const expectMatch of expectMatches) {
        expectCount++;
        const actual = expectMatch[1].trim();
        const matcher = expectMatch[2].trim();
        const expected = expectMatch[3].trim();
        
        console.log(`      ${colors.gray}Expectation ${expectCount}:${colors.reset}`);
        console.log(`        ${colors.gray}Checking: ${actual}${colors.reset}`);
        console.log(`        ${colors.gray}Matcher: ${matcher}${colors.reset}`);
        console.log(`        ${colors.gray}Expected: ${expected}${colors.reset}`);
      }
      
      // Extract mock setups
      const mockMatches = testBody.matchAll(/mock(?:Resolved|Rejected)?Value\((.*?)\)/g);
      for (const mockMatch of mockMatches) {
        console.log(`      ${colors.gray}Mock: Returns ${mockMatch[1].substring(0, 50)}...${colors.reset}`);
      }
    }
  }
  
  console.log(`\n${colors.yellow}${'-'.repeat(80)}${colors.reset}\n`);
});

// Now run the actual tests and show results
console.log(`${colors.blue}${colors.bright}\n🏃 RUNNING TESTS...${colors.reset}\n`);

try {
  const output = execSync('npm run test:ci -- --reporter=verbose', { 
    encoding: 'utf-8',
    stdio: 'pipe' 
  });
  console.log(output);
} catch (error: any) {
  // Tests failed, but we still want to show the output
  if (error.stdout) {
    console.log(error.stdout);
  }
  if (error.stderr) {
    console.error(colors.red + error.stderr + colors.reset);
  }
}