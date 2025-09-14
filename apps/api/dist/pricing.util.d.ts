export type Metric = 'embed_tokens' | 'input_tokens' | 'output_tokens';
export declare function unitPrice(provider: string, model: string, metric: Metric, orgId: string, userId?: string, roles?: string[]): Promise<number>;
