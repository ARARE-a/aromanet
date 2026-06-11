import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { authRouter } from "./routers/auth";
import { storeRouter } from "./routers/store";
import { therapistRouter } from "./routers/therapist";
import { customerRouter } from "./routers/customer";
import { reservationRouter } from "./routers/reservation";
import { messageRouter } from "./routers/message";
import { reviewRouter } from "./routers/review";
import { postRouter } from "./routers/post";
import { salesRouter } from "./routers/sales";
import { adminRouter } from "./routers/admin";
import { seedRouter } from "./routers/seed";
import { roomRouter } from "./routers/room";
import { affiliationRouter } from "./routers/affiliation";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  aroAuth: authRouter,
  store: storeRouter,
  therapist: therapistRouter,
  customer: customerRouter,
  reservation: reservationRouter,
  message: messageRouter,
  review: reviewRouter,
  post: postRouter,
  sales: salesRouter,
  admin: adminRouter,
  seed: seedRouter,
  room: roomRouter,
  affiliation: affiliationRouter,
});

export type AppRouter = typeof appRouter;
