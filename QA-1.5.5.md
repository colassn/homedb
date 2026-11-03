# 1.5.5 candidate — not released

Changes: restore the 1.5.4 patch, then constrain display mode to its viewport; use portrait/landscape grids; show memo summaries with the full-list control; reserve seconds width; retain clock nodes across minute changes; avoid unchanged root appearance writes. Firebase rules and record schemas are unchanged.

Verified in Chrome through the supported browser UI:
- 393×750, 360×640, 844×390, 834×1194, 1194×834 iframe viewport layouts have no document overflow or card-container clipping in the tested fixture (five long memos).
- 360×640 with three warning icons/texts initially failed; warning row sizing corrected and retested with no clipping.
- Display ↔ tools navigation works on the unmodified application entry point with real fetched weather.
- Syntax checks and all 28 existing tests pass; build passes.
- Fixture emits cloudchange every 60 seconds and measures root/clock identity and panel geometry once per second. A separate weather-refresh control changes the weather timestamp. No root/clock replacement or unrequested geometry shift was observed during the recorded run. This is not a real Firebase two-device integration test.

Not accepted / release blockers:
- Chrome test environment rejects requestFullscreen; failure feedback works, successful enter/exit remains unverified.
- Xiaomi and iPad hardware/browser testing is unavailable.
- User reports Firebase synchronization now works; live paired-device regression was not independently run.
- No claim that every browser, font enlargement or arbitrary warning count fits.

Reproduce the layout fixture after build: python3 qa/make-display-fixture.py; restart the managed preview; open qa-display.html. Fixture code replaces initial records/weather only in qa-app.mjs on the isolated preview origin. It is excluded from distribution by the next build. Do not deploy fixture output.

User requires all verification before delivery. Do not deploy or provide a release patch until remaining acceptance gaps are resolved or the user explicitly changes acceptance scope.

Final continuous fixture observation: 127 seconds, two 60-second cloudchange cycles, 0 root/clock replacements, 0 panel shifts, no page overflow and no container clipping at 360×640 with three weather warnings. Includes real clock 40–45 second intervals and minute boundaries. This measures geometry/identity, not all possible compositor flicker.
