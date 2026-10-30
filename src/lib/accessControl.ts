export const COLLEGE_EMAIL_DOMAIN = 'ghrietn.raisoni.net';
export const COLLEGE_EMAIL_EXAMPLE = 'firstname.surname.cse@ghrietn.raisoni.net';

const ADMIN_EMAILS = new Set([
  'raat131221@gmail.com',
  'kanojiyapk524@gmail.com',
]);

export const normalizeEmail = (email: string) => email.trim().toLowerCase();

export const isCollegeEmail = (email: string) =>
  /^[a-z0-9]+(?:[._-][a-z0-9]+)+\.cse@ghrietn\.raisoni\.net$/i.test(normalizeEmail(email));

export const isAdminEmail = (email: string) => ADMIN_EMAILS.has(normalizeEmail(email));
export const isOfficialCollegeEmail = (email: string) => normalizeEmail(email).endsWith('@' + COLLEGE_EMAIL_DOMAIN);

export const isAllowedPlatformEmail = (email: string) =>
  isCollegeEmail(email) || isOfficialCollegeEmail(email) || isAdminEmail(email);

export const getPlatformEmailError = () =>
  `Use your official college email in the format ${COLLEGE_EMAIL_EXAMPLE}.`;
