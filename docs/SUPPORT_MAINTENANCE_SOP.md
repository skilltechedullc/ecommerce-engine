# Support And Maintenance SOP

Use this after launch for client support and monthly maintenance.

## Regular Checks

- Review failed checkouts, failed emails, failed webhooks, and API errors.
- Confirm backups or exports are available.
- Check low-stock and catalog issues reported by the client.
- Apply dependency/security updates in a local branch first.
- Test checkout and admin flows before production deploys.

## Change Requests

- Small copy/product guidance can be included in maintenance if the plan allows it.
- New modules, payment changes, courier integrations, major design changes, bulk catalog cleanup, and custom reports should be quoted separately.
- Keep client-owned credentials in the client account, not in shared personal accounts.

## Incident Response

- Confirm the problem with exact page, order ID, timestamp, and customer impact.
- Check payment/webhook/email/provider dashboards.
- Preserve logs before changing code or data.
- Fix locally or in staging first when possible.
- Report what happened, what was fixed, and what monitoring is needed after the fix.
