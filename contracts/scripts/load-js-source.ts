import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Helper utility to load JavaScript source code from file
 * Used by deployment scripts and tests to load Chainlink Functions JS source
 */

export function loadJsSource(): string {
  // Path to the JavaScript source file relative to the contracts directory
  const jsSourcePath = path.join(__dirname, '../../backend/chainlink-functions/flight-delay-status.js');
  
  try {
    const jsSource = fs.readFileSync(jsSourcePath, 'utf8');
    
    // Validate that the source contains expected elements
    if (!jsSource.includes('Functions.makeHttpRequest')) {
      throw new Error('JS source does not contain expected Functions.makeHttpRequest');
    }
    
    if (!jsSource.includes('Functions.encodeUint256')) {
      throw new Error('JS source does not contain expected Functions.encodeUint256');
    }
    
    console.log(`✅ Loaded JS source from ${jsSourcePath} (${jsSource.length} characters)`);
    return jsSource;
    
  } catch (error) {
    if (error instanceof Error && error.message.includes('ENOENT')) {
      throw new Error(`JS source file not found at ${jsSourcePath}. Please ensure the file exists.`);
    }
    throw error;
  }
}

/**
 * Validate that the loaded JS source matches expected structure
 */
export function validateJsSource(jsSource: string): boolean {
  const requiredElements = [
    'const flightNumber = args[0]',
    'const date = args[1]',
    'Functions.makeHttpRequest',
    'Functions.encodeUint256',
    'isDelayed ? 1 : 0'
  ];
  
  for (const element of requiredElements) {
    if (!jsSource.includes(element)) {
      console.error(`❌ JS source validation failed: missing "${element}"`);
      return false;
    }
  }
  
  console.log('✅ JS source validation passed');
  return true;
}

/**
 * Load and validate JS source in one call
 */
export function loadAndValidateJsSource(): string {
  const jsSource = loadJsSource();
  validateJsSource(jsSource);
  return jsSource;
}
