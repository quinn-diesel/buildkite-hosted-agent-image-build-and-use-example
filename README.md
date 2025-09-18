# Buildkite Hosted Agent Image Build and Use Example

[![Add to Buildkite](https://buildkite.com/button.svg)](https://buildkite.com/new)

This example shows how to build a custom container image in one pipeline step, and use it as the base agent image in which the next step will run with Buildkite hosted agents.

## What This Does

**Step 1: Create Custom Base Image**

- Builds a minimal Ubuntu image
- Includes the current build number in the image
- Pushes the image to a workspace container registry locally accessible to your agents
- Shows the registry URL in an annotation

**Step 2: Use Custom Base Image**

- Runs on a custom queue configured to use your built image
- Verifies it's using the correct custom image by checking the build number in the image

## Files

- `.buildkite/pipeline.yml` - Pipeline with two steps
- `.buildkite/Dockerfile.build` - Simple Ubuntu base with build number marker

## Setup Instructions

1. **Create Pipeline**: Connect this repo to a new Buildkite pipeline, use the "Add to Buildkite" button to make this easy.

2. **Create Queues**: This configuration assumes two agent queues exist:

   - `linux-arm64-small-default` - Configured to use the default hosted agent image
   - `linux-arm64-small-custom` - Will be configured to use your custom built image

3. **First Run**: Run the pipeline - the first step will succeed, but the second step will fail

4. **Configure Custom Queue**: After the first build:

   - Look for the annotation: `🚀 Image pushed to registry.example.com/base:latest`
   - Copy the registry URL (everything between the backticks)
   - Go to your Buildkite organization → Agents → Cluster → Queues → `linux-arm64-small-custom` (or whatever you named your queue)
   - Click on the 'Base Image' tab
   - Paste the registry URL into the **Image URL** field
   - Click on 'Save settings'

5. **Run Again**: The second step should now work - it will show the custom image build number marker proving it's using your built image
