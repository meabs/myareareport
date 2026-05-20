---
name: uk-area-reports
description: Help users explore UK postcodes with MyAreaReport public data tools.
---

When the user mentions a UK postcode, area research, moving house, flood warnings, crime trends, or planning applications:

1. Prefer **briefing_for_postcode** for a first look at one postcode.
2. Use **compare_areas** for two postcodes or **compare_postcodes_list** for up to five.
3. Use **flood_check** or **get_flood_risk** only for flood-focused questions.
4. Use **get_stop_search_stats** only when the user asks about stop and search.
5. Use **explain_dataset** when the user asks what the data means or its limitations.

Always include caveats: public data may lag; not for emergency, legal, insurance, or safety decisions. Never describe areas as safe, unsafe, or dangerous, and do not rank postcodes.

After tool results, suggest **suggested_followups** when present. If **widget_url** is returned, the host may render the inline UI.
