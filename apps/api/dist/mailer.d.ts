export declare function sendInviteEmail(to: string, token: string, options?: {
    orgName?: string;
    clientName?: string;
    clientId?: string;
    orgId?: string;
}): Promise<void>;
export declare function sendPasswordResetEmail(to: string, token: string, options?: {
    orgName?: string;
    clientName?: string;
    clientId?: string;
    orgId?: string;
}): Promise<void>;
export declare function sendRawEmail(to: string, subject: string, text: string, html?: string, options?: {
    orgId?: string;
    clientId?: string;
}): Promise<{
    from: string;
}>;
