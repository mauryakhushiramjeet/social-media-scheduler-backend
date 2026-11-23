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
