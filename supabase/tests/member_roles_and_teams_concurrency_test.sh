#!/usr/bin/env bash
# Concurrency test for org_change_member_role (202610260001_member_roles_and_teams.sql). Run ONLY
# against a disposable copy of the database, never against production:
#   bash supabase/tests/member_roles_and_teams_concurrency_test.sh "$DISPOSABLE_DB_URL"
#
# Two connections change roles at the same moment. Connection 1 makes its change and keeps the
# transaction open for 2 seconds; connection 2 starts half a second later. The per-organization
# advisory lock must make connection 2 wait (checked by its elapsed time) and then see connection
# 1's result, so an organization can never end up without an active admin.
#   1. Two admins demote each other: one succeeds, the other is refused (its actor is no longer an
#      admin), one admin remains.
#   2. Two admins demote themselves: one succeeds, the other gets last_admin, one admin remains.
# The fixture is committed (two connections need to see it) and deleted at the end.
set -euo pipefail
DB_URL="${1:?usage: $0 <disposable database url>}"
psql_q() { psql "$DB_URL" -X -v ON_ERROR_STOP=1 -Atq "$@"; }

FIXTURE=$(psql_q <<'SQL'
with u as (
  insert into public.users (auth_user_id, email)
  values (gen_random_uuid(), 'race-x@roles-test.example'), (gen_random_uuid(), 'race-y@roles-test.example')
  returning id, email
), org as (
  insert into public.organizations (name, slug, created_by_user_id)
  select 'Race test', 'race-test-' || substr(gen_random_uuid()::text, 1, 8), id from u where email like 'race-x%'
  returning id
), m as (
  insert into public.organization_members (organization_id, user_id, role, status)
  select org.id, u.id, 'organization_admin', 'active' from org, u
  returning id, user_id
), s as (
  -- Supervisor profiles, so demoting to supervisor needs no name.
  insert into public.supervisors (organization_id, user_id, full_name)
  select org.id, u.id, u.email from org, u
  returning id
)
select string_agg(v, ' ') from (
  select (select id::text from org) as v
  union all select (select m.user_id::text from m join u on u.id = m.user_id where u.email like 'race-x%')
  union all select (select m.id::text from m join u on u.id = m.user_id where u.email like 'race-x%')
  union all select (select m.user_id::text from m join u on u.id = m.user_id where u.email like 'race-y%')
  union all select (select m.id::text from m join u on u.id = m.user_id where u.email like 'race-y%')
) ids;
SQL
)
read -r ORG X_USER X_MEMBER Y_USER Y_MEMBER <<<"$FIXTURE"

cleanup() {
  psql_q -c "delete from public.organizations where id = '$ORG'" \
         -c "delete from public.users where email like 'race-_@roles-test.example'" >/dev/null || true
}
trap cleanup EXIT

reset_admins() {
  psql_q -c "update public.organization_members set role = 'organization_admin' where organization_id = '$ORG'"
}

# change <actor> <membership> <role> <hold seconds>: prints "ok" or the error code, then elapsed ms.
change() {
  local start end result
  start=$(date +%s%3N)
  result=$(psql "$DB_URL" -X -Atq 2>&1 <<SQL | grep -oE '^ok$|ERROR: +[a-z_]+' | sed -E 's/ERROR: +//' | head -1
\set ON_ERROR_STOP 1
begin;
select count(*) from public.org_change_member_role('$ORG', '$1', '$2', '$3');
select pg_sleep($4);
commit;
select 'ok';
SQL
  )
  end=$(date +%s%3N)
  echo "${result:-error} $((end - start))"
}

admins() { psql_q -c "select count(*) from public.organization_members where organization_id = '$ORG' and role = 'organization_admin' and status = 'active'"; }

run_pair() { # <label> <actor1> <member1> <actor2> <member2>
  local out1 out2 r1 r2 t2
  reset_admins
  change "$2" "$3" supervisor 2 > /tmp/race1.$$ &
  sleep 0.5
  out2=$(change "$4" "$5" supervisor 0)
  wait
  out1=$(cat /tmp/race1.$$); rm -f /tmp/race1.$$
  r1=${out1% *}; r2=${out2% *}; t2=${out2#* }
  echo "$1: connection 1 -> $r1, connection 2 -> $r2 after ${t2} ms, active admins left: $(admins)"
  [ "$r1" = ok ] || { echo "FAIL: connection 1 should succeed"; exit 1; }
  [ "$r2" = "$6" ] || { echo "FAIL: connection 2 should get $6"; exit 1; }
  [ "$t2" -ge 1200 ] || { echo "FAIL: connection 2 did not wait for connection 1 (${t2} ms)"; exit 1; }
  [ "$(admins)" = 1 ] || { echo "FAIL: exactly one admin should remain"; exit 1; }
}

run_pair "Demote each other " "$X_USER" "$Y_MEMBER" "$Y_USER" "$X_MEMBER" forbidden
run_pair "Demote themselves " "$X_USER" "$X_MEMBER" "$Y_USER" "$Y_MEMBER" last_admin
echo "member_roles_and_teams concurrency: all assertions passed"
