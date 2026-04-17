import { UserProfile } from "../types/user";

export const guestUser: UserProfile = {
  id: "guest-user",
  status: "guest",
  displayName: "게스트",
};

export const signedInUser: UserProfile = {
  id: "user-1",
  status: "authenticated",
  displayName: "닉네임",
  email: "example@example.com",
};
