-- Home's red badges go down one item at a time as you look at each invite or
-- friend activity. An item is "seen" if it's older than the tab's watermark
-- (users.last_seen_friends_at / last_seen_invites_at) or listed here. Once every
-- item newer than the watermark is seen, the app moves the watermark up and
-- clears these rows, so the table stays small.

create table public.seen_items (
  user_id uuid not null default auth.uid() references public.users (id) on delete cascade,
  kind text not null check (kind in ('friends', 'invites')),
  item_key text not null check (length(item_key) between 1 and 300),
  seen_at timestamptz not null default now(),
  primary key (user_id, kind, item_key)
);

alter table public.seen_items enable row level security;

create policy "Own seen items readable" on public.seen_items
  for select to authenticated using (user_id = (select auth.uid()));
create policy "Own seen items added" on public.seen_items
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "Own seen items cleared" on public.seen_items
  for delete to authenticated using (user_id = (select auth.uid()));

revoke all on public.seen_items from anon;
grant select, insert, delete on public.seen_items to authenticated;
