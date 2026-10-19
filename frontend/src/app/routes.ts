import {
  type RouteConfig,
  index,
  layout,
  prefix,
  route,
} from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("feed", "routes/feed.tsx"),
  route("profile", "routes/profile.tsx"),
  route("activity", "routes/activity.tsx"),
  route("onboarding", "routes/onboarding.tsx"),
  route("events/:id", "routes/event.tsx"),
  route("pet", "routes/pet.tsx"),
  ...prefix("/auth", [
    layout("routes/auth/auth-layout.tsx", [
      route("login", "routes/auth/login.tsx"),
      route("register", "routes/auth/register.tesx"),
      route("forgot-password", "routes/auth/forgot-password.tsx"),
    ]),
    route("oauth2/callback", "routes/auth/oauth2-callback.tsx"),
  ]),
] satisfies RouteConfig;
