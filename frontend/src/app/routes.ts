import {
  type RouteConfig,
  index,
  layout,
  prefix,
  route,
} from "@react-router/dev/routes";

export default [
  layout("providers/guards/auth-guard.tsx", [
    index("routes/home.tsx"),
    route("feed", "routes/feed.tsx"),
    route("profile", "routes/profile.tsx"),
    route("users/:id", "routes/user.tsx"),
    route("activity", "routes/activity.tsx"),
    route("onboarding", "routes/onboarding.tsx"),
    route("events/new", "routes/event-create.tsx"),
    route("events/:id", "routes/event.tsx"),
    route("orgs/:id", "routes/org-public.tsx"),
    route("pet", "routes/pet.tsx"),
    layout("providers/guards/admin-guard.tsx", [
      ...prefix("admin", [
        index("routes/admin/overview.tsx"),
        route("organizations", "routes/admin/organizations.tsx"),
        route("organizations/:id", "routes/admin/organization.tsx"),
        route("events", "routes/admin/events.tsx"),
        route("events/:id/comments", "routes/admin/event-comments.tsx"),
        route("users", "routes/admin/users.tsx"),
        route("awards", "routes/admin/awards.tsx"),
        route("pets", "routes/admin/pets.tsx"),
      ]),
    ]),
    layout("providers/guards/cabinet-guard.tsx", [
      route("my/events", "routes/my-events.tsx"),
      route("my/events/:id/manage", "routes/my-event-manage.tsx"),
      route("my/org", "routes/my-org.tsx"),
    ]),
  ]),
  ...prefix("/auth", [
    layout("routes/auth/auth-layout.tsx", [
      route("login", "routes/auth/login.tsx"),
      route("register", "routes/auth/register.tsx"),
    ]),
  ]),
] satisfies RouteConfig;
