import "dotenv/config";
import Zernio from "@zernio/node";

const apiKey = process.env.ZERNIO_API_KEY || "development_key_placeholder";

const zernio = new Zernio({
  apiKey,
});

export default zernio;
