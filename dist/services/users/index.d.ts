/**
 * User Service Implementation
 */
import { IUserService, IUserRepository, RegisterRequest, RegisterResponse, LoginRequest, LoginResponse, LogoutResponse, GoogleOAuthUser, User, TokenPayload, GetProfileResponse, UpdateProfileRequest, UpdateProfileResponse, ChangePasswordRequest, ChangePasswordResponse, CreateAdminRequest, CreateAdminResponse } from "../../types/users";
export declare class UserService implements IUserService {
    private userRepository;
    constructor(userRepository: IUserRepository);
    register(data: RegisterRequest): Promise<RegisterResponse>;
    login(data: LoginRequest): Promise<LoginResponse>;
    logout(): Promise<LogoutResponse>;
    getProfile(userId: string): Promise<GetProfileResponse>;
    updateProfile(userId: string, data: UpdateProfileRequest): Promise<UpdateProfileResponse>;
    changePassword(userId: string, data: ChangePasswordRequest): Promise<ChangePasswordResponse>;
    handleGoogleOAuth(googleUser: GoogleOAuthUser): Promise<User>;
    createAdmin(data: CreateAdminRequest): Promise<CreateAdminResponse>;
    hashPassword(password: string): Promise<string>;
    comparePassword(password: string, hash: string): Promise<boolean>;
    generateAccessToken(payload: TokenPayload): string;
    verifyAccessToken(token: string): TokenPayload | null;
    private toUserResponse;
}
export declare const createUserService: (userRepository: IUserRepository) => IUserService;
//# sourceMappingURL=index.d.ts.map