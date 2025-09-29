var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import express from 'express';
import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { UsageController } from "./usage.controller.js";
import { ComplianceController } from "./compliance.controller.js";
import { PricingController } from "./pricing.controller.js";
import { AuthController } from "./auth.controller.js";
import { ClientsController } from "./clients.controller.js";
import { ProjectsController } from "./projects.controller.js";
import { MembershipsController } from "./memberships.controller.js";
import { RolesController } from "./roles.controller.js";
import { ProjectMembersController } from "./project-members.controller.js";
import { OrgsController } from "./orgs.controller.js";
import { CheckController } from "./authzcheck/check.controller.js";
import { NodesController } from "./nodes.controller.js";
import { AdminController } from "./admin.controller.js";
import { HealthController } from "./health.controller.js";
import { BillingController } from "./billing.controller.js";
import { MeController } from "./me.controller.js";
import { OutboxController } from "./outbox.controller.js";
import { SpecController } from "./spec.controller.js";
import { SpecAuthController } from "./spec-auth.controller.js";
import { SlackController } from "./slack.controller.js";
import { JiraController } from "./jira.controller.js";
import { JiraForceController } from "./jira-force.controller.js";
import { AuthzService } from "./authz/authz.service.js";
import { RbacGuard } from "./authz/rbac.guard.js";
import { startRbacNotifyListener } from "./db/notify.js";
import { startAuditHousekeeping } from "./audit-housekeeping.js";
import { migrate } from "./migrate.js";
import { authMiddleware } from "./auth.middleware.js";
import { rateLimitMiddleware } from "./rate-limit.middleware.js";
import { securityHeadersMiddleware } from "./security-headers.middleware.js";
import { routeGuardMiddleware } from "./route-guard.middleware.js";
import { backfillInProgress, requeueStale } from "./jira-backfill.js";
let AppModule = class AppModule {
    configure(c) { c.apply(securityHeadersMiddleware, rateLimitMiddleware, authMiddleware, routeGuardMiddleware).forRoutes("*"); }
};
AppModule = __decorate([
    Module({ controllers: [HealthController, MeController, UsageController, ComplianceController, PricingController, AuthController, OrgsController, ClientsController, ProjectsController, MembershipsController, RolesController, ProjectMembersController, CheckController, NodesController, AdminController, OutboxController, SpecController, SpecAuthController, BillingController, SlackController, JiraController, JiraForceController], providers: [AuthzService, RbacGuard, { provide: APP_GUARD, useClass: RbacGuard }] })
], AppModule);
async function bootstrap() {
    const app = await NestFactory.create(AppModule, { cors: true });
    // Capture raw body for signature verification (e.g., Slack)
    app.use(express.json({ verify: (req, _res, buf) => { req.rawBody = buf; } }));
    app.use(express.urlencoded({ extended: true, verify: (req, _res, buf) => { req.rawBody = buf; } }));
    const port = Number(process.env.PORT || 3001);
    await migrate();
    startRbacNotifyListener();
    startAuditHousekeeping();
    await app.listen(port);
    console.log("API listening on", port);
    if ((process.env.JIRA_BACKFILL_ON_START || '1') === '1') {
        backfillInProgress().catch(() => { });
    }
    const iv = Number(process.env.JIRA_BACKFILL_INTERVAL_SEC || '0');
    if (iv > 0) {
        setInterval(() => backfillInProgress().catch(() => { }), iv * 1000);
        console.log('[jira-backfill] polling enabled every', iv, 'sec');
    }
    const rqIv = Number(process.env.JIRA_REQUEUE_STALE_INTERVAL_SEC || '0');
    const rqMin = Number(process.env.JIRA_REQUEUE_STALE_MINUTES || '30');
    if (rqIv > 0) {
        setInterval(() => requeueStale(rqMin).catch(() => { }), rqIv * 1000);
        console.log('[jira-requeue-stale] polling enabled every', rqIv, 'sec', 'mins=', rqMin);
    }
}
bootstrap();
