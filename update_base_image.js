#!/usr/bin/env node

/**
 * Buildkite Base Image URL Update Script
 *
 * This script updates the base image URL for a cluster queue using the
 * Buildkite web interface API endpoint.
 *
 * Usage:
 *   node update_base_image_url.js <org_slug> <cluster_id> <queue_id> <image_url>
 *
 * Example:
 *   node update_base_image_url.js my-org cluster-123 queue-456 "my-registry.com/my-image:latest"
 *
 * Prerequisites:
 * - You must be logged into Buildkite in your browser
 * - You must have manage_cluster permission for the specified cluster
 * - The script will attempt to extract CSRF token from your browser session
 */

const https = require('https');
const { URL } = require('url');

// Configuration
const BUILDKITE_BASE_URL = 'https://buildkite.com';

class BuildkiteImageUpdater {
    constructor() {
        this.csrfToken = null;
        this.sessionCookies = null;
    }

    async updateBaseImageUrl(orgSlug, clusterId, queueId, imageUrl) {
        try {
            console.log('🚀 Starting base image URL update...');
            console.log(`Organization: ${orgSlug}`);
            console.log(`Cluster ID: ${clusterId}`);
            console.log(`Queue ID: ${queueId}`);
            console.log(`Image URL: ${imageUrl}`);

            // Step 1: Get CSRF token and session cookies
            console.log('\n📋 Step 1: Getting CSRF token and session...');
            await this.getSessionData(orgSlug, clusterId, queueId);

            // Step 2: Make the PATCH request
            console.log('\n🔄 Step 2: Updating base image URL...');
            await this.makeUpdateRequest(orgSlug, clusterId, queueId, imageUrl);

            console.log('\n✅ Base image URL updated successfully!');

        } catch (error) {
            console.error('\n❌ Error updating base image URL:', error.message);
            process.exit(1);
        }
    }

    async getSessionData(orgSlug, clusterId, queueId) {
        return new Promise((resolve, reject) => {
            const baseImageUrl = `${BUILDKITE_BASE_URL}/${orgSlug}/clusters/${clusterId}/queues/${queueId}/base_image`;
            const url = new URL(baseImageUrl);

            const options = {
                hostname: url.hostname,
                port: url.port || 443,
                path: url.pathname + url.search,
                method: 'GET',
                headers: {
                    'User-Agent': 'Buildkite-Image-Updater/1.0',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5',
                    'Accept-Encoding': 'gzip, deflate',
                    'Connection': 'keep-alive',
                    'Upgrade-Insecure-Requests': '1'
                }
            };

            const req = https.request(options, (res) => {
                let data = '';

                // Collect cookies from response headers
                const cookies = res.headers['set-cookie'];
                if (cookies) {
                    this.sessionCookies = cookies.map(cookie => cookie.split(';')[0]).join('; ');
                }

                res.on('data', (chunk) => {
                    data += chunk;
                });

                res.on('end', () => {
                    // Extract CSRF token from the HTML
                    const csrfMatch = data.match(/name="authenticity_token"[^>]*value="([^"]+)"/);
                    if (csrfMatch) {
                        this.csrfToken = csrfMatch[1];
                        console.log('✓ CSRF token extracted');
                        resolve();
                    } else {
                        reject(new Error('Could not find CSRF token. Make sure you are logged into Buildkite and have access to this cluster queue.'));
                    }
                });
            });

            req.on('error', (error) => {
                reject(new Error(`Failed to get session data: ${error.message}`));
            });

            req.end();
        });
    }

    async makeUpdateRequest(orgSlug, clusterId, queueId, imageUrl) {
        return new Promise((resolve, reject) => {
            const updateUrl = `${BUILDKITE_BASE_URL}/${orgSlug}/clusters/${clusterId}/queues/${queueId}/update_base_image_profile`;
            const url = new URL(updateUrl);

            // Prepare form data
            const formData = new URLSearchParams({
                'authenticity_token': this.csrfToken,
                'cluster_queue[namespace_base_image_profile_id]': '', // Clear the dropdown selection
                'cluster_queue[namespace_base_image_ref]': imageUrl,  // Set the custom URL
                'commit': 'Save settings'
            });

            const postData = formData.toString();

            const options = {
                hostname: url.hostname,
                port: url.port || 443,
                path: url.pathname,
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Content-Length': Buffer.byteLength(postData),
                    'User-Agent': 'Buildkite-Image-Updater/1.0',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5',
                    'Accept-Encoding': 'gzip, deflate',
                    'Cookie': this.sessionCookies || '',
                    'Connection': 'keep-alive',
                    'Upgrade-Insecure-Requests': '1',
                    'X-Requested-With': 'XMLHttpRequest'
                }
            };

            const req = https.request(options, (res) => {
                let responseData = '';

                res.on('data', (chunk) => {
                    responseData += chunk;
                });

                res.on('end', () => {
                    if (res.statusCode >= 200 && res.statusCode < 400) {
                        console.log(`✓ Request completed with status: ${res.statusCode}`);

                        // Check if there's a success message in the response
                        if (responseData.includes('Agent image has been updated') ||
                            responseData.includes('success') ||
                            res.statusCode === 302) { // Redirect indicates success
                            resolve();
                        } else if (responseData.includes('error') || responseData.includes('could not be updated')) {
                            reject(new Error('Server returned an error in the response'));
                        } else {
                            resolve(); // Assume success for redirects and other 2xx responses
                        }
                    } else {
                        reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
                    }
                });
            });

            req.on('error', (error) => {
                reject(new Error(`Request failed: ${error.message}`));
            });

            req.write(postData);
            req.end();
        });
    }
}

// Command line interface
async function main() {
    const args = process.argv.slice(2);

    if (args.length !== 4) {
        console.log('Usage: node update_base_image_url.js <org_slug> <cluster_id> <queue_id> <image_url>');
        console.log('');
        console.log('Example:');
        console.log('  node update_base_image_url.js my-org cluster-123 queue-456 "my-registry.com/my-image:latest"');
        console.log('');
        console.log('Prerequisites:');
        console.log('  - You must be logged into Buildkite in your browser');
        console.log('  - You must have manage_cluster permission for the specified cluster');
        process.exit(1);
    }

    const [orgSlug, clusterId, queueId, imageUrl] = args;

    // Validate image URL format
    if (!imageUrl || imageUrl.trim().length === 0) {
        console.error('❌ Error: Image URL cannot be empty');
        process.exit(1);
    }

    const updater = new BuildkiteImageUpdater();
    await updater.updateBaseImageUrl(orgSlug, clusterId, queueId, imageUrl);
}

// Handle clipboard functionality for image URL
function getClipboardText() {
    const { execSync } = require('child_process');
    try {
        // Try to get clipboard content (works on macOS)
        const clipboardText = execSync('pbpaste', { encoding: 'utf8' }).trim();
        return clipboardText;
    } catch (error) {
        return null;
    }
}

// Enhanced CLI with clipboard support
if (require.main === module) {
    // Check if user wants to use clipboard
    const args = process.argv.slice(2);

    if (args.length === 3 && args.includes('--clipboard')) {
        const clipboardText = getClipboardText();
        if (clipboardText) {
            const nonClipboardArgs = args.filter(arg => arg !== '--clipboard');
            console.log(`📋 Using clipboard text as image URL: ${clipboardText}`);
            main(...nonClipboardArgs, clipboardText);
        } else {
            console.error('❌ Could not read from clipboard');
            process.exit(1);
        }
    } else if (args.length === 3) {
        // Prompt user if they want to use clipboard
        const clipboardText = getClipboardText();
        if (clipboardText) {
            console.log(`📋 Clipboard contains: ${clipboardText}`);
            console.log('Use this as the image URL? (y/n)');

            process.stdin.setRawMode(true);
            process.stdin.resume();
            process.stdin.on('data', (key) => {
                if (key.toString() === 'y' || key.toString() === 'Y') {
                    console.log('\n✓ Using clipboard text');
                    main(...args, clipboardText);
                } else if (key.toString() === 'n' || key.toString() === 'N') {
                    console.log('\n❌ Please provide the image URL as the 4th argument');
                    process.exit(1);
                } else if (key.toString() === '\u0003') { // Ctrl+C
                    process.exit(1);
                }
            });
        } else {
            main();
        }
    } else {
        main();
    }
}

module.exports = BuildkiteImageUpdater;