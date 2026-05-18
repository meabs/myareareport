# Demo Script

## Purpose
A walkthrough for demonstrating MyAreaReport to a reviewer or user.

## Duration
~3 minutes

## Steps

### 1. Homepage
- Open http://localhost:3000
- Show postcode search input
- Describe: "Enter any UK postcode to get a public data report."

### 2. Area Report — Chester
- Enter: CH1 4AB
- Submit
- Walk through each card:
  - Area Summary: location details from postcodes.io
  - Crime: 12-month reported crime summary from police.uk
  - Flood: current warnings and river station levels from Environment Agency
  - Planning: nearby applications from planning.data.gov.uk
- Point to sources footer

### 3. API
- Open http://localhost:8000/docs
- Show GET /report/{postcode}
- Run with CH1 4AB
- Show structured JSON response

### 4. MCP Tools (if applicable)
- Call get_area_summary with postcode CH1 4AB
- Call compare_areas with CH1 4AB and M1 1AA

### 5. Fragment Demo
- Open http://localhost:3000/demo
- Show compact fragments suitable for embedded use

## Key Points to Emphasise
- All data is from public sources
- No user accounts or tracking
- Deterministic summaries — no LLM
- Graceful degradation when providers are unavailable
- Caveats visible throughout
