# Scan2Text v1.1 — CEO Release Checklist

Manual steps for the CEO to publish the v1.1 GitHub Release. Do not automate; these require human judgment.

## Pre-flight

- [ ] 1. Verify `Scan2Text-v1.1-Portable-Full.zip` exists locally and is the correct artifact (Full ZIP, not Thin ZIP).
- [ ] 2. Do NOT commit the Full ZIP to git — it belongs on GitHub Releases only.
- [ ] 3. Do NOT upload the Thin ZIP publicly; it is internal-only.

## Create the Release

- [ ] 4. On GitHub, create tag `v1.1` against commit `5ec43f2`.
- [ ] 5. Create a new GitHub Release titled **Scan2Text v1.1**.
- [ ] 6. Upload ONLY `Scan2Text-v1.1-Portable-Full.zip` as the release asset.
- [ ] 7. Paste the release notes from `docs/release-notes/v1.1.md` into the release description.

## Public launch (if intended)

- [ ] 8. If this is a public launch, flip repository visibility to **public**.
- [ ] 9. Verify the public download link resolves and the file size matches expectations (~1000 MB).
