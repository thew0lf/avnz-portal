var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { Module } from "@nestjs/common";
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
import { SpecController } from "./spec.controller.js";
import { SpecAuthController } from "./spec-auth.controller.js";
import { AuthzService } from "./authz/authz.service.js";
import { startRbacNotifyListener } from "./db/notify.js";
import { startAuditHousekeeping } from "./audit-housekeeping.js";
import { migrate } from "./migrate.js";
import { authMiddleware } from "./auth.middleware.js";
import { rateLimitMiddleware } from "./rate-limit.middleware.js";
import { securityHeadersMiddleware } from "./security-headers.middleware.js";
import { routeGuardMiddleware } from "./route-guard.middleware.js";
let AppModule = class AppModule {
    configure(c) { c.apply(securityHeadersMiddleware, rateLimitMiddleware, authMiddleware, routeGuardMiddleware).forRoutes("*"); }
};
AppModule = __decorate([
    Module({ controllers: [UsageController, ComplianceController, PricingController, AuthController, OrgsController, ClientsController, ProjectsController, MembershipsController, RolesController, ProjectMembersController, CheckController, NodesController, AdminController, SpecController, SpecAuthController], providers: [AuthzService] })
], AppModule);
async function bootstrap() { const app = await NestFactory.create(AppModule, { cors: true }); const port = Number(process.env.PORT || 3001); await migrate(); startRbacNotifyListener(); startAuditHousekeeping(); await app.listen(port); console.log("API listening on", port); }
bootstrap();
