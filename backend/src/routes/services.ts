import { Router } from "express";
import { prisma } from "../lib/prisma";
import { sendInternalServerError } from "../lib/errors";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const services = await prisma.service.findMany({ orderBy: { id: "asc" } });
    return res.json(services);
  } catch (error) {
    sendInternalServerError(res, error);
  }
});

export default router;
