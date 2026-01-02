#!/usr/bin/env node

/**
 * Console Migration Script
 * 
 * This script helps identify files that need to be migrated from
 * console.log/error/warn to secureLog equivalents.
 * 
 * Usage:
 *   node scripts/find-console-usage.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Directories to scan
const SCAN_DIRS = [
    'src/pages',
    'src/components',
    'src/services',
    'src/utils',
    'src/hooks',
    'src/contexts'
];

// Files to exclude
const EXCLUDE_FILES = [
    'secureLogger.ts',
    'errorLogger.ts',
    'errorInterceptor.ts'
];

// Console methods to find
const CONSOLE_METHODS = [
    'console.log',
    'console.error',
    'console.warn',
    'console.debug',
    'console.info',
    'console.table',
    'console.group',
    'console.groupEnd',
    'console.groupCollapsed'
];

// Results storage
const results = {
    totalFiles: 0,
    filesWithConsole: 0,
    totalOccurrences: 0,
    fileDetails: []
};

/**
 * Recursively scan directory for files
 */
function scanDirectory(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
            // Skip node_modules and build directories
            if (!['node_modules', 'dist', 'build', '.git'].includes(entry.name)) {
                scanDirectory(fullPath);
            }
        } else if (entry.isFile()) {
            // Only scan TypeScript/JavaScript files
            if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) {
                // Skip excluded files
                if (!EXCLUDE_FILES.includes(entry.name)) {
                    scanFile(fullPath);
                }
            }
        }
    }
}

/**
 * Scan a file for console usage
 */
function scanFile(filePath) {
    results.totalFiles++;

    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const occurrences = [];

    lines.forEach((line, index) => {
        CONSOLE_METHODS.forEach(method => {
            if (line.includes(method)) {
                occurrences.push({
                    line: index + 1,
                    method,
                    content: line.trim()
                });
            }
        });
    });

    if (occurrences.length > 0) {
        results.filesWithConsole++;
        results.totalOccurrences += occurrences.length;
        results.fileDetails.push({
            file: filePath,
            count: occurrences.length,
            occurrences
        });
    }
}

/**
 * Print results
 */
function printResults() {
    console.log('\n' + '='.repeat(80));
    console.log('CONSOLE USAGE REPORT');
    console.log('='.repeat(80) + '\n');

    console.log(`Total files scanned: ${results.totalFiles}`);
    console.log(`Files with console statements: ${results.filesWithConsole}`);
    console.log(`Total console occurrences: ${results.totalOccurrences}\n`);

    if (results.filesWithConsole === 0) {
        console.log('✅ No console statements found! All files are using secure logging.\n');
        return;
    }

    console.log('Files that need migration:\n');

    // Sort by number of occurrences (descending)
    results.fileDetails.sort((a, b) => b.count - a.count);

    results.fileDetails.forEach((file, index) => {
        console.log(`${index + 1}. ${file.file} (${file.count} occurrence${file.count > 1 ? 's' : ''})`);

        // Show first 3 occurrences
        const preview = file.occurrences.slice(0, 3);
        preview.forEach(occ => {
            console.log(`   Line ${occ.line}: ${occ.content.substring(0, 80)}${occ.content.length > 80 ? '...' : ''}`);
        });

        if (file.occurrences.length > 3) {
            console.log(`   ... and ${file.occurrences.length - 3} more`);
        }
        console.log('');
    });

    console.log('='.repeat(80));
    console.log('MIGRATION GUIDE');
    console.log('='.repeat(80) + '\n');

    console.log('Replace console methods with secureLog:');
    console.log('  console.log    → secureLog.info');
    console.log('  console.error  → secureLog.error');
    console.log('  console.warn   → secureLog.warn');
    console.log('  console.debug  → secureLog.debug');
    console.log('  console.table  → secureLog.table');
    console.log('  console.group  → secureLog.group');
    console.log('');
    console.log('Import statement:');
    console.log('  import { secureLog } from \'../utils/secureLogger\';');
    console.log('');
    console.log('See docs/SECURE_LOGGING.md for detailed migration guide.\n');
}

/**
 * Main execution
 */
function main() {
    console.log('Scanning for console usage...\n');

    const projectRoot = path.join(__dirname, '..');

    // Scan each directory
    SCAN_DIRS.forEach(dir => {
        const fullPath = path.join(projectRoot, dir);
        if (fs.existsSync(fullPath)) {
            scanDirectory(fullPath);
        }
    });

    printResults();
}

// Run the script
main();
