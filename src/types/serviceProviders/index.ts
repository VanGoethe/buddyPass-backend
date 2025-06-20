/**
 * ServiceProvider Type Definitions
 */

import { Prisma } from "@prisma/client";
import { ICountry } from "../countries";

// Entity Interface
export interface IServiceProvider {
  id: string;
  name: string;
  description?: string | null;
  metadata?: Prisma.JsonValue | null;
  createdAt: Date;
  updatedAt: Date;
  supportedCountries?: { country: ICountry }[];
}

// DTOs for API Requests
export interface CreateServiceProviderData {
  name: string;
  description?: string;
  metadata?: Prisma.JsonValue;
  supportedCountryIds?: string[];
}

export interface UpdateServiceProviderData {
  name?: string;
  description?: string;
  metadata?: Prisma.JsonValue;
  supportedCountryIds?: string[];
}

// DTOs for API Responses
export interface ServiceProviderResponse {
  id: string;
  name: string;
  description?: string | null;
  metadata?: Prisma.JsonValue | null;
  supportedCountries?: Array<{
    id: string;
    name: string;
    code: string;
    alpha3: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceProviderListResponse {
  serviceProviders: ServiceProviderResponse[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

// Query Options
export interface ServiceProviderQueryOptions {
  page?: number;
  limit?: number;
  sortBy?: "name" | "createdAt" | "updatedAt";
  sortOrder?: "asc" | "desc";
  search?: string;
  countryId?: string;
}

// Repository Interface
export interface IServiceProviderRepository {
  create(data: CreateServiceProviderData): Promise<IServiceProvider>;
  findById(
    id: string,
    includeCountries?: boolean
  ): Promise<IServiceProvider | null>;
  findMany(options?: ServiceProviderQueryOptions): Promise<{
    serviceProviders: IServiceProvider[];
    total: number;
  }>;
  update(
    id: string,
    data: UpdateServiceProviderData
  ): Promise<IServiceProvider>;
  delete(id: string): Promise<void>;
  existsByName(name: string, excludeId?: string): Promise<boolean>;
  addSupportedCountries(
    serviceProviderId: string,
    countryIds: string[]
  ): Promise<void>;
  removeSupportedCountries(
    serviceProviderId: string,
    countryIds: string[]
  ): Promise<void>;
  getSupportedCountries(serviceProviderId: string): Promise<ICountry[]>;
}

// Service Interface
export interface IServiceProviderService {
  createServiceProvider(
    data: CreateServiceProviderData
  ): Promise<ServiceProviderResponse>;
  getServiceProviderById(id: string): Promise<ServiceProviderResponse>;
  getServiceProviders(
    options?: ServiceProviderQueryOptions
  ): Promise<ServiceProviderListResponse>;
  updateServiceProvider(
    id: string,
    data: UpdateServiceProviderData
  ): Promise<ServiceProviderResponse>;
  deleteServiceProvider(id: string): Promise<void>;
}
