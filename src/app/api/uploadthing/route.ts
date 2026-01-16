import { createRouteHandler } from "uploadthing/next";
import { ourFileRouter } from "./core";

// Create route handler with token from environment
export const { GET, POST } = createRouteHandler({
  router: ourFileRouter,
  config: {
    token: process.env.UPLOADTHING_TOKEN,
  },
});
