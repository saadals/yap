#!/bin/bash
# HTTP sweep: every route must render (200) for signed-out, Nour and Layla sessions (light only: dark mode is paused).
# V2: one account, two modes; shared pages (orders, jobs) adapt to the viewer's side.
# (curl runs no JS, so this checks the static HTML; flows/route-smoke-*.json check runtime errors.)
# Usage: scripts/qa/sweep.sh [base_url]   (default http://localhost:3123)
BASE=${1:-http://localhost:3123}
BODY=$(mktemp)
routes=(/ /how-it-works /for-creators /legal /signin "/signin?intent=make" "/signin?new=1" /onboarding "/onboarding?start=make"
  /home /discover "/discover?format=app-demo&lang=es" "/discover?tab=saved" /discover/watch "/discover/watch?creator=laylatalks"
  /creators/laylatalks /creators/omarfahad.studio /creators/laylatalks/order "/creators/laylatalks/order?again=c-198"
  /orders /orders/new "/orders/new?type=campaign" "/orders/new?type=custom" "/orders/new?draft=r-104"
  /orders/r-101 /orders/r-102 /orders/r-150 /orders/r-201 /orders/r-250 /orders/r-252
  /jobs/c-201 /jobs/c-204 /jobs/c-205 /jobs/c-203 /jobs/c-150-3 /jobs/c-150-2 /jobs/c-302 /jobs/c-305 /jobs/c-301
  /library /products /products/new /products/p-daftar-invoices /billing
  /studio /studio/work "/studio/work?kind=campaign" /studio/jobs "/studio/jobs?tab=pitches" /studio/earnings /studio/profile
  /messages "/messages?thread=t-401" "/messages?tab=alerts" /account /settings
  /productivity "/productivity?as=creator" /services /services/ugc-ads /services/native-posts /services/hook-lab
  /services/go-to-market /for/tech-teams /jobs/c-206 /orders/r-251 /orders/r-213)
fail=0
for cookie in "" "yapp2_account=nour" "yapp2_account=layla"; do
  for r in "${routes[@]}"; do
    code=$(curl -sL -o "$BODY" -w "%{http_code}" -H "Cookie: $cookie" "$BASE$r")
    if [ "$code" != "200" ]; then echo "FAIL [$cookie] $r -> $code"; fail=1; fi
    if grep -q "Application error\|__next_error__" "$BODY"; then echo "FAIL [$cookie] $r -> error in HTML"; fail=1; fi
  done
done
code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/does-not-exist")
[ "$code" = "404" ] || { echo "FAIL /does-not-exist -> $code (expected 404)"; fail=1; }
# V1-only routes don't exist in V2.
for r in /work /explore /wallet /pitches /profile /saved; do
  code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE$r")
  [ "$code" = "404" ] || { echo "FAIL $r -> $code (expected 404: a V1 route, not in V2)"; fail=1; }
done
# Unknown ids: a server renders the in-app "not found" state (200); a static host has no page (404).
for r in /creators/nobody-here /orders/r-nope /jobs/c-nope; do
  code=$(curl -sL -o /dev/null -w "%{http_code}" "$BASE$r")
  case "$code" in 200|404) ;; *) echo "FAIL $r -> $code (expected 200 or 404)"; fail=1 ;; esac
done
[ $fail = 0 ] && echo "PASS: ${#routes[@]} routes x 3 sessions + 404"
exit $fail
