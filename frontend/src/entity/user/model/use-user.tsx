import {
  getMeAuthMeGetQueryKey,
  useMeAuthMeGet,
  type meAuthMeGetResponseSuccess,
} from "@/shared/api/generated/core/auth/auth";
import type { UserRead } from "@/shared/api/generated/core/hackathonTemplateAPI.schemas";

export const USER_QUERY_KEY = getMeAuthMeGetQueryKey();

const isAuthMeSuccess = (
  response?: unknown,
): response is meAuthMeGetResponseSuccess & { data: UserRead } =>
  (response as { status?: number })?.status === 200;

export const useUser = () => {
  const query = useMeAuthMeGet({
    query: {
      queryKey: USER_QUERY_KEY,
      staleTime: 5 * 60 * 1000,
      retry: false,
      refetchOnWindowFocus: false,
    },
  });

  const user: UserRead | undefined = isAuthMeSuccess(query.data)
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
