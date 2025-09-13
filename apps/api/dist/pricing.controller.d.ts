import type { Request } from "express";
type ReqX = Request & {
    auth?: {
        userId?: string;
        orgId?: string;
        orgUUID?: string;
        roles?: string[];
    };
};
type Metric = "embed_tokens" | "input_tokens" | "output_tokens";
type Scope = "default" | "org" | "role" | "user";
export interface PricingRule {
    id: number;
    scope: Scope;
    org_id?: string | null;
    role?: string | null;
    user_id?: string | null;
    provider: string;
    model: string;
    metric: Metric;
    price_per_1k: number;
    currency: string;
    active: boolean;
    created_at?: string;
    deleted_at?: string | null;
}
export declare class PricingController {
    test(req: ReqX): Promise<{
        provider: string;
        model: string;
        tokens: {
            in: number;
            out: number;
            embed: number;
        };
        unit: {
            input: number;
            output: number;
            embed: number;
        };
        cost_usd: number;
    }>;
    private unitPrice;
    list(req: ReqX): Promise<{
        rows: any;
    }>;
    create(req: ReqX, body: Partial<PricingRule> & {
        price_per_1k?: number;
    }): Promise<any>;
    softDelete(req: ReqX, id: string): Promise<{
        ok: boolean;
    }>;
}
export {};
