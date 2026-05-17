import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import accountsRouter from "./accounts";
import categoriesRouter from "./categories";
import transactionsRouter from "./transactions";
import budgetsRouter from "./budgets";
import goalsRouter from "./goals";
import dashboardRouter from "./dashboard";
import reportsRouter from "./reports";
import adminRouter from "./admin";
import profileRouter from "./profile";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(accountsRouter);
router.use(categoriesRouter);
router.use(transactionsRouter);
router.use(budgetsRouter);
router.use(goalsRouter);
router.use(dashboardRouter);
router.use(reportsRouter);
router.use(adminRouter);
router.use(profileRouter);

export default router;
