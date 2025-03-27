#!/usr/bin/env node
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Check if required environment variables are set
const requiredEnvVars = [
  'CLOUDFLARE_ACCOUNT_ID',
  'CLOUDFLARE_ACCESS_KEY_ID',
  'CLOUDFLARE_SECRET_ACCESS_KEY',
  'CLOUDFLARE_R2_BUCKET',
  'DATABASE_URL'
];

const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error('Error: The following environment variables are missing:');
  missingEnvVars.forEach(envVar => console.error(`- ${envVar}`));
  console.error('Please set these variables in your .env file or environment before deploying.');
  process.exit(1);
}

console.log('Building the application...');
try {
  execSync('npm run build', { stdio: 'inherit' });
} catch (error) {
  console.error('Build failed:', error.message);
  process.exit(1);
}

console.log('Deploying to Cloudflare Workers...');
try {
  // Deploy using wrangler
  execSync('wrangler deploy', { stdio: 'inherit' });
  
  console.log('\n✅ Deployment completed successfully!');
  console.log('\nYour application is now available at:');
  console.log(`https://video-upload-system.${process.env.CLOUDFLARE_ACCOUNT_ID}.workers.dev`);
  
  console.log('\nTo use your custom domain, configure it in the Cloudflare dashboard.');
} catch (error) {
  console.error('Deployment failed:', error.message);
  console.error('\nTroubleshooting tips:');
  console.error('1. Make sure you are logged in to Cloudflare (run "wrangler login")');
  console.error('2. Check your wrangler.toml configuration');
  console.error('3. Verify your Cloudflare account has Workers enabled');
  process.exit(1);
}
