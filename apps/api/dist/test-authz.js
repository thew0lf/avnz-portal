import { pool } from './db.js';
import { randomUUID } from 'node:crypto';
import { AuthzService } from './authz/authz.service.js';
async function run() {
    const c = await pool.connect();
    try {
        console.log('Setting up RBAC sample...');
        await c.query('begin');
        const org = randomUUID();
        const client = randomUUID();
        const company = randomUUID();
        const dept = randomUUID();
        const team = randomUUID();
        const group = randomUUID();
        await c.query(`insert into authz.nodes(id,type,slug,name,parent_id,path) values
      ($1,'org','avnz','Avnz',null,'avnz'::ltree),
      ($2,'client','state','State',$1,'avnz.state'),
      ($3,'company','district','District',$2,'avnz.state.district'),
      ($4,'department','school','School',$3,'avnz.state.district.school'),
      ($5,'team','class','Class',$4,'avnz.state.district.school.class'),
      ($6,'group','groupa','Group A',$5,'avnz.state.district.school.class.groupa')`, [org, client, company, dept, team, group]);
        const roleCompanyAdmin = randomUUID();
        const roleTeamOwner = randomUUID();
        await c.query('insert into authz.roles(id,name,level) values ($1,$2,$3),($4,$5,$6) on conflict do nothing', [roleCompanyAdmin, 'CompanyAdmin', 50, roleTeamOwner, 'TeamOwner', 10]);
        await c.query("insert into authz.actions(name) values ('read_reports'), ('manage_roster') on conflict do nothing");
        const perm1 = randomUUID();
        const perm2 = randomUUID();
        await c.query('insert into authz.permissions(id,domain,resource_type,action_name,min_role_id) values ($1,$2,$3,$4,$5) on conflict do nothing', [perm1, 'node', 'department', 'read_reports', roleCompanyAdmin]);
        await c.query('insert into authz.permissions(id,domain,resource_type,action_name,min_role_id) values ($1,$2,$3,$4,$5) on conflict do nothing', [perm2, 'node', 'team', 'manage_roster', roleTeamOwner]);
        const user = randomUUID();
        await c.query('insert into authz.role_assignments(id,user_id,node_id,role_id) values ($1,$2,$3,$4) on conflict do nothing', [randomUUID(), user, company, roleCompanyAdmin]);
        await c.query('commit');
        const svc = new AuthzService();
        const allow1 = await svc.isAllowed(user, dept, 'node', 'department', 'read_reports');
        const allow2 = await svc.isAllowed(user, team, 'node', 'team', 'manage_roster');
        console.log('Expect true, false ->', allow1.allowed, allow2.allowed);
        if (!allow1.allowed || allow2.allowed) {
            console.error('Authz test failed');
            process.exit(1);
        }
        const roleDeptMgr = randomUUID();
        await c.query('insert into authz.roles(id,name,level) values ($1,$2,$3) on conflict do nothing', [roleDeptMgr, 'DepartmentManager', 30]);
        await c.query("insert into authz.actions(name) values ('view_student_pii') on conflict do nothing");
        const perm3 = randomUUID();
        await c.query('insert into authz.permissions(id,domain,resource_type,action_name,min_role_id) values ($1,$2,$3,$4,$5) on conflict do nothing', [perm3, 'node', 'department', 'view_student_pii', roleDeptMgr]);
        await c.query('insert into authz.role_assignments(id,user_id,node_id,role_id) values ($1,$2,$3,$4) on conflict do nothing', [randomUUID(), user, dept, roleDeptMgr]);
        await c.query('insert into authz.abac_fences(id,action_name,expr) values ($1,$2,$3::jsonb) on conflict do nothing', [randomUUID(), 'view_student_pii', JSON.stringify({ '==': [{ var: 'req.pupilData' }, true] })]);
        const abacFail = await svc.isAllowed(user, dept, 'node', 'department', 'view_student_pii');
        const abacPass = await svc.isAllowed(user, dept, 'node', 'department', 'view_student_pii', { pupilData: true });
        console.log('ABAC expect false,true ->', abacFail.allowed, abacPass.allowed);
        if (abacFail.allowed || !abacPass.allowed) {
            console.error('ABAC test failed');
            process.exit(1);
        }
    }
    finally {
        c.release();
    }
}
run().catch(console.error);
