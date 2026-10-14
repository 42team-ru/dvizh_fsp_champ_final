type FieldErrorLike = {
  message?: string;
};

export function getFirstFieldError(
  errors: Array<string | FieldErrorLike | undefined>,
) {
  const firstError = errors[0];

  if (typeof firstError === "string") {
    return firstError;
  }

  return firstError?.message;
}
