import { Router, type IRouter } from "express";
import healthRouter from "./health";
import workspacesRouter from "./workspaces";
import filesRouter from "./files";
import aiRouter from "./ai";
import deploymentsRouter from "./deployments";
import containersRouter from "./containers";
import metricsRouter from "./metrics";
import gitRouter from "./git";
import terminalRouter from "./terminal";
import servicesRouter from "./services";

const router: IRouter = Router();

router.use(healthRouter);
router.use(servicesRouter);
router.use(workspacesRouter);
router.use(filesRouter);
router.use(aiRouter);
router.use(deploymentsRouter);
router.use(containersRouter);
router.use(metricsRouter);
router.use(gitRouter);
router.use(terminalRouter);

export default router;
