import { Router } from "express";
import { PrismaService } from "../../../config/prisma.config.js";
import { authenticate } from "../../../middleware/auth.middleware.js";
import { PostsRepository } from "../repositories/posts.repository.js";
import { PostsService } from "../services/posts.service.js";
import { PostsController } from "../controllers/posts.controller.js";

const prisma = PrismaService.getInstance().client;

const repository = new PostsRepository(prisma);
const service = new PostsService(repository);
const controller = new PostsController(service);

const router = Router();

router.get("/", controller.getPosts);
router.get("/search", controller.searchPosts);
router.post("/", authenticate, controller.createPost);

export default router;
