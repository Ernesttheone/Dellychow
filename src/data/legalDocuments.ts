import { LegalAcceptanceRecord, LegalPolicyKey, UserProfile } from '../types';

export type LegalDocumentTab = Exclude<LegalPolicyKey, 'legal'>;

export const CURRENT_TERMS_VERSION = '1.0.0';
export const CURRENT_PRIVACY_VERSION = '1.0.0';
export const CURRENT_GUIDELINES_VERSION = '1.0.0';
export const CURRENT_COPYRIGHT_VERSION = '1.0.0';
export const CURRENT_FOOD_SAFETY_VERSION = '1.0.0';
export const CURRENT_COOKIE_VERSION = '1.0.0';

export const LEGAL_LAST_UPDATED_DATE = '[TO BE CONFIRMED BY LEGAL COUNSEL — Drafted Nov 2026]';
export const LEGAL_EFFECTIVE_DATE = '[TO BE CONFIRMED BY LEGAL COUNSEL]';

export interface LegalSection {
  id: string;
  number: string;
  title: string;
  summary: string;
  paragraphs: string[];
  bulletPoints?: string[];
  callout?: {
    type: 'warning' | 'info' | 'safety';
    title: string;
    body: string;
  };
}

export interface LegalPolicyMeta {
  key: LegalDocumentTab;
  title: string;
  shortTitle: string;
  version: string;
  lastUpdated: string;
  summary: string;
  related: LegalDocumentTab[];
}

export const LEGAL_POLICY_DIRECTORY: Record<LegalDocumentTab, LegalPolicyMeta> = {
  terms: {
    key: 'terms',
    title: 'Terms and Conditions',
    shortTitle: 'Terms',
    version: CURRENT_TERMS_VERSION,
    lastUpdated: LEGAL_LAST_UPDATED_DATE,
    summary:
      'Rules governing registration, Chef & Food Lover accounts, uploaded videos, recipe ownership, platform availability, future monetisation, and dispute resolution.',
    related: ['privacy', 'guidelines', 'copyright', 'food-safety'],
  },
  privacy: {
    key: 'privacy',
    title: 'Privacy Policy & Data Protection',
    shortTitle: 'Privacy Policy',
    version: CURRENT_PRIVACY_VERSION,
    lastUpdated: LEGAL_LAST_UPDATED_DATE,
    summary:
      'Details exact data collected across Firebase Auth, Firestore, local video streaming, and offline caching, aligned with the Nigeria Data Protection Act 2023.',
    related: ['cookies', 'terms', 'contact'],
  },
  guidelines: {
    key: 'guidelines',
    title: 'Community Guidelines',
    shortTitle: 'Guidelines',
    version: CURRENT_GUIDELINES_VERSION,
    lastUpdated: LEGAL_LAST_UPDATED_DATE,
    summary:
      'Standards for respectful Chef and Food Lover interactions, VIP chats, reviews, cooking challenges, teen/child safety, and anti-harassment enforcement.',
    related: ['reporting', 'terms', 'copyright'],
  },
  copyright: {
    key: 'copyright',
    title: 'Copyright & Intellectual Property Policy',
    shortTitle: 'Copyright',
    version: CURRENT_COPYRIGHT_VERSION,
    lastUpdated: LEGAL_LAST_UPDATED_DATE,
    summary:
      'Creator ownership safeguards, infringement reporting, good-faith verification, counter-notices, and repeat-infringement rules under the Nigerian Copyright Act 2022.',
    related: ['terms', 'reporting', 'guidelines'],
  },
  'food-safety': {
    key: 'food-safety',
    title: 'Food Safety & Recipe Disclaimer',
    shortTitle: 'Food Safety',
    version: CURRENT_FOOD_SAFETY_VERSION,
    lastUpdated: LEGAL_LAST_UPDATED_DATE,
    summary:
      'Allergen checks, kitchen hygiene, cooking temperature safety, storage guidance, and clear notice that DellyChow is not a medical or nutritional provider.',
    related: ['terms', 'guidelines', 'reporting'],
  },
  cookies: {
    key: 'cookies',
    title: 'Cookie & Local Storage Policy',
    shortTitle: 'Cookies',
    version: CURRENT_COOKIE_VERSION,
    lastUpdated: LEGAL_LAST_UPDATED_DATE,
    summary:
      'Transparent breakdown of actual essential Firebase auth tokens and functional offline/theme storage used by DellyChow, with zero ad trackers.',
    related: ['privacy', 'terms'],
  },
  reporting: {
    key: 'reporting',
    title: 'Content Reporting & Appeals',
    shortTitle: 'Reporting & Appeals',
    version: '1.0.0',
    lastUpdated: LEGAL_LAST_UPDATED_DATE,
    summary:
      'How to report unsafe videos, recipes, comments, profiles, or links, block users, track report outcomes, and file moderation appeals.',
    related: ['guidelines', 'copyright', 'contact'],
  },
  contact: {
    key: 'contact',
    title: 'Contact, Complaints & Legal Support',
    shortTitle: 'Contact & Support',
    version: '1.0.0',
    lastUpdated: LEGAL_LAST_UPDATED_DATE,
    summary:
      'Central legal, privacy, copyright, technical, and general complaint channels along with corporate placeholder information pending counsel confirmation.',
    related: ['privacy', 'reporting', 'terms'],
  },
};

export function hasAcceptedLatestLegal(profile?: UserProfile | null): boolean {
  if (!profile?.legalAcceptance) return false;
  return (
    profile.legalAcceptance.status === 'accepted' &&
    profile.legalAcceptance.termsVersion === CURRENT_TERMS_VERSION &&
    profile.legalAcceptance.privacyPolicyVersion === CURRENT_PRIVACY_VERSION &&
    (!profile.legalAcceptance.communityGuidelinesVersion ||
      profile.legalAcceptance.communityGuidelinesVersion === CURRENT_GUIDELINES_VERSION)
  );
}

export function buildLegalAcceptanceRecord(
  userId: string,
  acceptedAtIso: string,
  source: LegalAcceptanceRecord['source'] = 'signup',
  registrationMethod: LegalAcceptanceRecord['registrationMethod'] = 'email_password',
  status: 'accepted' | 'declined' = 'accepted'
): LegalAcceptanceRecord {
  return {
    userId,
    termsVersion: CURRENT_TERMS_VERSION,
    privacyPolicyVersion: CURRENT_PRIVACY_VERSION,
    communityGuidelinesVersion: CURRENT_GUIDELINES_VERSION,
    copyrightPolicyVersion: CURRENT_COPYRIGHT_VERSION,
    foodSafetyVersion: CURRENT_FOOD_SAFETY_VERSION,
    cookiePolicyVersion: CURRENT_COOKIE_VERSION,
    acceptedAt: acceptedAtIso,
    status,
    registrationMethod,
    source,
  };
}

export const TERMS_SECTIONS: LegalSection[] = [
  {
    id: 'introduction',
    number: '1',
    title: 'Introduction & Acceptance of Terms',
    summary: 'Scope of DellyChow and binding consent when registering or using platform features.',
    paragraphs: [
      'Welcome to DellyChow ("DellyChow", "Platform", "we", "our", "us"), operated by [TO BE CONFIRMED: Registered Company Legal Name & RC Number]. DellyChow unites culinary creators ("Chefs") and cooking enthusiasts ("Food Lovers") through cooking tutorial videos, live-recorded kitchen videos, step-by-step recipes, VIP Kitchen Circles, group discussions, cooking challenges, bookmarks, and shopping lists.',
      'By registering an account (via Email/Password or Google Sign-In), checking the mandatory policy acceptance box, clicking "Accept" on an updated Terms notice, or accessing our Services, you confirm that you have read, understood, and agree to be bound by these Terms and Conditions, our Privacy Policy, and our Community Guidelines.',
    ],
    callout: {
      type: 'info',
      title: 'Legal Review & Placeholder Notice',
      body: 'Prepared with Nigerian law as the primary legal foundation (Nigeria Data Protection Act 2023, Copyright Act 2022, Federal Competition and Consumer Protection Act 2018) alongside international safeguards. Fields marked "[TO BE CONFIRMED]" must be completed and reviewed by a qualified legal practitioner before being treated as final binding legal instruments.',
    },
  },
  {
    id: 'eligibility',
    number: '2',
    title: 'User Registration, Eligibility & Age Protections',
    summary: 'Minimum registration age, teen privacy protections, and permanent role selection.',
    paragraphs: [
      'You must be at least 18 years old—or aged 13 to 17 with verifiable parental or legal guardian consent and supervision in compliance with applicable Nigerian children’s data protection rules under the Nigeria Data Protection Act 2023 and Child Rights principles—to register an account on DellyChow. Children under 13 are not permitted to maintain independent accounts.',
      'During registration, you permanently choose either a Food Lover role or a Chef / Creator role. Providing false identity information, registering automated bots, or impersonating another person is strictly forbidden.',
    ],
    bulletPoints: [
      'Minors/Teens (13–17) may enable Enhanced Teen Privacy Protections in Account Privacy Settings (restricting profile visibility and direct external link sharing).',
      'Paid VIP Kitchen Circles and commercial creator features are reserved for users aged 18 or older with full legal capacity.',
      'Accounts found to belong to unsupervised children under 13 or misrepresenting age may be restricted or removed.',
    ],
  },
  {
    id: 'account-responsibilities',
    number: '3',
    title: 'General Account Responsibilities & Security',
    summary: 'Credential protection, accurate profile details, and account recovery.',
    paragraphs: [
      'You are responsible for safeguarding your login password, Google account session, and any device holding offline cached DellyChow data. Notify DellyChow immediately via Support if you detect unauthorized account activity or use our Password Recovery flow to reset compromised credentials.',
    ],
  },
  {
    id: 'chef-responsibilities',
    number: '4',
    title: 'Chef Account Responsibilities & Content Protection',
    summary: 'Creator accountability for uploaded videos, live recordings, recipes, and accurate branding.',
    paragraphs: [
      'Chef accounts access Chef Studio to publish recipes, upload videos, record live kitchen demonstrations, schedule masterclasses, and run VIP Kitchen Circles. Chefs must ensure:',
    ],
    bulletPoints: [
      'Content Responsibility: Chefs bear full responsibility for all recipes, videos, live camera recordings, descriptions, nutritional figures, and thumbnails they publish.',
      'Originality & Permissions: Chefs must own or hold valid authorization for all footage, background music/audio, photographs, and recipe text uploaded.',
      'Accurate Profiles & Anti-Impersonation: Do not falsify culinary credentials, copy another chef’s identity, or publish misleading descriptions.',
      'No Unauthorized Use of Others’ Content: Re-uploading another creator’s cooking videos, photos, or distinctive recipe guides without express written permission violates these Terms and Nigerian Copyright law.',
      'Allergen & Safety Clarity: Clearly highlight major allergens and hot-oil, raw-protein, or high-risk cooking steps.',
    ],
  },
  {
    id: 'food-lover-responsibilities',
    number: '5',
    title: 'Food Lover Account Responsibilities & Safety',
    summary: 'Personal protection, respectful engagement, and sharing limits for Food Lovers.',
    paragraphs: [
      'Food Lovers browse recipes, watch classes, bookmark favourites, organize shopping lists, join cooking challenges, review chefs, and participate in VIP chats. Food Lovers must:',
    ],
    bulletPoints: [
      'Interact respectfully without harassment, bullying, hate speech, threats, or targeted dogpiling.',
      'Never impersonate chefs, moderators, or fellow food lovers.',
      'Use comments, reviews, reporting tools, blocking controls, and challenge votes honestly without spam, brigading, or fraud.',
      'Refrain from downloading, screen-recording, or commercially redistributing Chef videos (particularly VIP content) outside DellyChow’s built-in sharing URLs.',
    ],
  },
  {
    id: 'ugc-ownership-licensing',
    number: '6',
    title: 'User-Generated Content, Recipe Ownership & Limited License',
    summary: 'Creators retain 100% ownership of original recipes, photos, and videos.',
    paragraphs: [
      'YOU RETAIN FULL OWNERSHIP: DellyChow does NOT claim ownership over any original recipe, culinary photograph, cooking video, live recording, or written comment you upload or create on DellyChow. All copyright and ownership remain exclusively with you.',
      'LIMITED OPERATIONAL LICENSE: By uploading or publishing content on DellyChow, you grant DellyChow a limited, worldwide, non-exclusive, royalty-free, revocable (upon content/account deletion, subject to technical cache propagation) license solely to host, transcode (such as MP4 faststart optimization), stream, display thumbnails, serve offline cache metadata, format for mobile/desktop screens, and distribute your content through DellyChow’s features (including user-initiated share links).',
    ],
    callout: {
      type: 'info',
      title: 'Copyright Act 2022 Alignment',
      body: 'Where you remove content or delete your account, DellyChow’s operational display license ends promptly for active listings, except where limited legal or dispute-resolution retention applies.',
    },
  },
  {
    id: 'comments-sharing-links',
    number: '7',
    title: 'Comments, Profile Sharing & External Links',
    summary: 'Standards for public discussions, ?video=/?recipe=/?chef=/?user= links, and third-party URLs.',
    paragraphs: [
      'DellyChow provides sharing tools for recipes, videos, Chef profiles, and Food Lover profiles. You may not manipulate share links for phishing, malware, automated scraping, or harassment. Any external link placed in a bio, recipe description, or community message must be safe, honest, and lawful; DellyChow is not responsible for third-party websites.',
    ],
  },
  {
    id: 'prohibited-activities',
    number: '8',
    title: 'Prohibited Activities & Community Safety',
    summary: 'Zero tolerance for fraud, malware, scraping, hate, or bypassing VIP gates.',
    paragraphs: ['Users must not:'],
    bulletPoints: [
      'Upload viruses, malformed media payloads, malicious scripts, or attempt to bypass HTTP/Firestore security rules or VIP video preview limits.',
      'Engage in scams, fraudulent payment solicitations, pyramid schemes, or deceptive giveaways.',
      'Send unsolicited promotional spam or inappropriate contact to minor/teen accounts.',
      'Submit false or abusive copyright takedowns or moderation reports in bad faith.',
    ],
  },
  {
    id: 'moderation-termination',
    number: '9',
    title: 'Content Moderation, Restrictions, Termination & Appeals',
    summary: 'Fair enforcement actions, temporary restrictions, permanent bans, and appeals.',
    paragraphs: [
      'Authorized DellyChow administrators review user reports, community flags, and copyright claims. Depending on severity and history, DellyChow may remove infringing content, restrict specific features (such as commenting or uploading), temporarily restrict an account, or permanently suspend accounts for repeated or severe breaches.',
      'Users subjected to moderation actions may submit an explanation or appeal through the Content Reporting & Appeals Centre.',
    ],
  },
  {
    id: 'availability-third-party',
    number: '10',
    title: 'Platform Availability, Security & Third-Party Services',
    summary: 'Actual infrastructure dependencies and uptime expectations.',
    paragraphs: [
      'DellyChow is built upon Google Firebase Authentication, Cloud Firestore, our Node/Express video upload and streaming backend, and browser Service Worker offline caching. Services are provided "AS IS" and "AS AVAILABLE"; live camera recording requires device permission, and network conditions may affect streaming or synchronization.',
      'Details of our actual third-party service integrations and data flows are documented honestly in Section 4 of our Privacy Policy.',
    ],
  },
  {
    id: 'ip-and-food-safety',
    number: '11',
    title: 'Platform Intellectual Property & Food Safety Disclaimers',
    summary: 'DellyChow brand protection and cross-reference to Food Safety Policy.',
    paragraphs: [
      'The DellyChow name, orange crossed-utensils logo, loading reveal animation, interface design, and software code belong to [TO BE CONFIRMED: Company Legal Name]. Recipes and videos are informational only and do not constitute medical, clinical, or nutritional advice—see our standalone Food Safety and Recipe Disclaimer.',
    ],
  },
  {
    id: 'monetisation-business',
    number: '12',
    title: 'VIP Subscriptions, Future Monetisation & Independent Arrangements',
    summary: 'Framework for VIP Chef Circles and prospective future creator monetization.',
    paragraphs: [
      'Currently, DellyChow enables Chefs to showcase VIP Kitchen Circles and masterclass pricing plans inside Chef Studio. Note on Payment Integration: [TO BE CONFIRMED: Specify active payment gateway once live billing processor such as Paystack, Flutterwave, or Stripe is connected; currently no third-party card gateway processes live charges directly on-platform].',
      'Future Monetisation Framework: As DellyChow introduces additional monetization features—which may include paid Chef subscriptions, paid digital creator services, advertisements, clearly labeled sponsored recipes, brand partnerships, premium memberships, paid masterclasses, or marketplace services—additional supplemental payment, refund, cancellation, fee, and tax terms will apply and be disclosed prior to transaction.',
      'Independent Arrangements: Any direct offline arrangement, catering inquiry, or external commercial deal agreed independently between a Chef and a Food Lover outside DellyChow’s official platform checkout occurs solely at those users’ own risk; DellyChow is not a party to private off-platform transactions.',
    ],
  },
  {
    id: 'liability-disputes-changes',
    number: '13',
    title: 'Limitation of Liability, Consumer Rights & Dispute Resolution',
    summary: 'FCCPA 2018 consumer protection respect, Nigerian governing law placeholder, and Terms updates.',
    paragraphs: [
      'To the fullest extent permitted under applicable law—including the Federal Competition and Consumer Protection Act 2018 (FCCPA), which protects statutory consumer rights that cannot lawfully be waived—DellyChow shall not be liable for indirect, incidental, or consequential damages, allergic reactions, kitchen accidents, or third-party user misconduct.',
      'Dispute Resolution & Governing Law: [TO BE CONFIRMED BY LEGAL COUNSEL: Governed by the laws of the Federal Republic of Nigeria; disputes first addressed via DellyChow Support/amicable settlement before [Competent Nigerian Court / Arbitration Venue]].',
      'Changes to Terms: Material updates increment the policy version and prompt existing users cleanly without destroying account records. Users who decline mandatory updated terms may cease use or initiate an Account Privacy & Deletion request.',
    ],
  },
];

export const PRIVACY_SECTIONS: LegalSection[] = [
  {
    id: 'privacy-scope',
    number: '1',
    title: 'Privacy Overview & Nigerian Data Protection Act 2023 Alignment',
    summary: 'Controller identity placeholder, NDPA 2023 alignment, and transparent scope.',
    paragraphs: [
      'DellyChow ("we", "our", "us") processes personal data transparently in alignment with the Nigeria Data Protection Act 2023 (NDPA) and international privacy principles. Data Controller: [TO BE CONFIRMED: Registered Company Name, Physical Address, & Data Protection Officer / Legal Contact Email].',
      'This Privacy Policy describes ONLY the actual technologies and data processing activities present in the DellyChow platform—we do not invent or claim tracking systems that are not implemented.',
    ],
  },
  {
    id: 'data-collected',
    number: '2',
    title: 'Information DellyChow Actually Collects',
    summary: 'Exact breakdown of account, content, technical, and local browser data.',
    paragraphs: ['Depending on your account role and interactions, DellyChow collects and processes:'],
    bulletPoints: [
      'Account & Profile Data: Display name, email address, Firebase UID, password (hashed & managed securely by Firebase Auth—never stored in plaintext or exposed), Google profile photo/name (if using Google Sign-In), account role (Chef or Food Lover), optional age-tier/minor-protection preferences, bio, culinary specialty, and avatar selection or device-uploaded avatar photo.',
      'User-Generated Content: Recipes (titles, ingredients, steps, images), cooking videos and live-recorded camera/microphone streams (uploaded via /api/videos/upload), thumbnails, recipe comments, video comments, chef reviews/ratings, VIP group chat messages, and cooking challenge entries/votes.',
      'Platform Interaction & Safety Data: Favourites, video bookmarks, shopping lists, notification read state, chef follow counts, copyright claims, moderation reports, appeals, block lists, and support tickets/chats.',
      'Policy Acceptance Logs: Immutable records storing your UID, accepted Terms/Privacy/Guidelines versions, registration method, acceptance status, and authoritative UTC timestamp.',
      'Technical & Local Storage Data: Server request headers needed for video HTTP range streaming, local theme preference, sidebar state, cookie preference settings, IndexedDB temporary video recovery blobs, and Service Worker offline Cache API entries (metadata and thumbnails of previously watched videos).',
    ],
  },
  {
    id: 'purpose-lawful-basis',
    number: '3',
    title: 'Why We Collect Data & Lawful Bases (NDPA 2023)',
    summary: 'Consent, contract performance, legitimate interests, and legal compliance.',
    paragraphs: ['Under Section 25 of the Nigeria Data Protection Act 2023, we process your data based on:'],
    bulletPoints: [
      'Performance of a Contract: Creating your account, authenticating sessions, hosting/streaming your videos and recipes, syncing shopping lists, and delivering VIP chats.',
      'Explicit Consent: Recording your active agreement to our Terms & Privacy Policy at sign-up, optional Teen privacy modes, camera/microphone permissions during live studio recording, and optional functional local storage preferences.',
      'Legitimate Interests: Preventing spam, bots, impersonation, and fraud; maintaining community safety; debugging video playback errors; and protecting creator copyrights.',
      'Legal Obligations: Retaining necessary copyright claim logs, moderation audit trails, and statutory compliance records.',
    ],
  },
  {
    id: 'third-party-transfers',
    number: '4',
    title: 'Actual Third-Party Service Providers & International Transfers',
    summary: 'Only real integrations currently present in DellyChow.',
    paragraphs: ['DellyChow does NOT sell personal data and does NOT use third-party advertising networks or hidden behavioral trackers. Actual external services used are limited to:'],
    bulletPoints: [
      'Google Firebase (Authentication & Cloud Firestore): Handles authentication (Email/Password and Google OAuth) and real-time database storage. Google processes authentication and Firestore records under Google Cloud/Firebase privacy & security terms (transfers outside Nigeria rely on standard contractual and adequacy safeguards).',
      'Application Server & Media Host: Processes uploaded/recorded MP4/WebM/MOV files via Express server storage and FFmpeg +faststart formatting so videos play reliably on mobile and desktop.',
      'Unsplash Curated Placeholder Images: Used solely for default recipe/chef template imagery—no user personal data is sent to Unsplash beyond standard HTTP image asset requests.',
    ],
  },
  {
    id: 'retention-security-breach',
    number: '5',
    title: 'Data Storage, Retention, Security Safeguards & Breach Handling',
    summary: 'How data is protected, how long it stays, and breach notification.',
    paragraphs: [
      'Security Safeguards: Firebase Authentication enforces encrypted credential verification; Firestore Security Rules restrict PII/private reports/blocked users/deletion requests strictly to owners and verified administrators; and Express enforces input sanitization and media MIME validation.',
      'Retention & Deletion: Account profile and content remain active until deleted by you or removed for policy violations. Upon verified account deletion, active personal profile fields, favourites, shopping lists, and owned content are scheduled for permanent removal or anonymization within [TO BE CONFIRMED: e.g., 30 days], while immutable legal acceptance timestamps or active legal/copyright dispute logs may be retained only as required by Nigerian statutory limitations.',
      'Data Breach Handling: In the event of a personal data breach likely to pose risks to rights and freedoms, DellyChow will investigate immediately, contain affected systems, and notify the Nigeria Data Protection Commission (NDPC) and affected users in accordance with NDPA timelines.',
    ],
  },
  {
    id: 'privacy-rights-children',
    number: '6',
    title: 'Your Privacy Rights, Account Deletion & Child Protections',
    summary: 'Access, export, rectification, deletion, teen privacy, and NDPC complaints.',
    paragraphs: ['You can exercise your rights directly in Account Settings -> Privacy & Data Rights or via Privacy Support:'],
    bulletPoints: [
      'Access & Export: Download a JSON copy of your DellyChow profile, bookmarks, and legal consent records anytime or submit a Data Access Request.',
      'Correction: Edit display name, specialty, bio, and profile photo anytime or file a Data Correction Request.',
      'Account Deletion: Initiate a confirmed multi-step Account Deletion Request inside Account Settings.',
      'Child & Teen Privacy (NDPA 2023): Younger users (13–17) require guardian consent where required by law, benefit from restricted visibility toggles, and can report inappropriate contact immediately.',
      'Complaints: Reach our Privacy Support first ([TO BE CONFIRMED: privacy@dellychow.com]), or lodge a complaint with the Nigeria Data Protection Commission (NDPC).',
    ],
  },
];

export const GUIDELINES_SECTIONS: LegalSection[] = [
  {
    id: 'guidelines-chefs-foodlovers',
    number: '1',
    title: 'Respect Between Chefs and Food Lovers',
    summary: 'Zero harassment, hate speech, intimidation, or personal attacks.',
    paragraphs: [
      'DellyChow is a welcoming culinary community. Critique dishes constructively in recipe comments, video feedback, or Chef reviews—never attack people based on race, ethnicity, nationality, religion, gender, disability, or appearance. Threats, doxxing, or targeted harassment lead to content removal and suspension.',
    ],
  },
  {
    id: 'guidelines-impersonation-spam',
    number: '2',
    title: 'No Impersonation, Spam, Suspicious Links, or Vote Fraud',
    summary: 'Keeping profiles, VIP chats, and cooking challenges trustworthy.',
    paragraphs: [
      'Chefs and Food Lovers must maintain honest identities. Never impersonate another creator, paste phishing/malware links in bios or VIP chats, spam promotional messages, or manipulate Cooking Challenge votes using duplicate accounts.',
    ],
  },
  {
    id: 'guidelines-minor-safety',
    number: '3',
    title: 'Child & Teen Safety Rules',
    summary: 'Zero tolerance for inappropriate contact, grooming, or unsafe minor content.',
    paragraphs: [
      'All interactions involving younger culinary learners must remain strictly polite and focused on cooking. Unsolicited private contact, sexualized remarks, intimidation, or unsafe kitchen stunts directed toward minors/teens result in immediate permanent account termination and reporting where legally mandated.',
    ],
  },
  {
    id: 'guidelines-block-report',
    number: '4',
    title: 'Blocking & Community Reporting Tools',
    summary: 'How users protect their experience.',
    paragraphs: [
      'You can report suspicious videos, recipes, comments, profiles, or external links from content pages and profiles, and block specific users so their comments and interactions are hidden from your feed. Private reports are reviewed confidentially by administrators and are never exposed to other users.',
    ],
  },
];

export const COPYRIGHT_SECTIONS: LegalSection[] = [
  {
    id: 'copyright-ownership',
    number: '1',
    title: 'Creator Ownership Under the Nigerian Copyright Act 2022',
    summary: 'Protecting videos, photographs, recipe text, and audio tracks.',
    paragraphs: [
      'Creators retain full copyright over original cooking videos, live recordings, step-by-step literary expressions, and food photography published on DellyChow. Uploading another chef’s tutorial, unlicensed commercial music, stock photos without license, or impersonating another creator’s brand is prohibited.',
    ],
  },
  {
    id: 'copyright-filing',
    number: '2',
    title: 'Submitting a Copyright or Impersonation Complaint',
    summary: 'Required details for good-faith copyright notices.',
    paragraphs: [
      'Use the Copyright & Creator Protection Centre form to submit a formal complaint. Every claim must include:',
    ],
    bulletPoints: [
      'Identification and description (plus reference URL where available) of the original copyrighted work or creator identity.',
      'Exact DellyChow content ID, link, or profile URL of the allegedly infringing video, recipe, or profile.',
      'Complainant contact details and a good-faith declaration confirming accuracy and ownership/authorization.',
    ],
    callout: {
      type: 'warning',
      title: 'No Automatic Unverified Removals',
      body: 'DellyChow does NOT automatically delete uploaded videos, recipes, or profiles solely upon receiving an unverified complaint. Every complaint receives an administrative review evaluating evidence and ownership before any takedown decision is executed.',
    },
  },
  {
    id: 'copyright-counter-repeat',
    number: '3',
    title: 'Counter-Notifications, Disputes & Repeat Infringers',
    summary: 'Fair dispute procedures for accused creators and repeat-offender enforcement.',
    paragraphs: [
      'If your content is flagged under a copyright complaint, you may submit a Counter-Notification explaining your ownership, license, or fair-dealing rights (such as lawful quotation or independent recipe creation) via the Copyright Centre or Content Appeals page.',
      'Repeat Infringers: Accounts accumulating multiple verified copyright strikes face escalating restrictions up to permanent suspension and content removal.',
    ],
  },
];

export const FOOD_SAFETY_SECTIONS: LegalSection[] = [
  {
    id: 'food-safety-informational',
    number: '1',
    title: 'Informational Platform — Not Medical or Nutritional Advice',
    summary: 'DellyChow hosts user-submitted culinary tutorials, not clinical guidance.',
    paragraphs: [
      'DellyChow is an educational cooking and recipe-sharing community. Nothing published in videos, live sessions, ingredient lists, calorie estimates, or comments constitutes medical, clinical, dietetic, or professional nutritional advice. Consult a qualified doctor or registered dietitian regarding allergies, health conditions, pregnancy, or medical diets.',
    ],
  },
  {
    id: 'food-safety-allergens',
    number: '2',
    title: 'Allergen Disclosure, Dietary Restrictions & Substitutions',
    summary: 'User responsibility to verify labels and substitutions.',
    paragraphs: [
      'While Chefs are expected to provide accurate ingredient measurements and clearly flag common allergens (peanuts, tree nuts, milk/dairy, eggs, wheat/gluten, soy, sesame, fish, shellfish), DellyChow cannot independently test or certify user-submitted recipes. Ingredient substitutions alter texture, allergens, and nutritional values; always inspect commercial product labels carefully before cooking or serving.',
    ],
  },
  {
    id: 'food-safety-hygiene',
    number: '3',
    title: 'Kitchen Hygiene, Preparation, Cooking Temperatures & Storage',
    summary: 'Safe home food handling obligations.',
    paragraphs: ['Every cook and viewer remains personally responsible for safe kitchen practices, including:'],
    bulletPoints: [
      'Washing hands, utensils, and cutting boards between handling raw meats/poultry/seafood and ready-to-eat produce.',
      'Cooking animal proteins to safe internal temperatures and handling hot oil, steam, knives, and pressure cookers safely.',
      'Cooling, sealing, and refrigerating or freezing leftovers promptly according to recognized food safety timeframes rather than relying solely on creator estimates.',
    ],
  },
];

export const COOKIE_SECTIONS: LegalSection[] = [
  {
    id: 'cookie-transparency',
    number: '1',
    title: 'Honest Inventory of Cookies & Browser Storage Used',
    summary: 'Zero third-party ad networks or hidden tracking cookies.',
    paragraphs: [
      'Unlike ad-driven websites, DellyChow does NOT currently embed third-party advertising cookies, social retargeting pixels, or third-party behavioral analytics trackers. We only use essential technical storage and optional functional storage clearly controllable by you.',
    ],
  },
  {
    id: 'cookie-categories',
    number: '2',
    title: 'Categories & Retention',
    summary: 'Essential Auth/Session storage vs Optional Functional/Offline cache.',
    paragraphs: ['Storage technologies currently active on DellyChow:'],
    bulletPoints: [
      'Essential Session & Security Storage (Always Active): Firebase Authentication & Firestore local IndexedDB session state and auth cookies/tokens required so you stay signed in securely and security rules recognize your session.',
      'Functional Preferences & Offline Cache (User-Controllable): Browser localStorage for light/dark theme, sidebar collapse preference, profile fast-load cache, and Service Worker Cache API storing metadata & thumbnails of previously watched videos for poor-network viewing.',
      'Advertising / Behavioral Tracking Cookies: NOT USED on DellyChow. We never display fake toggles for trackers that do not exist.',
    ],
  },
  {
    id: 'cookie-management',
    number: '3',
    title: 'Managing Your Preferences',
    summary: 'Control functional storage inside DellyChow or your browser.',
    paragraphs: [
      'You can toggle Optional Functional & Offline Storage preferences directly in the Cookie Preference panel on the Cookie Policy page or in Account Privacy Settings, or clear site data via your browser settings.',
    ],
  },
];

export const REPORTING_SECTIONS: LegalSection[] = [
  {
    id: 'reporting-scope',
    number: '1',
    title: 'What You Can Report & Block',
    summary: 'Videos, recipes, comments, Chef/Food Lover profiles, links, and abusive conduct.',
    paragraphs: [
      'Authenticated users can report cooking videos, recipes, comments, Chef profiles, Food Lover profiles, suspicious external links, harassment, spam, fraud, unsafe food content, inappropriate minor contact, and copyright infringements directly via Report buttons or the Reporting Centre.',
      'Blocking Users: Blocking an account hides that user’s comments and chat interactions from your view immediately.',
    ],
  },
  {
    id: 'reporting-process',
    number: '2',
    title: 'Confidential Review, Actions & Moderation Appeals',
    summary: 'Private handling, admin review, and fair appeals.',
    paragraphs: [
      'Private reports are visible ONLY to the submitting reporter (in their personal report tracker) and authorized DellyChow administrators—never to other users. Administrators evaluate evidence before removing content, issuing temporary restrictions, or enforcing permanent suspensions, and record every decision in an immutable audit log.',
      'Moderation Appeals: If your account or content has been restricted or removed, submit a Moderation Appeal below explaining why you believe the decision should be reversed.',
    ],
  },
];

export const CONTACT_SECTIONS: LegalSection[] = [
  {
    id: 'contact-channels',
    number: '1',
    title: 'Official Support, Legal & Corporate Placeholders',
    summary: 'Direct complaint submission channels and unconfirmed corporate details.',
    paragraphs: [
      'DellyChow provides a unified complaint and enquiry channel for Account complaints, Privacy/NDPA requests, Copyright notices, Content reports, Technical bugs, and General enquiries.',
    ],
    bulletPoints: [
      'Operating Entity Name: [TO BE CONFIRMED: Registered Company Legal Name]',
      'Corporate Registration (CAC RC Number): [TO BE CONFIRMED: RC / BN Number]',
      'Registered Business Address: [TO BE CONFIRMED: Street Address, City, State, Federal Republic of Nigeria]',
      'Official Legal & Copyright Email: [TO BE CONFIRMED: legal@dellychow.com]',
      'Data Protection Officer (NDPA Contact): [TO BE CONFIRMED: Name / privacy@dellychow.com]',
      'Designated Legal Representative: [TO BE CONFIRMED: External or Internal Legal Counsel]',
    ],
    callout: {
      type: 'warning',
      title: 'Mandatory Legal Counsel Verification',
      body: 'No corporate registration numbers, physical addresses, DPO certifications, or official legal email addresses have been fabricated. All placeholder fields must be populated and formally reviewed by qualified legal counsel prior to commercial launch.',
    },
  },
];

export const POLICY_SECTIONS_MAP: Record<LegalDocumentTab, LegalSection[]> = {
  terms: TERMS_SECTIONS,
  privacy: PRIVACY_SECTIONS,
  guidelines: GUIDELINES_SECTIONS,
  copyright: COPYRIGHT_SECTIONS,
  'food-safety': FOOD_SAFETY_SECTIONS,
  cookies: COOKIE_SECTIONS,
  reporting: REPORTING_SECTIONS,
  contact: CONTACT_SECTIONS,
};
