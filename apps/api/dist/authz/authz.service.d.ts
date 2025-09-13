export declare class AuthzService {
    isAllowed(userId: string, resourceNodeId: string, domain: string, resourceType: string, actionName: string, reqAttrs?: any): Promise<any>;
}
