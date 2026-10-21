/**
 * ServiceProvider Controller Implementation
 */

import { NextFunction, Request, RequestHandler, Response } from "express";
import { Prisma } from "@prisma/client";
import {
  IServiceProviderService,
  ServiceProviderQueryOptions,
} from "../../types/serviceProviders";
import { sendSuccess } from "../../utils/http";
import { ValidationError } from "../../utils/errors";

const SORT_FIELDS = ["name", "createdAt", "updatedAt"] as const;

type ServiceProviderSortField = (typeof SORT_FIELDS)[number];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function queryString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function queryInt(value: unknown): number | undefined {
  if (typeof value !== "string" || value.trim() === "") {
    return undefined;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function querySortField(value: unknown): ServiceProviderSortField | undefined {
  return SORT_FIELDS.find((field) => field === value);
}

function querySortOrder(value: unknown): "asc" | "desc" | undefined {
  return value === "asc" || value === "desc" ? value : undefined;
}

function readMetadata(value: unknown): Prisma.JsonValue | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }
  if (typeof value === "object") {
    return value as Prisma.JsonValue;
  }
  return undefined;
}

function metadataError(value: unknown): string | null {
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value !== "object") {
    return "Metadata must be a valid JSON object";
  }
  try {
    JSON.stringify(value);
  } catch {
    return "Metadata contains invalid JSON values";
  }
  return null;
}

function reject(next: NextFunction, details: string[], message: string): void {
  next(new ValidationError(message, details));
}

const createServiceProviderValidation: RequestHandler = (req, _res, next) => {
  if (!isRecord(req.body)) {
    reject(next, ["Request body must be an object"], "Invalid input data");
    return;
  }

  const details: string[] = [];
  const name = req.body.name;
  if (typeof name !== "string" || name.trim().length === 0) {
    details.push("Name is required");
  } else if (name.trim().length > 100) {
    details.push("Name must be 100 characters or less");
  }

  const description = req.body.description;
  if (description !== undefined && description !== null) {
    if (typeof description !== "string" || description.trim().length > 500) {
      details.push("Description must be 500 characters or less");
    }
  }

  const metadataIssue = metadataError(req.body.metadata);
  if (metadataIssue) {
    details.push(metadataIssue);
  }

  if (details.length > 0) {
    reject(next, details, "Invalid input data");
    return;
  }

  if (typeof req.body.name === "string") {
    req.body.name = req.body.name.trim();
  }
  if (typeof req.body.description === "string") {
    req.body.description = req.body.description.trim();
  }
  next();
};

const updateServiceProviderValidation: RequestHandler = (req, _res, next) => {
  const details: string[] = [];
  if (!req.params.id || req.params.id.trim().length === 0) {
    details.push("Service provider ID is required");
  }

  if (!isRecord(req.body)) {
    details.push("Request body must be an object");
    reject(next, details, "Invalid input data");
    return;
  }

  const name = req.body.name;
  if (name !== undefined) {
    if (typeof name !== "string" || name.trim().length === 0) {
      details.push("Name cannot be empty");
    } else if (name.trim().length > 100) {
      details.push("Name must be 100 characters or less");
    }
  }

  const description = req.body.description;
  if (description !== undefined && description !== null) {
    if (typeof description !== "string" || description.trim().length > 500) {
      details.push("Description must be 500 characters or less");
    }
  }

  const metadataIssue = metadataError(req.body.metadata);
  if (metadataIssue) {
    details.push(metadataIssue);
  }

  if (details.length > 0) {
    reject(next, details, "Invalid input data");
    return;
  }

  if (typeof req.body.name === "string") {
    req.body.name = req.body.name.trim();
  }
  if (typeof req.body.description === "string") {
    req.body.description = req.body.description.trim();
  }
  next();
};

const listServiceProviderValidation: RequestHandler = (req, _res, next) => {
  const details: string[] = [];
  const page = req.query.page;
  if (page !== undefined) {
    const parsed = queryInt(page);
    if (parsed === undefined || parsed < 1) {
      details.push("Page must be a positive integer");
    }
  }

  const limit = req.query.limit;
  if (limit !== undefined) {
    const parsed = queryInt(limit);
    if (parsed === undefined || parsed < 1 || parsed > 100) {
      details.push("Limit must be between 1 and 100");
    }
  }

  const sortBy = req.query.sortBy;
  if (sortBy !== undefined && !querySortField(sortBy)) {
    details.push("sortBy must be one of: name, createdAt, updatedAt");
  }

  const sortOrder = req.query.sortOrder;
  if (sortOrder !== undefined && !querySortOrder(sortOrder)) {
    details.push("sortOrder must be either asc or desc");
  }

  const search = req.query.search;
  if (typeof search === "string" && search.trim().length > 100) {
    details.push("Search term must be 100 characters or less");
  }

  if (details.length > 0) {
    reject(next, details, "Invalid query parameters");
    return;
  }

  if (typeof req.query.search === "string") {
    req.query.search = req.query.search.trim();
  }
  next();
};

const requireServiceProviderId: RequestHandler = (req, _res, next) => {
  if (!req.params.id || req.params.id.trim().length === 0) {
    reject(next, ["Service provider ID is required"], "Invalid input data");
    return;
  }
  next();
};

export class ServiceProviderController {
  constructor(private serviceProviderService: IServiceProviderService) {}

  static createValidation: RequestHandler[] = [createServiceProviderValidation];

  static updateValidation: RequestHandler[] = [updateServiceProviderValidation];

  static getListValidation: RequestHandler[] = [listServiceProviderValidation];

  static getByIdValidation: RequestHandler[] = [requireServiceProviderId];

  static deleteValidation: RequestHandler[] = [requireServiceProviderId];

  /**
   * Create a new service provider
   */
  async createServiceProvider(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const body = isRecord(req.body) ? req.body : {};
      const serviceProvider =
        await this.serviceProviderService.createServiceProvider({
          name: typeof body.name === "string" ? body.name : "",
          description:
            typeof body.description === "string" ? body.description : undefined,
          metadata: readMetadata(body.metadata),
        });

      sendSuccess(
        res,
        { serviceProvider },
        "Service provider created successfully",
        201,
      );
    } catch (error: unknown) {
      next(error);
    }
  }

  /**
   * Get a service provider by ID
   */
  async getServiceProviderById(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const serviceProvider =
        await this.serviceProviderService.getServiceProviderById(req.params.id);

      sendSuccess(res, { serviceProvider });
    } catch (error: unknown) {
      next(error);
    }
  }

  /**
   * Get list of service providers with pagination
   */
  async getServiceProviders(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const options: ServiceProviderQueryOptions = {
        page: queryInt(req.query.page) ?? 1,
        limit: queryInt(req.query.limit) ?? 10,
        sortBy: querySortField(req.query.sortBy) ?? "createdAt",
        sortOrder: querySortOrder(req.query.sortOrder) ?? "desc",
        search: queryString(req.query.search),
      };

      const result =
        await this.serviceProviderService.getServiceProviders(options);
      sendSuccess(res, result);
    } catch (error: unknown) {
      next(error);
    }
  }

  /**
   * Update a service provider
   */
  async updateServiceProvider(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const body = isRecord(req.body) ? req.body : {};
      const serviceProvider =
        await this.serviceProviderService.updateServiceProvider(req.params.id, {
          name: typeof body.name === "string" ? body.name : undefined,
          description:
            typeof body.description === "string" ? body.description : undefined,
          metadata: readMetadata(body.metadata),
        });

      sendSuccess(
        res,
        { serviceProvider },
        "Service provider updated successfully",
      );
    } catch (error: unknown) {
      next(error);
    }
  }

  /**
   * Delete a service provider
   */
  async deleteServiceProvider(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      await this.serviceProviderService.deleteServiceProvider(req.params.id);
      sendSuccess(res, undefined, "Service provider deleted successfully");
    } catch (error: unknown) {
      next(error);
    }
  }
}

/**
 * Factory function to create ServiceProvider controller
 */
export function createServiceProviderController(
  serviceProviderService: IServiceProviderService,
): ServiceProviderController {
  return new ServiceProviderController(serviceProviderService);
}
