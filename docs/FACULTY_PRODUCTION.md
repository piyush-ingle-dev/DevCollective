# Faculty Module — Production Checklist

## Access model

Admin invitation -> invited email verification -> faculty profile submission -> admin approval -> active faculty access.

Faculty role is never self-selected from public student registration.

Faculty invitations accept any syntactically valid email because invitation + verified invited email + admin approval is the authorization chain.

## Production data

- `devcollective_profiles`: identity, role and account status.
- `devcollective_faculty_profiles`: professional faculty data, approval state and availability.
- `devcollective_faculty_invitations`: one-time hashed invitation tokens and expiry.
- `devcollective_faculty_mentoring_requests`: student-to-faculty mentoring requests.
- `devcollective_faculty_audit_log`: invitation, registration, approval, suspension and mentoring audit events.

## Production controls

- Pending invitations expire after 7 days.
- Only one pending invitation is allowed per email.
- Invitation creation is rate-limited to 20 per admin per hour.
- Resending revokes the previous pending token and creates a new token.
- Directory visibility requires both faculty approval and an active account.
- Suspended/rejected faculty are excluded from the public directory.
- Faculty profile edits require an active faculty account.
- Mentoring requests require an active student/member and an approved active faculty recipient.
- Faculty audit history is server-only through the admin API.
- Service-role grants are versioned in migrations.

## Release test matrix

1. Create invitation with a normal faculty email.
2. Create invitation with a temporary test email.
3. Verify the invited email through Clerk.
4. Complete faculty profile.
5. Confirm pending access is blocked.
6. Confirm admin sees the pending faculty record.
7. Approve the faculty account.
8. Confirm the approved faculty can enter the workspace.
9. Confirm FACULTY directory shows the approved profile.
10. Open the faculty profile.
11. Edit subjects, expertise, mentoring areas and availability.
12. Confirm directory reflects the updated data.
13. From a student account, send a mentoring request.
14. Confirm faculty receives the request and can accept/decline it.
15. Confirm messaging opens for the faculty member.
16. Suspend the faculty account and confirm workspace/directory access is blocked.
17. Reinstate the faculty account and confirm access returns.
18. Revoke a pending invitation and confirm the link no longer works.
19. Resend a pending invitation and confirm the old token is invalid.
20. Run `npm run lint` and `npm run build` before production deployment.
