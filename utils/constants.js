// HTTP Status Codes (eliminates magic numbers like 200, 201, 400, 401, 500)
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

// Official Ayrshare API Endpoints
const AYRSHARE_BASE_URL = "https://api.ayrshare.com/api";

export const AYRSHARE_ENDPOINTS = {
  BASE_URL: AYRSHARE_BASE_URL,
  PROFILES: `${AYRSHARE_BASE_URL}/profiles/profile`,
  GENERATE_JWT: `${AYRSHARE_BASE_URL}/profiles/generateJWT`,
  UNLINK_SOCIAL: `${AYRSHARE_BASE_URL}/profiles/social`,
  USER: `${AYRSHARE_BASE_URL}/user`,
  POST: `${AYRSHARE_BASE_URL}/post`,
  HISTORY: `${AYRSHARE_BASE_URL}/history`,
  ANALYTICS: `${AYRSHARE_BASE_URL}/analytics`,
  MEDIA: `${AYRSHARE_BASE_URL}/media`,
};

// Supported social media platforms and their official Ayrshare API identifiers
export const PLATFORMS = {
  FACEBOOK: "facebook",
  INSTAGRAM: "instagram",
  TWITTER: "twitter",
  LINKEDIN: "linkedin",
  TIKTOK: "tiktok",
  YOUTUBE: "youtube",
  PINTEREST: "pinterest",
  REDDIT: "reddit",
  THREADS: "threads",
  BLUESKY: "bluesky",
  SNAPCHAT: "snapchat",
  TELEGRAM: "telegram",
  GOOGLE_BUSINESS: "gmb",
  WHATSAPP: "whatsapp", // WhatsApp is for Business messaging in beta (not normal post publishing)
};

// Platforms supported for scheduling social posts (excludes WhatsApp messaging)
export const POST_SCHEDULER_PLATFORMS = [
  PLATFORMS.FACEBOOK,
  PLATFORMS.INSTAGRAM,
  PLATFORMS.TWITTER,
  PLATFORMS.LINKEDIN,
  PLATFORMS.TIKTOK,
  PLATFORMS.YOUTUBE,
  PLATFORMS.PINTEREST,
  PLATFORMS.REDDIT,
  PLATFORMS.THREADS,
  PLATFORMS.BLUESKY,
  PLATFORMS.SNAPCHAT,
  PLATFORMS.TELEGRAM,
  PLATFORMS.GOOGLE_BUSINESS,
];

// Helper to convert Ayrshare platform name to Prisma enum
export const getPlatformEnum = (platformStr) => {
  if (!platformStr) return null;
  const normalized = platformStr.toLowerCase();
  for (const [enumKey, val] of Object.entries(PLATFORMS)) {
    if (val === normalized || enumKey.toLowerCase() === normalized) {
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
