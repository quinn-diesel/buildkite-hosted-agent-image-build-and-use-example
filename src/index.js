#!/usr/bin/env node

/**
 * Sample Node.js application for Buildkite hosted agent example
 */

console.log('🚀 Hello from Buildkite Hosted Agent!');
console.log(`Node.js version: ${process.version}`);
console.log(`Platform: ${process.platform}`);
console.log(`Architecture: ${process.arch}`);

const packageInfo = require('../package.json');
console.log(`Application: ${packageInfo.name} v${packageInfo.version}`);

console.log('✅ Application running successfully in custom Docker image!');
