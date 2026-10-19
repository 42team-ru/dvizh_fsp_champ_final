create table pet_saved_looks (
    id uuid primary key,
    user_id uuid not null references users(id) on delete cascade,
    name varchar(30) not null,
    activity varchar(100) not null,
    created_at timestamptz not null,
    updated_at timestamptz not null
);
create index ix_pet_saved_looks_user on pet_saved_looks(user_id, created_at);
create table pet_saved_look_outfit (
    look_id uuid not null references pet_saved_looks(id) on delete cascade,
    slot_code varchar(100) not null,
    item_code varchar(100) not null,
    primary key (look_id, slot_code)
);
