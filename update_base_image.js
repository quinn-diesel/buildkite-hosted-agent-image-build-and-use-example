#!/usr/bin/env node

/**
 * Buildkite Base Image URL Update Script
 *
 * This script updates the base image URL for a cluster queue using the
 * Buildkite GraphQL API with token authentication.
 *
 * Usage:
 *   node update_base_image_url.js <org_slug> <cluster_id> <queue_id> <image_url>
 *
 * Example:
 *   node update_base_image_url.js my-org cluster-123 queue-456 "my-registry.com/my-image:latest"
 *
 * Prerequisites:
 * - Set BUILDKITE_API_TOKEN environment variable with a token that has:
 *   - GraphQL scope enabled
 *   - Write Clusters (write_clusters) permission
 * - You must have manage_cluster permission for the specified cluster
 */

const https = require('https');
const { URL } = require('url');

// Configuration
const BUILDKITE_GRAPHQL_API_URL = 'https://graphql.buildkite.com/v1';

class BuildkiteImageUpdater {
    constructor() {
        this.apiToken = process.env.BUILDKITE_API_TOKEN;
        if (!this.apiToken) {
            throw new Error('BUILDKITE_API_TOKEN environment variable is required');
        }
    }

    async updateBaseImageUrl(orgSlug, clusterId, queueId, imageUrl) {
        try {
            console.log('🚀 Starting base image URL update via GraphQL API...');
            console.log('📦 Script Version: 2.0 (GraphQL API)');
            console.log(`Organization: ${orgSlug}`);
            console.log(`Cluster ID: ${clusterId}`);
            console.log(`Queue ID: ${queueId}`);
            console.log(`Image URL: ${imageUrl}`);

            // Step 1: Get organization ID
            console.log('\n📋 Step 1: Getting organization ID...');
            const organizationId = await this.getOrganizationId(orgSlug);

            // Step 2: Update cluster queue with new base image
            console.log('\n🔄 Step 2: Updating base image URL via GraphQL...');
            await this.updateClusterQueue(organizationId, queueId, imageUrl);

            console.log('\n✅ Base image URL updated successfully!');

        } catch (error) {
            console.error('\n❌ Error updating base image URL:', error.message);
            process.exit(1);
        }
    }

    async getOrganizationId(orgSlug) {
        const query = `
            query GetOrganization($slug: ID!) {
                organization(slug: $slug) {
                    id
                    name
                    slug
                }
            }
        `;

        const variables = { slug: orgSlug };
        const response = await this.makeGraphQLRequest(query, variables);

        if (!response.data?.organization) {
            throw new Error(`Organization "${orgSlug}" not found or not accessible`);
        }

        console.log(`✓ Found organization: ${response.data.organization.name} (${response.data.organization.id})`);
        return response.data.organization.id;
    }

    async updateClusterQueue(organizationId, queueId, imageUrl) {
        const mutation = `
            mutation UpdateClusterQueue($organizationId: ID!, $queueId: ID!, $imageUrl: String!) {
                clusterQueueUpdate(input: {
                    organizationId: $organizationId
                    id: $queueId
                    hostedAgents: {
                        platformSettings: {
                            linux: {
                                agentImageRef: $imageUrl
                            }
                        }
                    }
                }) {
                    clusterQueue {
                        id
                        name
                        hostedAgents {
                            platformSettings {
                                linux {
                                    agentImageRef
                                }
                            }
                        }
                    }
                }
            }
        `;

        const variables = {
            organizationId: organizationId,
            queueId: queueId,
            imageUrl: imageUrl
        };

        const response = await this.makeGraphQLRequest(mutation, variables);

        if (response.errors && response.errors.length > 0) {
            throw new Error(`GraphQL errors: ${response.errors.map(e => e.message).join(', ')}`);
        }

        if (!response.data?.clusterQueueUpdate?.clusterQueue) {
            throw new Error('Failed to update cluster queue - no data returned');
        }

        const updatedQueue = response.data.clusterQueueUpdate.clusterQueue;
        const newImageRef = updatedQueue.hostedAgents?.platformSettings?.linux?.agentImageRef;

        console.log(`✓ Successfully updated queue "${updatedQueue.name}" (${updatedQueue.id})`);
        console.log(`✓ New agent image reference: ${newImageRef || 'Not set'}`);

        return updatedQueue;
    }

    async makeGraphQLRequest(query, variables = {}) {
        return new Promise((resolve, reject) => {
            const url = new URL(BUILDKITE_GRAPHQL_API_URL);
            const postData = JSON.stringify({ query, variables });

            const options = {
                hostname: url.hostname,
                port: url.port || 443,
                path: url.pathname,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(postData),
                    'Authorization': `Bearer ${this.apiToken}`,
                    'User-Agent': 'Buildkite-Image-Updater/2.0'
                }
            };

            const req = https.request(options, (res) => {
                let responseData = '';

                res.on('data', (chunk) => {
                    responseData += chunk;
                });

                res.on('end', () => {
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        try {
                            const jsonResponse = JSON.parse(responseData);
                            resolve(jsonResponse);
                        } catch (parseError) {
                            reject(new Error(`Failed to parse GraphQL response: ${parseError.message}`));
                        }
                    } else {
                        reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}\nResponse: ${responseData}`));
                    }
                });
            });

            req.on('error', (error) => {
                reject(new Error(`GraphQL request failed: ${error.message}`));
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
        console.log('  - Set BUILDKITE_API_TOKEN environment variable with a token that has:');
        console.log('    * GraphQL scope enabled');
        console.log('    * Write Clusters (write_clusters) permission');
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