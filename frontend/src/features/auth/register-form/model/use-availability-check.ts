import { useCallback, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getCheckEmailAvailabilityAuthCheckEmailGetQueryOptions,
  getCheckUsernameAvailabilityAuthCheckUsernameGetQueryOptions,
} from "@/shared/api/generated/core/auth/auth";
import type { AvailabilityResponse } from "@/shared/api/generated/core/hackathonTemplateAPI.schemas";
import { registerEmailSchema, registerUsernameSchema } from "./register-shema";

type AvailabilityQueryResult = {
  status: number;
  data: AvailabilityResponse;
};

function getAvailability(
  response: AvailabilityQueryResult | undefined,
): boolean | null {
  if (!response || response.status !== 200) {
    return null;
  }
  return response.data.available ?? false;
}

function clearFieldRemoteError(
  formRef: React.RefObject<any>,
  name: "username" | "email",
) {
  const currentForm = formRef.current;
  if (!currentForm) return;

  currentForm.setFieldMeta(name, (prev: any) => {
    const nextErrorMap = { ...prev.errorMap };
    const nextErrorSourceMap = { ...prev.errorSourceMap };
    delete nextErrorMap.onDynamic;
    delete nextErrorSourceMap.onDynamic;

    return {
      ...prev,
      errors: Object.values(nextErrorMap).filter(
        (value): value is string =>
          typeof value === "string" && value.length > 0,
      ),
      errorMap: nextErrorMap,
      errorSourceMap: nextErrorSourceMap,
    };
  });
}

function setFieldRemoteError(
  formRef: React.RefObject<any>,
  name: "username" | "email",
  message: string,
) {
  const currentForm = formRef.current;
  if (!currentForm) return;

  currentForm.setFieldMeta(name, (prev: any) => {
    const nextErrorMap = { ...prev.errorMap, onDynamic: message };
    const nextErrorSourceMap = {
      ...prev.errorSourceMap,
      onDynamic: "onDynamic",
    };

    return {
      ...prev,
      isTouched: true,
      errors: Object.values(nextErrorMap).filter(
        (value): value is string =>
          typeof value === "string" && value.length > 0,
      ),
      errorMap: nextErrorMap,
      errorSourceMap: nextErrorSourceMap,
    };
  });
}

export type AvailabilityCheckState = {
  isChecking: boolean;
  isAvailable: boolean | null;
  schedule: (value: string) => void;
  checkNow: (value: string) => Promise<boolean | null>;
};

export function useUsernameAvailability(formRef: React.RefObject<any>): AvailabilityCheckState {
  const queryClient = useQueryClient();
  const [isChecking, setIsChecking] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const checkIdRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchAvailability = useCallback(
    (username: string) => {
      const queryOptions =
        getCheckUsernameAvailabilityAuthCheckUsernameGetQueryOptions({
          username,
        });

      return queryClient.fetchQuery({
        ...queryOptions,
        retry: false,
        staleTime: 0,
      });
    },
    [queryClient],
  );

  const schedule = useCallback(
    (value: string) => {
      const trimmedValue = value.trim();
      if (timerRef.current) clearTimeout(timerRef.current);
      checkIdRef.current += 1;
      const requestId = checkIdRef.current;

      clearFieldRemoteError(formRef, "username");
      setIsAvailable(null);

      if (!registerUsernameSchema.safeParse(trimmedValue).success) {
        setIsChecking(false);
        return;
      }

      setIsChecking(true);

      timerRef.current = setTimeout(async () => {
        try {
          const response = (await fetchAvailability(trimmedValue)) as
            | AvailabilityQueryResult
            | undefined;
          if (checkIdRef.current !== requestId) return;

          const available = getAvailability(response);
          setIsAvailable(available);

          if (available === false) {
            setFieldRemoteError(formRef, "username", "Это имя пользователя уже занято.");
          } else if (available === true) {
            clearFieldRemoteError(formRef, "username");
          }
        } catch {
          if (checkIdRef.current !== requestId) return;
          setIsAvailable(null);
        } finally {
          if (checkIdRef.current === requestId) setIsChecking(false);
        }
      }, 500);
    },
    [formRef, fetchAvailability],
  );

  const checkNow = useCallback(
    async (value: string): Promise<boolean | null> => {
      try {
        const response = (await fetchAvailability(value.trim())) as
          | AvailabilityQueryResult
          | undefined;
        const available = getAvailability(response);
        setIsAvailable(available);

        if (available === false) {
          setFieldRemoteError(formRef, "username", "Это имя пользователя уже занято.");
        } else if (available === true) {
          clearFieldRemoteError(formRef, "username");
        }

        return available;
      } catch {
        setIsAvailable(null);
        return null;
      }
    },
    [formRef, fetchAvailability],
  );

  return { isChecking, isAvailable, schedule, checkNow };
}

export function useEmailAvailability(formRef: React.RefObject<any>): AvailabilityCheckState {
  const queryClient = useQueryClient();
  const [isChecking, setIsChecking] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const checkIdRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchAvailability = useCallback(
    (email: string) => {
      const queryOptions = getCheckEmailAvailabilityAuthCheckEmailGetQueryOptions(
        { email },
      );

      return queryClient.fetchQuery({
        ...queryOptions,
        retry: false,
        staleTime: 0,
      });
    },
    [queryClient],
  );

  const schedule = useCallback(
    (value: string) => {
      const trimmedValue = value.trim();
      if (timerRef.current) clearTimeout(timerRef.current);
      checkIdRef.current += 1;
      const requestId = checkIdRef.current;

      clearFieldRemoteError(formRef, "email");
      setIsAvailable(null);

      if (!registerEmailSchema.safeParse(trimmedValue).success) {
        setIsChecking(false);
        return;
      }

      setIsChecking(true);

      timerRef.current = setTimeout(async () => {
        try {
          const response = (await fetchAvailability(trimmedValue)) as
            | AvailabilityQueryResult
            | undefined;
          if (checkIdRef.current !== requestId) return;

          const available = getAvailability(response);
          setIsAvailable(available);

          if (available === false) {
            setFieldRemoteError(formRef, "email", "Этот email уже используется.");
          } else if (available === true) {
            clearFieldRemoteError(formRef, "email");
          }
        } catch {
          if (checkIdRef.current !== requestId) return;
          setIsAvailable(null);
        } finally {
          if (checkIdRef.current === requestId) setIsChecking(false);
        }
      }, 500);
    },
    [formRef, fetchAvailability],
  );

  const checkNow = useCallback(
    async (value: string): Promise<boolean | null> => {
      try {
        const response = (await fetchAvailability(value.trim())) as
          | AvailabilityQueryResult
          | undefined;
        const available = getAvailability(response);
        setIsAvailable(available);

        if (available === false) {
          setFieldRemoteError(formRef, "email", "Этот email уже используется.");
        } else if (available === true) {
          clearFieldRemoteError(formRef, "email");
        }

        return available;
      } catch {
        setIsAvailable(null);
        return null;
      }
    },
    [formRef, fetchAvailability],
  );

  return { isChecking, isAvailable, schedule, checkNow };
}

export { clearFieldRemoteError, setFieldRemoteError };
