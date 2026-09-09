#!/usr/bin/env bash
set -Eeuo pipefail
umask 027

# This fixed destination intentionally prevents deployment to another website.
base=/home/u257359746/domains/cabanasplayaterco.com/api-app
sha=${1:?Pass the full Git commit SHA}
[[ "$sha" =~ ^[0-9a-f]{40}$ ]] || { echo 'Invalid commit SHA' >&2; exit 1; }
archive="$base/incoming/$sha.tar.gz"
release="$base/releases/$sha-$(date -u +%Y%m%d%H%M%S)"
php=/opt/alt/php82/usr/bin/php

mkdir -p "$base/releases" "$base/backups"
exec 9>"$base/deploy.lock"
flock -w 300 9
test -s "$base/shared/.env"
test -s "$archive"
mkdir "$release"
tar -xzf "$archive" -C "$release"
test -f "$release/artisan"
test -f "$release/vendor/autoload.php"
ln -s "$base/shared/.env" "$release/.env"
rm -rf -- "$release/storage"
ln -s "$base/shared/storage" "$release/storage"
mkdir -p "$base/shared/storage/"{app/public,app/private,framework/cache/data,framework/sessions,framework/views,logs}
chmod -R u+rwX,g+rwX "$base/shared/storage" "$release/bootstrap/cache"
cd "$release"

previous=$(readlink -f "$base/current" || true)
maintenance=false
switched=false
recover() {
    status=$?
    if [ "$status" -ne 0 ]; then
        if $switched && [ -n "$previous" ]; then
            ln -s "$previous" "$base/current.rollback"
            mv -Tf "$base/current.rollback" "$base/current"
        fi
        if $maintenance && [ -n "$previous" ]; then
            "$php" "$previous/artisan" up || true
        fi
        echo 'Deployment failed; database backups and the previous release were retained.' >&2
    fi
    exit "$status"
}
trap recover EXIT

if [ -n "$previous" ] && [ -f "$previous/artisan" ]; then
    "$php" "$previous/artisan" down --retry=30
    maintenance=true
    "$php" "$release/deploy/backup-database.php" "$base/backups/$(date -u +%Y%m%d%H%M%S)-$sha.sql.gz"
fi

"$php" artisan migrate --force --no-interaction
"$php" artisan storage:link --force
"$php" artisan config:cache
"$php" artisan route:cache
"$php" artisan view:cache
printf '%s\n' "$sha" > REVISION
ln -s "$release" "$base/current.next"
mv -Tf "$base/current.next" "$base/current"
switched=true
"$php" artisan up
maintenance=false

# A database-backed request also verifies that the new release can use MySQL.
curl --fail --silent --show-error --retry 5 --retry-delay 3 --retry-all-errors \
    https://api-v1.cabanasplayaterco.com/api/v1/lodging-tariffs >/dev/null
echo "Deployed $sha"
# Keep releases and backups for explicit rollback; never roll back schema automatically.
