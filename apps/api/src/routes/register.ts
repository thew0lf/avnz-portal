// New endpoint for organization registration
import { Router } from 'express';
import { createOrg } from '../controllers/org.controller';

const router = Router();

router.post('/', createOrg);

export default router;
