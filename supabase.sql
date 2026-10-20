create extension if not exists pgcrypto with schema extensions;

create table users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  password_hash text not null
);
create unique index users_name_key on users (lower(name));

create table device_types (
  id uuid primary key default gen_random_uuid(),
  name text not null
);
create unique index device_types_name_key on device_types (lower(name));

create table ious (
  id uuid primary key default gen_random_uuid(),
  device_type text not null,
  owner_id uuid not null references users(id),
  created_at timestamptz not null default now()
);

create table iou_history (
  id uuid primary key,
  device_type text not null,
  owner_id uuid not null references users(id),
  created_at timestamptz not null,
  used_at timestamptz not null default now()
);

alter table users enable row level security;
alter table device_types enable row level security;
alter table ious enable row level security;
alter table iou_history enable row level security;

create function list_users()
returns table (id uuid, name text)
language sql security definer set search_path = public as $$
  select u.id, u.name from users u order by u.name;
$$;

create function add_user(p_name text, p_password text)
returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  if length(trim(p_name)) = 0 or length(p_password) = 0 then
    raise exception 'Name and password are required';
  end if;
  insert into users (name, password_hash)
  values (trim(p_name), crypt(p_password, gen_salt('bf')));
exception when unique_violation then
  raise exception 'That name is already taken';
end;
$$;

create function list_device_types()
returns setof text
language sql security definer set search_path = public as $$
  select d.name from device_types d order by d.name;
$$;

create function create_iou(p_device_type text, p_owner_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if length(trim(p_device_type)) = 0 then
    raise exception 'Device type is required';
  end if;
  insert into device_types (name) values (trim(p_device_type))
  on conflict (lower(name)) do nothing;
  insert into ious (device_type, owner_id) values (trim(p_device_type), p_owner_id);
end;
$$;

create function list_ious()
returns table (id uuid, device_type text, owner_name text, created_at timestamptz)
language sql security definer set search_path = public as $$
  select i.id, i.device_type, u.name, i.created_at
  from ious i join users u on u.id = i.owner_id
  order by i.created_at desc;
$$;

create function list_history()
returns table (id uuid, device_type text, owner_name text, created_at timestamptz, used_at timestamptz)
language sql security definer set search_path = public as $$
  select h.id, h.device_type, u.name, h.created_at, h.used_at
  from iou_history h join users u on u.id = h.owner_id
  order by h.used_at desc;
$$;

create function use_iou(p_id uuid, p_password text)
returns boolean
language plpgsql security definer set search_path = public, extensions as $$
declare
  r ious%rowtype;
  stored text;
begin
  select * into r from ious where id = p_id for update;
  if not found then
    raise exception 'This item no longer exists';
  end if;
  select password_hash into stored from users where id = r.owner_id;
  if stored <> crypt(p_password, stored) then
    return false;
  end if;
  insert into iou_history (id, device_type, owner_id, created_at)
  values (r.id, r.device_type, r.owner_id, r.created_at);
  delete from ious where id = r.id;
  return true;
end;
$$;
