# Generate Prisma client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate

# Build the project
npm run build

# Ensure environment variables are set
if (-not (Test-Path .env)) {
    Write-Error "Missing .env file"
    exit 1
}

# Deploy to Cloudflare Workers
wrangler publish
