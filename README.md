# Buildkite Hosted Agent Image Build and Use Example

[![Add to Buildkite](https://buildkite.com/button.svg)](https://buildkite.com/new)

This example shows how to build a custom Docker image in one pipeline step and use it in the next step with Buildkite hosted agents.

## What This Does

**Step 1: Create Custom Base Image**
- Builds a minimal Ubuntu image with custom verification markers
- Includes the current build number in the image
- Pushes to your workspace container registry
- Shows the registry URL in an annotation

**Step 2: Use Custom Base Image**  
- Runs on a custom queue configured to use your built image
- Verifies it's using the correct custom image by checking the markers

## Files

- `.buildkite/pipeline.yml` - Pipeline with two steps
- `.buildkite/Dockerfile.build` - Simple Ubuntu base with verification markers

## Setup Instructions

1. **Create Pipeline**: Connect this repo to a new Buildkite pipeline using `.buildkite/pipeline.yml`

2. **Create Queues**: You need two agent queues:
   - `linux-arm64-small-default` - Uses the default image for building
   - `linux-arm64-small-custom` - Will use your custom image

3. **First Run**: Run the pipeline - the first step will succeed, but the second step will likely fail

4. **Configure Custom Queue**: After the first successful build:
   - Look for the annotation: `🚀 Image pushed to registry.example.com/base:latest 🚀`
   - Copy the registry URL (everything between the backticks)
   - Go to your Buildkite organization → Queues → `linux-arm64-small-custom`
   - Paste the registry URL into the **Image URL** field
   - Save the queue configuration

5. **Run Again**: The second step should now work - it will show the custom image markers proving it's using your built image

## Adding Your Own Tools

Edit `.buildkite/Dockerfile.build` to install whatever tools you need. The pipeline will build and use your customized image automatically.
