# Deployment Checklist

## Environment Variables
- [ ] SENTRY_DSN set (not empty)
- [ ] SENTRY_ENVIRONMENT set to "production"
- [ ] SENTRY_TRACES_SAMPLE_RATE set (start with 0.1)
- [ ] REDIS_URL points to production Redis
- [ ] NEXT_PUBLIC_API_URL points to production API

## Security
- [ ] SENTRY_DSN not committed to git
- [ ] .env not committed to git
- [ ] debug-sentry endpoint removed from production
- [ ] No hardcoded secrets in any file

## Services
- [ ] API health check passes: GET /health
- [ ] Redis reachable
- [ ] Caddy configured with real domain
- [ ] HTTPS working via Caddy

## Data Providers
- [ ] postcodes.io reachable from production
- [ ] data.police.uk reachable from production
- [ ] environment.data.gov.uk reachable from production
- [ ] planning.data.gov.uk reachable from production

## Smoke Tests
- [ ] GET / returns 200
- [ ] GET /health returns status ok
- [ ] GET /area/CH14AB returns area data
- [ ] GET /crime/CH14AB returns crime summary
- [ ] GET /flood/CH14AB returns flood data
- [ ] GET /report/CH14AB returns full report
- [ ] Web: homepage loads
- [ ] Web: report page renders for CH1 4AB
