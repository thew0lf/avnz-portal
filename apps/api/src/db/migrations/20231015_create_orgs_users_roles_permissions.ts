import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateOrgsUsersRolesPermissions20231015 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE organizations (id SERIAL PRIMARY KEY, name VARCHAR(255), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);`);
        await queryRunner.query(`CREATE TABLE users (id SERIAL PRIMARY KEY, org_id INTEGER REFERENCES organizations(id), email VARCHAR(255), role VARCHAR(50), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);`);
        await queryRunner.query(`CREATE TABLE roles (id SERIAL PRIMARY KEY, name VARCHAR(50), permissions JSONB);`);
        await queryRunner.query(`CREATE TABLE permissions (id SERIAL PRIMARY KEY, name VARCHAR(50), description TEXT);`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE permissions;`);
        await queryRunner.query(`DROP TABLE roles;`);
        await queryRunner.query(`DROP TABLE users;`);
        await queryRunner.query(`DROP TABLE organizations;`);
    }
}
