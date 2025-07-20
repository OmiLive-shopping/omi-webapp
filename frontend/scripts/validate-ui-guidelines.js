#!/usr/bin/env node

/**
 * UI Guidelines Validation Script
 * Ensures no component libraries are used in the project
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Prohibited packages
const PROHIBITED_PACKAGES = [
  '@mui/material',
  '@bolt/ui',
  'antd',
  '@chakra-ui/react',
  'react-bootstrap',
  '@headlessui/react',
  '@radix-ui/react',
  '@mantine/core',
  'semantic-ui-react',
  'primereact',
  '@arco-design/web-react',
  'element-plus',
  '@fluentui/react',
  'reactstrap',
  '@nextui-org/react',
  '@tremor/react',
  '@geist-ui/react',
  'baseui',
  'grommet',
  '@blueprintjs/core'
];

// Prohibited import patterns
const PROHIBITED_PATTERNS = [
  /@mui\//,
  /@bolt\//,
  /^antd/,
  /@chakra-ui\//,
  /^react-bootstrap/,
  /@headlessui\//,
  /@radix-ui\//,
  /@mantine\//,
  /^semantic-ui-react/,
  /^primereact/,
  /@arco-design\//,
  /^element-plus/,
  /@fluentui\//,
  /^reactstrap/,
  /@nextui-org\//,
  /@tremor\//,
  /@geist-ui\//,
  /^baseui/,
  /^grommet/,
  /@blueprintjs\//
];

let hasErrors = false;

console.log('🔍 Validating UI Guidelines...\n');

// Check package.json dependencies
console.log('📦 Checking package.json for prohibited dependencies...');
try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const allDeps = {
    ...packageJson.dependencies || {},
    ...packageJson.devDependencies || {}
  };

  for (const pkg of PROHIBITED_PACKAGES) {
    if (allDeps[pkg]) {
      console.error(`❌ Found prohibited package: ${pkg}`);
      hasErrors = true;
    }
  }

  if (!hasErrors) {
    console.log('✅ No prohibited packages in package.json\n');
  } else {
    console.log('');
  }
} catch (error) {
  console.error('❌ Error reading package.json:', error.message);
  hasErrors = true;
}

// Function to recursively find all source files
function findSourceFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      if (!file.includes('node_modules') && !file.includes('dist')) {
        findSourceFiles(filePath, fileList);
      }
    } else if (/\.(js|jsx|ts|tsx)$/.test(file)) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

// Check import statements in source files
console.log('📄 Checking source files for prohibited imports...');
const srcDir = path.join(process.cwd(), 'src');
const sourceFiles = fs.existsSync(srcDir) ? findSourceFiles(srcDir) : [];

let fileErrors = 0;

sourceFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  
  lines.forEach((line, index) => {
    // Check for import statements
    if (line.includes('import') && (line.includes('from') || line.includes('}'))) {
      for (const pattern of PROHIBITED_PATTERNS) {
        if (pattern.test(line)) {
          if (fileErrors === 0) {
            console.log('');
          }
          console.error(`❌ ${file}:${index + 1}`);
          console.error(`   ${line.trim()}`);
          console.error(`   Use Tailwind CSS instead!`);
          fileErrors++;
          hasErrors = true;
          break;
        }
      }
    }
  });
});

if (fileErrors === 0) {
  console.log('✅ No prohibited imports found in source files\n');
} else {
  console.log(`\n🚫 Found ${fileErrors} prohibited import(s)\n`);
}

// Check for approved technologies
console.log('✅ Approved UI Technologies:');
console.log('   • Tailwind CSS - for all styling');
console.log('   • Lucide React - for icons');
console.log('   • clsx - for conditional classes');
console.log('   • Custom React components with Tailwind\n');

// Final result
if (hasErrors) {
  console.error('❌ UI Guidelines validation FAILED!');
  console.error('📖 See .taskmaster/docs/ui-guidelines.md for approved patterns\n');
  process.exit(1);
} else {
  console.log('✅ UI Guidelines validation PASSED!');
  console.log('🎉 All UI code follows Tailwind CSS guidelines\n');
  process.exit(0);
}