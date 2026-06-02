# Publish With GitHub Pages

This repo includes a GitHub Actions workflow that publishes only the
`vpn-portal/` folder.

## One-Time GitHub Setting

1. Open the GitHub repo.
2. Go to `Settings`.
3. Open `Pages`.
4. Under `Build and deployment`, set `Source` to `GitHub Actions`.
5. Save if GitHub shows a save button.

After that, pushes to `main` that change `vpn-portal/` will deploy the portal.

If the workflow fails at `Configure Pages` with `Get Pages site failed`, confirm
that the repository Pages source is set to `GitHub Actions`. The workflow also
sets `enablement: true` so GitHub can create the Pages site when permissions
allow it.

## Expected URL

The default Pages URL should be similar to:

```text
https://gisillioppo-glitch.github.io/VPN/
```

GitHub can take a few minutes to publish the first deployment.

## Local Preview

Open this file on Windows:

```text
vpn-portal/index.html
```

No local server is required for the current static MVP.
