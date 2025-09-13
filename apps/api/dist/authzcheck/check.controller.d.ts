import { AuthzService } from '../authz/authz.service.js';
export declare class CheckController {
    private authz;
    constructor(authz: AuthzService);
    check(body: any): Promise<any>;
}
