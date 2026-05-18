import { ADMIN_COIN_BALANCE } from "../constants/coins";
import { useAuthStore } from "../store/authStore";
import { useCoinStore } from "../store/coinStore";

export const useIsAdminCoinAccount = () => {
  return useAuthStore((state) => state.profile?.role === "admin");
};

export const useEffectiveCoinBalance = () => {
  const balance = useCoinStore((state) => state.balance);
  const isAdmin = useIsAdminCoinAccount();

  return isAdmin ? ADMIN_COIN_BALANCE : balance;
};
