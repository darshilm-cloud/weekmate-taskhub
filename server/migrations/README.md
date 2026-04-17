# Migrations

This folder stores one-off backend data migration scripts.

## Naming

Use timestamp-prefixed filenames so execution order is clear:

- `YYYYMMDDHHmm__short_description.js`

## Notes

- Keep scripts idempotent when possible.
- Add a dry-run mode before destructive writes.
- Log summary counts (scanned, updated, skipped, failed).
