# Mobile retreats V7

Ten original AI-generated portrait nature backgrounds, 1086 x 1448 (3:4), with ten authored furniture contacts per scene. Four selectable existing 3D companions are preserved. Hammocks, loungers and paddleboards use lying poses; chairs and benches use sitting poses. Double benches have two separate positions.

## Local review

http://127.0.0.1:4177/engine?clip=IMG_0575&room=pine_001&loungePreview=10

The `loungePreview` query shows ten virtual guests and does not connect to Firebase. Remove that query to use real occupancy and chat. The scene selector offers all ten themes. Previous/next retains the current theme; full rooms advance to the next available room. Old shared room links map to corresponding new scenes.

## Mobile layout

The complete photo remains visible using a matching contain camera. Numbered 30px tags are spread to avoid overlap; the seat dialog provides larger targets and full names. Chat opens in a drawer. Landscape and desktop use the same full portrait composition. Assets total 6.33 MiB; each scene loads only its own WebP.

## Verification

- npm run check: syntax, four character pose/idle convergence, 100 furniture anchors, 5 field shapes (320, 360, 390, 430 and landscape), image/camera bounds, marker separation, legacy routing, public asset references and deployment secret scan passed.
- Browser: all ten themes rendered with ten virtual companions; actual viewport widths 358px and 323px had no horizontal overflow. Seat list and chat drawer verified. Screenshot contact sheet is in test-lab/04-results/mobile-retreats-v7/phone-ten-scenes.png outside this worktree.
- Firebase: gcloud reported billingEnabled=False. Added jejumungV7 rules to the previously approved Spark project projecthub-97b64, preserving V5/V6 rules/data. Live isolated pine_998 tests admitted ten distinct authenticated users, denied an eleventh occupied-seat takeover and s10, verified atomic claims, owner protection, chat membership/rate protection and stale-seat handling. Test records/users were cleaned up.
- Browser actual Firebase join to pine_997 and selection of the tenth seat verified. Final browser chat-send check was interrupted by browser tool timeouts; the live REST chat rules test passed. No claim of ten simultaneous browser/WebGL sessions.

## Release status

Feature isolated on branch mobile-retreats-v7 based on 45808a9. Other ongoing map/music/main-checkout changes were preserved. No GitHub push or Vercel deployment was performed. Current Vercel project belongs to a Pro team; remaining included usage/overage conditions have not been verified, so the standing no-additional-charge rule prevents an automatic publish.

## Sources

Ten built-in image-generation outputs, with full original prompts recorded in mobile-retreats-v7-sources.json. Runtime photos: dist/assets/mobile-retreats-v7. Original PNGs and the source manifest remain in test-lab/03-analysis/mobile-retreats-v7 outside this worktree. No external image API was called. Seat coordinates: dist/mobile-retreats.js. Tests: tools/check-mobile-retreats.mjs and tools/test-mobile-retreat-rules.mjs.
