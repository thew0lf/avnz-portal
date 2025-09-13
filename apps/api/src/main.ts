import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { Module, MiddlewareConsumer, NestModule } from "@nestjs/common";
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

@Module({ controllers:[UsageController,ComplianceController,PricingController,AuthController,OrgsController,ClientsController,ProjectsController,MembershipsController,RolesController,ProjectMembersController] })
class AppModule implements NestModule { configure(c:MiddlewareConsumer){ c.apply(rateLimitMiddleware, authMiddleware).forRoutes("*"); } }

async function bootstrap(){ const app=await NestFactory.create(AppModule,{cors:true}); const port=Number(process.env.PORT||3001); await migrate(); await app.listen(port); console.log("API listening on", port); }
bootstrap();
