export declare function sendInviteEmail(to: string, token: string, options?: {
    orgName?: string;
    clientName?: string;
    clientId?: string;
    orgId?: string;
}): Promise<void>;
