-- =====================================================================
-- 004_content_sensitivity.sql
--
-- THE PROBLEM THIS SOLVES
--   Gating by tier alone forces a bad choice: either minors are capped at
--   Street and cannot enter the open world at all, or the Block opens and
--   the story hints inside it open with it.
--
--   Neither is right. The ministry exists to reach kids - locking them out
--   of the Block defeats the point. But the Block contains the hints.
--
-- THE FIX
--   Separate PLACE from CONTENT. A minor can stand in the Block. What they
--   cannot see is the sensitive material sitting inside it. Two independent
--   axes, checked independently.
--
--     tier              -> where you can go       (street/block/porch/crib)
--     sensitivity       -> what you can see there (open/mature/heavy)
--
--   The Alley Cat deep story is 'heavy'. Heavy is crib-only AND adult-only,
--   so it stays exactly where you put it. The Block hints are 'mature'.
--
-- Idempotent. Safe to re-run.
-- =====================================================================

begin;

do $$
begin
    if not exists (select 1 from pg_type where typname = 'sensitivity') then
        -- open   : anyone, any age. The base game. PG / PG-13.
        -- mature : adult only. Block-tier hints, implication, aftermath.
        -- heavy  : adult AND crib. The eight. Named, shown, explained.
        create type sensitivity as enum ('open', 'mature', 'heavy');
    end if;
end $$;

-- ---------------------------------------------------------------------
-- Content registry. Every gated asset declares BOTH axes.
-- ---------------------------------------------------------------------
create table if not exists content_items (
    code            text primary key,
    label           text not null,
    min_tier        tier        not null default 'street',
    min_sensitivity sensitivity not null default 'open',
    note            text
);

comment on table content_items is
    'Every gated narrative asset. Two axes: where it lives, how heavy it is.';

insert into content_items (code, label, min_tier, min_sensitivity, note) values
    ('base_campaign',   'Alley Cat - 9 chapter campaign', 'street', 'open',
     'The full base game. Ch.1 cut-away is the only depiction. Never gated.'),
    ('block_hints',     'Block-tier story hints',          'block',  'mature',
     'Implication and aftermath. No depiction. Adult only.'),
    ('porch_context',   'Porch-tier context',              'porch',  'mature',
     'Fuller picture, still no depiction.'),
    ('the_eight',       'The eight - full account',        'crib',   'heavy',
     'The killings, named and shown. Staff/Pit adults only.'),
    ('ninth_ask',       'The ninth ask - full account',    'crib',   'heavy',
     'The Big Dog returning for Whiskers. Crib only.')
on conflict (code) do nothing;

-- ---------------------------------------------------------------------
-- Sensitivity clearance. Independent of tier.
--   open   : everyone
--   mature : verified adult
--   heavy  : verified adult AND a human grant (staff or pit)
-- ---------------------------------------------------------------------
create or replace function member_sensitivity_ceiling(m_id uuid)
returns sensitivity
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
    select case
        when member_is_adult(m_id)
             and (member_is_staff(m_id) or member_is_pit(m_id))
                                        then 'heavy'::sensitivity
        when member_is_adult(m_id)      then 'mature'::sensitivity
        else 'open'::sensitivity
    end;
$$;

-- ---------------------------------------------------------------------
-- Place ceiling, revised.
--
-- CHANGE FROM 003: non-adults may now reach 'block'. They can walk into
-- the open world. They cannot see anything above 'open' sensitivity while
-- they are in it, so the hints stay shut. Porch and Crib remain closed.
-- ---------------------------------------------------------------------
create or replace function member_tier_ceiling(m_id uuid)
returns tier
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
    select case
        when (member_is_staff(m_id) or member_is_pit(m_id))
             and member_is_adult(m_id)  then 'crib'::tier
        when member_is_adult(m_id)      then 'porch'::tier
        else 'block'::tier
    end;
$$;

comment on function member_tier_ceiling(uuid) is
    'Where a member may go. Non-adults reach block (the open world) but are '
    'held to open sensitivity by member_sensitivity_ceiling. Crib requires '
    'a human grant AND verified adult.';

-- ---------------------------------------------------------------------
-- THE gate. Both axes must pass. This is what the app calls.
-- ---------------------------------------------------------------------
create or replace function member_can_view(m_id uuid, item_code text)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
    select coalesce(
        (
            select member_can_access(m_id, ci.min_tier)
                   and ci.min_sensitivity <= member_sensitivity_ceiling(m_id)
            from content_items ci where ci.code = item_code
        ),
        false
    );
$$;

comment on function member_can_view(uuid, text) is
    'THE content gate. Place AND sensitivity, both enforced. Unknown item '
    'code returns false. Call this for every gated asset.';

commit;
