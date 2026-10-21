import { PrismaClient } from "@prisma/client";
import { UserService } from "../../../src/services/users";
import { IUserRepository, User, UserRole } from "../../../src/types/users";
import { ConflictError } from "../../../src/utils/errors";

function user(overrides: Partial<User> = {}): User {
  return {
    id: "user-1",
    email: "person@example.com",
    name: "Person",
    password: null,
    avatar: null,
    googleId: null,
    provider: "local",
    role: UserRole.USER,
    isVerified: true,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLoginAt: null,
    ...overrides,
  };
}

describe("UserService.handleGoogleOAuth", () => {
  const repository: jest.Mocked<IUserRepository> = {
    findById: jest.fn(),
    findByEmail: jest.fn(),
    findByGoogleId: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    updateProfile: jest.fn(),
    updateRole: jest.fn(),
    updateStatus: jest.fn(),
    delete: jest.fn(),
  };

  const service = new UserService(repository, {} as PrismaClient);
  const profile = {
    googleId: "google-1",
    email: "person@example.com",
    name: "Person",
    avatar: undefined,
    emailVerified: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("refuses to link an unverified local account", async () => {
    repository.findByGoogleId.mockResolvedValue(null);
    repository.findByEmail.mockResolvedValue(user({ isVerified: false }));

    await expect(service.handleGoogleOAuth(profile)).rejects.toBeInstanceOf(
      ConflictError
    );
    await expect(service.handleGoogleOAuth(profile)).rejects.toMatchObject({
      code: "GOOGLE_LINK_UNVERIFIED",
    });
    expect(repository.updateProfile).not.toHaveBeenCalled();
    expect(repository.create).not.toHaveBeenCalled();
  });

  it("links a verified local account", async () => {
    const existing = user({ isVerified: true });
    repository.findByGoogleId.mockResolvedValue(null);
    repository.findByEmail.mockResolvedValue(existing);
    repository.updateProfile.mockResolvedValue({
      ...existing,
      googleId: profile.googleId,
    });

    const result = await service.handleGoogleOAuth(profile);

    expect(result.googleId).toBe(profile.googleId);
    expect(repository.updateProfile).toHaveBeenCalledWith(
      existing.id,
      expect.objectContaining({ googleId: profile.googleId })
    );
  });

  it("creates a verified google user when the email is new", async () => {
    repository.findByGoogleId.mockResolvedValue(null);
    repository.findByEmail.mockResolvedValue(null);
    repository.create.mockImplementation(async (data) =>
      user({
        email: data.email,
        googleId: data.googleId,
        provider: data.provider,
        isVerified: true,
      })
    );

    const result = await service.handleGoogleOAuth(profile);

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: profile.email,
        provider: "google",
        isVerified: true,
      })
    );
    expect(result.provider).toBe("google");
  });
});
