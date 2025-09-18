# Buildkite Hosted Agent Image Build and Use Example

[![Add to Buildkite](https://buildkite.com/button.svg)](https://buildkite.com/new)

This repository demonstrates how to build a custom Docker image in Buildkite and use it in subsequent pipeline steps with hosted agents.

## Pipeline Overview

The pipeline consists of two main steps:

1. **Build Base Image**: Creates a custom Docker image with Node.js and development tools
2. **Use Base Image**: Runs commands using the newly built image on hosted agents

## Files

- `.buildkite/pipeline.yml` - Main pipeline configuration
- `.buildkite/Dockerfile.build` - Dockerfile for the base image
- `package.json` - Sample Node.js application
- `src/index.js` - Sample application code

## Setup Requirements

1. **Buildkite Organization**: Ensure you have access to Buildkite hosted agents
2. **Container Registry**: The pipeline uses `nsc workspace describe` to get registry URL
3. **Agent Queues**: 
   - `linux-arm64-small-default` - For building the image
   - `linux-arm64-small-custom` - For using the custom image

## Pipeline Steps

### Step 1: Build Base Image
- Runs on the default agent queue
- Builds a multi-platform Docker image (AMD64/ARM64)
- Pushes to the workspace container registry
- Adds a success annotation

### Step 2: Use Custom Image
- Depends on the base image build step
- Runs on agents using the custom image queue
- Demonstrates that the custom tools are available

## Running the Pipeline

1. Connect this repository to your Buildkite pipeline
2. Set the pipeline configuration to use `.buildkite/pipeline.yml`
3. Trigger a build

The pipeline will automatically build your custom image and use it in the next step.

## Customization

Modify `.buildkite/Dockerfile.build` to include your specific dependencies and tools. The image will be available for use in subsequent pipeline steps.
