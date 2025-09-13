export declare class NodesController {
    get(id: string): Promise<any>;
    children(id: string): Promise<{
        rows: any[];
    }>;
    create(body: any, req?: any): Promise<any>;
    update(id: string, body: any, req?: any): Promise<any>;
    remove(id: string, req?: any): Promise<{
        ok: boolean;
    }>;
}
