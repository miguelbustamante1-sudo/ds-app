import { Router } from 'express';
import myRequestsRoutes from './myRequests.routes';
import supervisorRoutes from './supervisor.routes';
import generalRoutes from './general.routes';
import { activityLogRouter } from './activityLog.routes';

const router = Router();

router.use('/activity-log', activityLogRouter);
router.use('/my-requests', myRequestsRoutes);
router.use('/supervisor', supervisorRoutes);
router.use('/', generalRoutes);

export default router;
