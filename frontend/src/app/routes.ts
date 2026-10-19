import {
  type RouteConfig,
  index,
  layout,
  prefix,
  route,
} from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("pet", "routes/pet.tsx"),
  ...prefix("/auth", [
    layout("routes/auth/auth-layout.tsx", [
      route("login", "routes/auth/login.tsx"),
      route("register", "routes/auth/register.tsx"),
      route("forgot-password", "routes/auth/forgot-password.tsx"),
    ]),
    route("oauth2/callback", "routes/auth/oauth2-callback.tsx"),
  ]),
  layout("providers/guards/auth-guard.tsx", [
    layout("routes/dashboard/layout.tsx", [
      ...prefix("/dashboard", [index("routes/dashboard/index.tsx")]),
    ]),
  ]),
] satisfies RouteConfig;
