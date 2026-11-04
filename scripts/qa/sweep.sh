#!/bin/bash
# HTTP sweep: every route must render (200) for signed-out, business and creator+dark sessions.
# Usage: scripts/qa/sweep.sh [base_url]   (default http://localhost:3123)
BASE=${1:-http://localhost:3123}
BODY=$(mktemp)
routes=(/ /how-it-works /for-creators /signin /signup "/signup?role=creator" /onboarding/business /onboarding/creator
  /creators "/creators?format=selfie-demo&lang=ar-saudi" /creators/laylatalks /creators/omarfahad.studio /creators/nobody-here
  /creators/laylatalks/commission "/creators/laylatalks/commission?repeat=c-198"
  /business /business/requests /business/requests/new "/business/requests/new?draft=r-104" /business/requests/r-101
  /business/requests/r-102 /business/requests/r-nope /business/commissions /business/commissions/c-201
  /business/commissions/c-204 /business/commissions/c-205 /business/commissions/c-203 /business/messages
  "/business/messages?thread=t-401" /business/products /business/products/new /business/products/p-daftar-invoices
  /business/creators /business/billing /business/settings
  /creator /creator/opportunities /creator/opportunities/r-101 /creator/opportunities/r-201 /creator/pitches
  /creator/commissions /creator/commissions/c-302 /creator/commissions/c-305 /creator/commissions/c-301
  /creator/messages /creator/profile /creator/earnings /creator/settings)
fail=0
for cookie in "" "yapp_role=business" "yapp_role=creator; yapp_theme=dark"; do
  for r in "${routes[@]}"; do
    code=$(curl -s -o "$BODY" -w "%{http_code}" -H "Cookie: $cookie" "$BASE$r")
    if [ "$code" != "200" ]; then echo "FAIL [$cookie] $r -> $code"; fail=1; fi
    if grep -q "Application error\|__next_error__" "$BODY"; then echo "FAIL [$cookie] $r -> error in HTML"; fail=1; fi
  done
done
code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/does-not-exist")
[ "$code" = "404" ] || { echo "FAIL /does-not-exist -> $code (expected 404)"; fail=1; }
[ $fail = 0 ] && echo "PASS: ${#routes[@]} routes x 3 sessions + 404"
exit $fail
