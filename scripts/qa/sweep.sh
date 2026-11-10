#!/bin/bash
# HTTP sweep: every route must render (200) for signed-out, Nour and Layla+dark sessions.
# One account type: routes are the same for everyone; pages adapt to the viewer's side.
# (curl runs no JS, so this checks the static HTML; flows/route-smoke-*.json check runtime errors.)
# Usage: scripts/qa/sweep.sh [base_url]   (default http://localhost:3123)
BASE=${1:-http://localhost:3123}
BODY=$(mktemp)
routes=(/ /about /how-it-works /for-creators /legal /signin /signup /onboarding "/onboarding?start=make"
  /creators "/creators?format=app-demo&lang=es" /creators/laylatalks /creators/omarfahad.studio
  /creators/laylatalks/commission "/creators/laylatalks/commission?again=c-198"
  /home "/home?reel=r-150" /explore "/explore?tab=orders"
  /work "/work?tab=making" /work/c-201 /work/c-204 /work/c-205 /work/c-203 /work/c-150-3 /work/c-150-2
  /work/c-302 /work/c-305 /work/c-301
  /orders /orders/new "/orders/new?type=campaign" "/orders/new?type=custom" "/orders/new?draft=r-104"
  /orders/r-101 /orders/r-102 /orders/r-150 /orders/r-201 /orders/r-250 /orders/r-252
  /pitches /messages "/messages?thread=t-401" /profile /profile/edit /wallet /billing
  /products /products/new /products/p-daftar-invoices /saved /settings)
fail=0
for cookie in "" "yapp_account=nour" "yapp_account=layla; yapp_theme=dark"; do
  for r in "${routes[@]}"; do
    code=$(curl -sL -o "$BODY" -w "%{http_code}" -H "Cookie: $cookie" "$BASE$r")
    if [ "$code" != "200" ]; then echo "FAIL [$cookie] $r -> $code"; fail=1; fi
    if grep -q "Application error\|__next_error__" "$BODY"; then echo "FAIL [$cookie] $r -> error in HTML"; fail=1; fi
  done
done
code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/does-not-exist")
[ "$code" = "404" ] || { echo "FAIL /does-not-exist -> $code (expected 404)"; fail=1; }
# Old role routes are gone.
for r in /business /creator/opportunities; do
  code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE$r")
  [ "$code" = "404" ] || { echo "FAIL $r -> $code (expected 404: old role routes were removed)"; fail=1; }
done
# Unknown ids: a server renders the in-app "not found" state (200); a static host has no page (404).
for r in /creators/nobody-here /orders/r-nope /work/c-nope; do
  code=$(curl -sL -o /dev/null -w "%{http_code}" "$BASE$r")
  case "$code" in 200|404) ;; *) echo "FAIL $r -> $code (expected 200 or 404)"; fail=1 ;; esac
done
[ $fail = 0 ] && echo "PASS: ${#routes[@]} routes x 3 sessions + 404"
exit $fail
