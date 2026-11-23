import "dotenv/config";
import app from "./app.js";
import prisma from "./config/db.js";

const PORT = process.env.PORT || 8085;

async function startServer() {
  try {
    await prisma.$connect();
    console.log("Database connected successfully.");
  } catch (error) {
    console.warn("Database connection notice (check DATABASE_URL in .env):", error.message);
  }

  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}

startServer();
