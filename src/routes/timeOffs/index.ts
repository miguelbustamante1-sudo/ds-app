import { Router } from 'express';
import myRequestsRoutes from './myRequests.routes';
import supervisorRoutes from './supervisor.routes';
import exceptionRoutes from './exception.routes';
import generalRoutes from './general.routes';
import externalRoutes from './external.routes';
import { activityLogRouter } from './activityLog.routes';

const router = Router();

router.use('/activity-log', activityLogRouter);
router.use('/external', externalRoutes);
router.use('/my-requests', myRequestsRoutes);
router.use('/supervisor', supervisorRoutes);
router.use('/exception', exceptionRoutes);
router.use('/', generalRoutes);

export default router;
