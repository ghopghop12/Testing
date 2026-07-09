import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import streamRouter from "./v1/stream.js";
import searchRouter from "./v1/search.js";
import lyricsRouter from "./v1/lyrics.js";
import usageRouter from "./v1/usage.js";
import keysRouter from "./v1/keys.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/v1", streamRouter);
router.use("/v1", searchRouter);
router.use("/v1", lyricsRouter);
router.use("/v1", usageRouter);
router.use("/v1", keysRouter);

export default router;
