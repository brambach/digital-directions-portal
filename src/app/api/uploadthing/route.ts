import { createRouteHandler } from "uploadthing/next";
import { ourFileRouter } from "./core";

// Export route handlers for UploadThing
// UploadThing automatically uses UPLOADTHING_SECRET env var
export const { GET, POST } = createRouteHandler({
  router: ourFileRouter,
});
