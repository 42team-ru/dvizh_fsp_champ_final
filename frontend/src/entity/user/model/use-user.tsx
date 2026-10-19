import {
  getAuthMeQueryKey,
  useAuthMe,
  type authMeResponseSuccess,
} from "@/shared/api/generated/core/auth/auth";
import type { MeResponse } from "@/shared/api/generated/core/appAPI.schemas";

export const USER_QUERY_KEY = getAuthMeQueryKey();

const isAuthMeSuccess = (
  response?: unknown,
): response is authMeResponseSuccess & { data: MeResponse } =>
  (response as { status?: number })?.status === 200;

export const useUser = () => {
  const query = useAuthMe({
    query: {
      queryKey: USER_QUERY_KEY,
      staleTime: 5 * 60 * 1000,
      retry: false,
      refetchOnWindowFocus: false,
    },
  });

  const user: MeResponse | undefined = isAuthMeSuccess(query.data)
    ? query.data.data
    : undefined;

  return {
    user,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    isFetching: query.isFetching,
    errorUpdatedAt: query.errorUpdatedAt,
  };
};
