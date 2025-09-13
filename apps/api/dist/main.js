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
import { migrate } from "./migrate.js";
import { authMiddleware } from "./auth.middleware.js";
import { rateLimitMiddleware } from "./rate-limit.middleware.js";
let AppModule = class AppModule {
    configure(c) { c.apply(rateLimitMiddleware, authMiddleware).forRoutes("*"); }
};
AppModule = __decorate([
    Module({ controllers: [UsageController, ComplianceController, PricingController, AuthController, OrgsController, ClientsController, ProjectsController, MembershipsController, RolesController, ProjectMembersController] })
], AppModule);
async function bootstrap() { const app = await NestFactory.create(AppModule, { cors: true }); const port = Number(process.env.PORT || 3001); await migrate(); await app.listen(port); console.log("API listening on", port); }
bootstrap();
