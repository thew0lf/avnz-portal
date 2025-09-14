export declare function sendInviteSms(to: string, token: string, opts?: {
    shortCode?: string;
    clientName?: string;
    clientId?: string;
    orgId?: string;
}): Promise<void>;
