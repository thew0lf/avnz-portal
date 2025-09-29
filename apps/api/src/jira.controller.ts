import { BadRequestException, Controller, Get, Post, Query, Req, Param, ForbiddenException } from '@nestjs/common';

// Additional security checks
if (!isAuthorized(req.user)) {
    throw new ForbiddenException('You do not have permission to access this resource.');
}
