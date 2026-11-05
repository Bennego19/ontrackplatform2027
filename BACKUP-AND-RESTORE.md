# Backup and restore for the free Atlas cluster

The owner chose the free Atlas cluster with separate **daily** backups and says
their friend will arrange backups on their side once the application is live.
The destination, encryption, schedule and recovery procedure are unconfirmed.
A local folder, `T:\Programming\ontrackbackup`, was prepared earlier, but it is
not confirmed as the friend's destination. Its permissions are restricted to
the current Windows user, administrators and SYSTEM; drive encryption could not
be verified. Do not put production backups or credentials there until encryption
is verified and access is reviewed. A folder on one computer is not an off-site
backup; arrange an additional encrypted off-site copy when possible.
The current cluster shows backups inactive. MongoDB documents an optional paid
daily backup subscription for some Free clusters as a limited private preview;
availability must be checked in the actual Atlas account. The owner selected
separate backups. A successful backup and an isolated restore test must be
completed before real user data is accepted. This document does not set up a
schedule or create a production backup by itself.

Assign an operator, a time for the daily backup, retention period, additional
encrypted off-site location and recovery target. A backup that lives only on one
computer can be lost with that computer. Monitor each backup, keep copies inaccessible to
ordinary application users, and periodically restore a copy. Consider a managed
backup service if nobody can reliably operate and monitor this process.
Daily successful backups can leave up to approximately 24 hours of changes
unrecoverable; missed or failed backups increase that period.

**Security:** gzip compresses data; it does not encrypt it. The archive contains
the database and uploaded GridFS files, potentially including sensitive personal
data. The backup folder and off-site copies must use encryption at rest with
access controls. Keep recovery keys separate and test that the operator can use
them. Do not put production connection strings, passwords, configuration files
or backup archives in Git, chat, command-line arguments, or public storage.

`mongodump` with a database filter is not a point-in-time snapshot. Atlas Free
does not support `mongodump --oplog` or `mongorestore --oplogReplay`. Pause
application writes while taking the dump, including file uploads, to avoid an
inconsistent copy. Agree the maintenance window and check the database user has
the privileges needed to read the whole database. The cluster must be running
and the operator must have network access to it. Do not resume the vulnerable
2026 services to perform a backup.

## Prepare an encrypted location and a private configuration

1. Choose a destination and verify its encryption and access controls before
   using it for backup output. If using `T:\Programming\ontrackbackup`, verify
   its drive encryption and review its access first. Create a separate private folder on an
   encrypted drive for the MongoDB tools configuration and restrict it to the
   operator. The commands below use illustrative `E:\OnTrackBackups` and
   `E:\OnTrackPrivate` paths; replace them with the secured paths. Avoid commas
   in paths passed to Docker's `--mount` syntax.
2. Privately create `E:\OnTrackPrivate\atlas-backup.yaml`. Put the full Atlas
   connection string in a YAML `uri` field, for example the placeholder below.
   Substitute the actual value yourself; do not paste it into a terminal or
   chat. MongoDB's `--config` option avoids putting it in the process arguments.

   ```yaml
   uri: "mongodb+srv://USERNAME:PASSWORD@CLUSTER.mongodb.net/"
   ```

   URI credentials must be URL-encoded where required by MongoDB. Treat this
   file as a password, protect it with filesystem permissions and encryption,
   and remove it when no longer needed. Deletion alone may not securely erase
   plaintext from storage. A password manager should hold the recovery copy.
3. Start Docker Desktop. Verify the intended source is the **2027** cluster and
   database. These instructions assume the future database is `ontrack_2027`;
   do not use the old `ontrack` database by mistake.

## Create an archive

In PowerShell, with application writes paused, run the following after replacing
the two paths. The archive is written to the encrypted folder. The Docker image
contains the MongoDB Database Tools; pin and review an approved image version
for routine production use.

```powershell
$taskConfig = 'E:\OnTrackPrivate\atlas-backup.yaml'
$taskFolder = 'E:\OnTrackBackups'
$taskFile = 'ontrack_2027-' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '.archive.gz'
docker run --rm --mount "type=bind,source=$taskConfig,target=/run/atlas.yaml,readonly" --mount "type=bind,source=$taskFolder,target=/backups" mongo:7 mongodump --config=/run/atlas.yaml --db=ontrack_2027 "--archive=/backups/$taskFile" --gzip
if ($LASTEXITCODE -ne 0) { throw 'Backup failed; do not treat the archive as usable.' }
```

Check the command completed successfully, record the time and file name without
recording credentials, then copy the archive to the chosen encrypted off-site
location. Verify the copy and monitor retention. A successful command alone
does not prove the archive can be restored.

## Restore drill: disposable local MongoDB only

The following starts a new container without publishing its database port,
then restores the selected archive into a differently named local database. It
does not connect to Atlas or overwrite production. The container name must not
already exist. Replace the folder and file name with a copy of the backup to
test, and inspect the command before running it.

```powershell
$taskFolder = 'E:\OnTrackBackups'
$taskFile = 'REPLACE-WITH-THE-BACKUP-FILE.archive.gz'
docker run -d --rm --name ontrack-restore-drill mongo:7
docker run --rm --network container:ontrack-restore-drill --mount "type=bind,source=$taskFolder,target=/backups,readonly" mongo:7 mongorestore --host=127.0.0.1 --gzip "--archive=/backups/$taskFile" '--nsInclude=ontrack_2027.*' '--nsFrom=ontrack_2027.*' '--nsTo=ontrack_restore_check.*'
```

Wait for MongoDB to start before the restore; if it is still starting, retry
the restore against the same empty container. Check for failures and confirm
that a non-empty backup restored the expected collections, indexes and record
counts. Check both `uploads.files` and `uploads.chunks`, and download a known
test document through GridFS to compare its content with the original. A zero
exit code can still accompany a restore that matched no namespaces.

Record the result and recovery time, then stop the disposable container:

```powershell
docker stop ontrack-restore-drill
```

This removes the disposable container and its local restore data. Do not point
the restore command at production. A real production recovery requires a
separate, reviewed plan for the destination, downtime, credentials and data
replacement.

## Local validation performed

On 4 November 2026, the dump and namespace-renamed restore commands were tested
with disposable MongoDB 7 containers. The source contained one test student and
a GridFS document. The restored student count and the document's bytes matched.
This did not test Atlas, production credentials, encrypted storage, off-site
copies, scheduling, or recovery of a real production backup.

References: [MongoDB backup guidance](https://www.mongodb.com/docs/atlas/backup-restore-cluster/),
[Atlas Free cluster limits](https://www.mongodb.com/docs/atlas/reference/free-shared-limitations/),
[mongodump configuration](https://www.mongodb.com/docs/database-tools/mongodump/),
and [mongorestore examples](https://www.mongodb.com/docs/database-tools/mongorestore/mongorestore-examples/).
