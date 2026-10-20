create table organization_subscriptions (
    id uuid primary key,
    organization_id uuid not null references organizations(id),
    user_id uuid not null references users(id),
    created_at timestamptz not null,
    updated_at timestamptz not null,
    constraint uq_organization_subscriptions unique (organization_id, user_id)
);
create index ix_organization_subscriptions_user on organization_subscriptions(user_id, organization_id);
