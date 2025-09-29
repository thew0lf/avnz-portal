import { createOrgAndUser } from './services/orgService';

async function bootstrap() {
    const org = await createOrgAndUser('Initial Org', 'admin@example.com', 'password');
    console.log('Bootstrap completed:', org);
}

bootstrap();
