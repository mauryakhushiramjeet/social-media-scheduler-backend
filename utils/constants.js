// HTTP Status Codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
};

// Supported social media platforms and their official Zernio identifiers
export const PLATFORMS = {
  FACEBOOK: "facebook",
  INSTAGRAM: "instagram",
  TWITTER: "twitter",
  LINKEDIN: "linkedin",
  YOUTUBE: "youtube",
  PINTEREST: "pinterest",
  REDDIT: "reddit",
  THREADS: "threads",
  BLUESKY: "bluesky",
  SNAPCHAT: "snapchat",
  TELEGRAM: "telegram",
  GOOGLE_BUSINESS: "googlebusiness", // Zernio uses "googlebusiness"
  WHATSAPP: "whatsapp",             // WhatsApp business messaging
};

// Platforms supported for scheduling social posts (excludes WhatsApp messaging)
export const POST_SCHEDULER_PLATFORMS = [
  PLATFORMS.FACEBOOK,
  PLATFORMS.INSTAGRAM,
  PLATFORMS.TWITTER,
  PLATFORMS.LINKEDIN,
  PLATFORMS.YOUTUBE,
  PLATFORMS.PINTEREST,
  PLATFORMS.REDDIT,
  PLATFORMS.THREADS,
  PLATFORMS.BLUESKY,
  PLATFORMS.SNAPCHAT,
  PLATFORMS.TELEGRAM,
  PLATFORMS.GOOGLE_BUSINESS,
];

// Helper to convert platform name/slug to Prisma enum
export const getPlatformEnum = (platformStr) => {
  if (!platformStr) return null;
  const normalized = platformStr.toLowerCase().replace(/[-_]/g, "");
  for (const [enumKey, val] of Object.entries(PLATFORMS)) {
    const normVal = val.toLowerCase().replace(/[-_]/g, "");
    const normKey = enumKey.toLowerCase().replace(/[-_]/g, "");
    if (normVal === normalized || normKey === normalized) {
      return enumKey;
    }
  }
  return null;
};

// Post Types
export const POST_TYPES = {
  FEED: "FEED",
  REEL: "REEL",
  STORY: "STORY",
  CAROUSEL: "CAROUSEL",
};

// Post Statuses
export const POST_STATUS = {
  DRAFT: "DRAFT",
  SCHEDULED: "SCHEDULED",
  PUBLISHED: "PUBLISHED",
  FAILED: "FAILED",
};

// Account Connection Statuses
export const ACCOUNT_STATUS = {
  CONNECTED: "CONNECTED",
  DISCONNECTED: "DISCONNECTED",
};
