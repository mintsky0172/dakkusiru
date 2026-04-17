export type UserStatus = 'guest' | 'authenticated';

export interface UserProfile {
    id: string;
    status: UserStatus;
    displayName: string;
    email?: string;
    avatarUrl?: string;
}