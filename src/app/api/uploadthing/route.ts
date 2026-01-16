import { createRouteHandler } from "uploadthing/next";
import { ourFileRouter } from "./core";

const handlers = createRouteHandler({
  router: ourFileRouter,
  config: {
    token: process.env.UPLOADTHING_TOKEN,
    isDev: process.env.NODE_ENV === "development",
  },
});

export const { GET, POST } = handlers;
